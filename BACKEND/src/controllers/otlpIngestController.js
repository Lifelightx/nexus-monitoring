const Trace = require('../models/Trace');
const Span = require('../models/Span');
const Service = require('../models/Service');
const logger = require('../utils/logger');
const { getClickHouseClient } = require('../services/clickhouseClient');

/**
 * OTLP Ingest Controller
 * Receives OpenTelemetry Protocol (OTLP) data and stores in MongoDB
 */

/**
 * Convert OTLP nanoseconds to JavaScript Date
 */
function nanosToDate(nanos) {
    if (!nanos) return new Date();
    const millis = Number(BigInt(nanos) / BigInt(1000000));
    return new Date(millis);
}

/**
 * Extract attribute value from OTLP attribute
 */
function getAttributeValue(attribute) {
    const value = attribute.value;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.intValue !== undefined) return parseInt(value.intValue);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.boolValue !== undefined) return value.boolValue;
    return null;
}

/**
 * Convert OTLP attributes array to object
 */
function attributesToObject(attributes) {
    if (!attributes) return {};
    const obj = {};
    attributes.forEach(attr => {
        obj[attr.key] = getAttributeValue(attr);
    });
    return obj;
}

/**
 * Convert OTLP span to MongoDB Span schema
 */
function otlpSpanToMongoSpan(otlpSpan) {
    const attributes = attributesToObject(otlpSpan.attributes);

    // Determine span type
    let type = 'internal';
    let metadata = {};

    if (otlpSpan.kind === 2) { // SPAN_KIND_SERVER
        type = 'http';
        metadata = {
            http_method: attributes['http.method'],
            http_url: attributes['http.url'] || attributes['http.target'],
            http_status_code: attributes['http.status_code'],
            error: attributes['error'] || (otlpSpan.status?.code === 2)
        };
    } else if (otlpSpan.kind === 3) { // SPAN_KIND_CLIENT
        if (attributes['db.system']) {
            type = 'db';
            metadata = {
                db_type: attributes['db.system'],
                db_operation: attributes['db.operation'],
                db_collection: attributes['db.mongodb.collection'],
                db_table: attributes['db.sql.table'],
                db_query: attributes['db.statement'],
                error: attributes['error'] || (otlpSpan.status?.code === 2)
            };
        } else if (attributes['http.method']) {
            type = 'external';
            metadata = {
                external_host: attributes['net.peer.name'],
                external_method: attributes['http.method'],
                external_url: attributes['http.url'],
                external_status_code: attributes['http.status_code'],
                error: attributes['error'] || (otlpSpan.status?.code === 2)
            };
        }
    }

    // Add error information if present
    if (otlpSpan.status?.code === 2) {
        metadata.error = true;
        metadata.error_message = otlpSpan.status.message || attributes['error.message'];
    }

    const startTime = nanosToDate(otlpSpan.startTimeUnixNano);
    const endTime = nanosToDate(otlpSpan.endTimeUnixNano);
    const durationMs = endTime - startTime;

    return {
        span_id: otlpSpan.spanId,
        trace_id: otlpSpan.traceId,
        parent_span_id: otlpSpan.parentSpanId || null,
        type: type,
        name: otlpSpan.name,
        duration_ms: durationMs,
        start_time: startTime,
        end_time: endTime,
        metadata: metadata
    };
}

/**
 * Ingest OTLP Traces
 * POST /api/otlp/v1/traces
 */
async function ingestTraces(req, res) {
    try {
        const tracesPayload = req.body;

        // Validate payload
        if (!tracesPayload || !tracesPayload.resourceSpans) {
            return res.status(400).json({
                error: 'Invalid OTLP traces payload',
                message: 'Expected resourceSpans field'
            });
        }

        logger.info(`[OTLP Ingest] Received OTLP payload with ${tracesPayload.resourceSpans?.length || 0} resourceSpans`);

        let totalSpans = 0;
        const traces = [];
        const spans = [];

        // Process each resourceSpan
        for (const resourceSpan of tracesPayload.resourceSpans) {
            // Extract service information from resource attributes
            const resourceAttrs = attributesToObject(resourceSpan.resource?.attributes);
            const serviceName = resourceAttrs['service.name'] || 'unknown';
            const serviceInstanceId = resourceAttrs['service.instance.id'];
            const agentId = resourceAttrs['agent.id'];

            // Find or create service
            let service = await Service.findOne({ name: serviceName }).sort({ lastSeen: -1 });

            // Process each scopeSpan
            for (const scopeSpan of resourceSpan.scopeSpans || []) {
                for (const otlpSpan of scopeSpan.spans || []) {
                    totalSpans++;

                    // Convert OTLP span to MongoDB format
                    const mongoSpan = otlpSpanToMongoSpan(otlpSpan);
                    spans.push(mongoSpan);

                    // If this is a root span (no parent), create a trace
                    if (!otlpSpan.parentSpanId) {
                        const attributes = attributesToObject(otlpSpan.attributes);
                        const endpoint = `${attributes['http.method'] || 'UNKNOWN'} ${attributes['http.target'] || attributes['http.url'] || '/'}`;
                        const statusCode = attributes['http.status_code'] || 200;
                        const error = otlpSpan.status?.code === 2;

                        traces.push({
                            trace_id: otlpSpan.traceId,
                            service_name: serviceName,
                            service_id: service?._id,
                            endpoint: endpoint,
                            duration_ms: mongoSpan.duration_ms,
                            status_code: statusCode,
                            error: error,
                            timestamp: mongoSpan.start_time,
                            spans: [mongoSpan.span_id], // Will be updated with ObjectIds later
                            metadata: {
                                agent_id: agentId,
                                service_instance_id: serviceInstanceId
                            }
                        });
                    }
                }
            }
        }

        console.log(`[OTLP] Converted ${totalSpans} OTLP spans to MongoDB format`);
        console.log(`[OTLP] Found ${traces.length} root traces`);

        // Store spans first
        if (spans.length > 0) {
            try {
                const result = await Span.insertMany(spans, { ordered: false });
                console.log(`[OTLP] ✅ Stored ${result.length} spans`);
            } catch (err) {
                console.error(`[OTLP] ❌ Error storing spans:`, err.message);
            }
        }

        // Update trace span references with ObjectIds
        for (const trace of traces) {
            // Find all spans for this trace
            const traceSpans = await Span.find({
                trace_id: trace.trace_id
            }).select('_id');

            trace.spans = traceSpans.map(s => s._id);
        }

        // Store traces
        let savedTraces = [];
        if (traces.length > 0) {
            try {
                savedTraces = await Trace.insertMany(traces, { ordered: false });
                console.log(`[OTLP] ✅ Stored ${savedTraces.length} traces in MongoDB`);
            } catch (err) {
                console.error(`[OTLP] ❌ Error storing traces:`, err.message);
            }
        }

        // Dual-write to ClickHouse (non-blocking)
        try {
            const clickhouse = getClickHouseClient();

            // Prepare traces for ClickHouse
            const chTraces = traces.map(t => ({
                ...t,
                service_name: t.service_name || 'unknown'
            }));

            // Prepare spans for ClickHouse with service_name and proper fields
            const chSpans = spans.map(s => {
                // Find matching trace to get service name
                const matchingTrace = traces.find(t => t.trace_id === s.trace_id);
                return {
                    ...s,
                    service_name: matchingTrace?.service_name || 'unknown',
                    // Map OTLP span kind if present in metadata
                    span_kind: s.kind || 0,
                    status_code: s.status?.code || 0,
                    status_message: s.status?.message || ''
                };
            });

            // Insert to ClickHouse (async, don't wait)
            if (chTraces.length > 0) {
                clickhouse.insertTraces(chTraces).catch(err => {
                    console.error('[ClickHouse] Failed to insert traces:', err.message);
                });
            }
            if (chSpans.length > 0) {
                clickhouse.insertSpans(chSpans).catch(err => {
                    console.error('[ClickHouse] Failed to insert spans:', err.message);
                });
            }
        } catch (err) {
            console.error('[ClickHouse] Error in dual-write:', err.message);
            // Continue - don't fail the request if ClickHouse is down
        }

        // Update service instrumentation status
        for (const trace of traces) {
            if (trace.service_id) {
                await Service.findByIdAndUpdate(trace.service_id, {
                    'instrumentation.enabled': true,
                    'instrumentation.last_trace_id': trace.trace_id,
                    lastSeen: new Date()
                });
            }
        }

        // Broadcast new traces via WebSocket
        if (savedTraces.length > 0) {
            const io = req.app.get('io');
            if (io) {
                io.to('dashboards').emit('trace:new', {
                    count: savedTraces.length,
                    traces: savedTraces.map(t => ({
                        trace_id: t.trace_id,
                        service_name: t.service_name,
                        service_id: t.service_id,
                        endpoint: t.endpoint,
                        duration_ms: t.duration_ms,
                        status_code: t.status_code,
                        error: t.error,
                        timestamp: t.timestamp
                    }))
                });
                console.log(`[OTLP] 📡 Broadcasted ${savedTraces.length} new traces to dashboards`);
            }
        }

        res.status(200).json({
            success: true,
            message: `Ingested ${totalSpans} spans and ${savedTraces.length} traces`,
            partialSuccesses: {
                spans: spans.length,
                traces: savedTraces.length
            }
        });
    } catch (error) {
        console.error('[OTLP Ingest] Error ingesting traces:', error);
        res.status(500).json({
            error: 'Failed to ingest traces',
            message: error.message
        });
    }
}

/**
 * Ingest OTLP Metrics (placeholder for future implementation)
 * POST /api/otlp/v1/metrics
 */
async function ingestMetrics(req, res) {
    try {
        const metricsPayload = req.body;
        const axios = require('axios');

        // Forward to OpenTelemetry Collector's HTTP receiver
        // The collector is configured to export to VictoriaMetrics
        try {
            await axios.post('http://localhost:30318/v1/metrics', metricsPayload, {
                headers: { 'Content-Type': 'application/json' }
            });
            // logger.info(`[OTLP Ingest] Successfully forwarded metrics to Collector`);
            res.status(200).json({ success: true });
        } catch (collectorError) {
            console.warn('[OTLP Ingest] Failed to forward to collector:', collectorError.message);
            // Don't fail the request completely if collector is down, but log it
            res.status(503).json({
                success: false,
                error: 'Collector unavailable',
                details: collectorError.message
            });
        }
    } catch (error) {
        console.error('[OTLP Ingest] Error ingesting metrics:', error);
        res.status(500).json({
            error: 'Failed to ingest metrics',
            message: error.message
        });
    }
}

/**
 * Ingest OTLP Logs (placeholder for future implementation)
 * POST /api/otlp/v1/logs
 */
async function ingestLogs(req, res) {
    try {
        const logsPayload = req.body;

        logger.info(`[OTLP Ingest] Received logs (not yet implemented)`);

        res.status(501).json({
            success: false,
            message: 'Logs ingestion not yet implemented'
        });
    } catch (error) {
        console.error('[OTLP Ingest] Error ingesting logs:', error);
        res.status(500).json({
            error: 'Failed to ingest logs',
            message: error.message
        });
    }
}

module.exports = {
    ingestTraces,
    ingestMetrics,
    ingestLogs
};

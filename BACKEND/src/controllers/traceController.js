const Trace = require('../models/Trace');
const Span = require('../models/Span');
const Service = require('../models/Service');

/**
 * Ingest trace batch from agent
 * POST /api/traces
 */
async function ingestTraces(req, res) {
    try {
        const { traces, spans } = req.body;

        console.log(`[Trace Ingestion] Received ${traces?.length || 0} traces and ${spans?.length || 0} spans`);

        if (!traces || !Array.isArray(traces)) {
            return res.status(400).json({ error: 'Invalid traces data' });
        }

        // Look up service IDs by service name and populate traces
        for (const trace of traces) {
            if (trace.service_name && !trace.service_id) {
                // Find service by name (most recently seen)
                // Don't filter by status to handle stale service data
                const service = await Service.findOne({
                    name: trace.service_name
                }).sort({ lastSeen: -1 }); // Get most recently seen service

                if (service) {
                    trace.service_id = service._id;
                    console.log(`[Trace] Linked trace ${trace.trace_id} to service ${service.name} (${service._id})`);
                } else {
                    console.warn(`[Trace] No service found for name: ${trace.service_name}`);
                }
            }
        }

        // Store spans first
        if (spans && Array.isArray(spans) && spans.length > 0) {
            console.log(`[Trace] Storing ${spans.length} spans`);
            try {
                const result = await Span.insertMany(spans, { ordered: false });
                console.log(`[Trace] ✅ Stored ${result.length} spans successfully`);
            } catch (err) {
                console.error(`[Trace] ❌ Error storing spans:`, err.message);
                console.error(`[Trace] Span data:`, JSON.stringify(spans, null, 2));
            }
        }

        // Look up Span ObjectIds for each trace
        for (const trace of traces) {
            if (trace.spans && Array.isArray(trace.spans) && trace.spans.length > 0) {
                // trace.spans contains span_id strings, we need to look up the ObjectIds
                const spanDocs = await Span.find({
                    span_id: { $in: trace.spans }
                }).select('_id');

                // Replace span_id strings with ObjectIds
                trace.spans = spanDocs.map(s => s._id);
            }
        }

        // Store traces
        console.log(`[Trace] Storing ${traces.length} traces`);
        let savedTraces = [];
        try {
            savedTraces = await Trace.insertMany(traces, { ordered: false });
            console.log(`[Trace] ✅ Stored ${savedTraces.length} traces successfully`);
        } catch (err) {
            console.error(`[Trace] ❌ Error storing traces:`, err.message);
            console.error(`[Trace] Full error:`, err);
        }

        // Update service last_trace_time and instrumentation status
        for (const trace of traces) {
            if (trace.service_id) {
                await Service.findByIdAndUpdate(trace.service_id, {
                    'instrumentation.enabled': true,
                    'instrumentation.last_trace_id': trace.trace_id,
                    lastSeen: new Date()
                });

                // Update endpoint traced status
                await Service.findOneAndUpdate(
                    {
                        _id: trace.service_id,
                        'endpoints.path': trace.endpoint
                    },
                    {
                        $set: {
                            'endpoints.$.traced': true,
                            'endpoints.$.last_trace_time': trace.timestamp
                        }
                    }
                );
            }
        }

        // Broadcast new traces to connected dashboards via WebSocket
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
                console.log(`[Trace] 📡 Broadcasted ${savedTraces.length} new traces to dashboards`);
            }
        }

        res.status(201).json({
            success: true,
            message: `Ingested ${savedTraces.length} traces and ${spans?.length || 0} spans`
        });
    } catch (error) {
        console.error('Error ingesting traces:', error);
        res.status(500).json({ error: 'Failed to ingest traces', details: error.message });
    }
}

/**
 * Get trace by ID
 * GET /api/traces/:traceId
 */
async function getTrace(req, res) {
    try {
        const { traceId } = req.params;

        const trace = await Trace.findOne({ trace_id: traceId });
        if (!trace) {
            return res.status(404).json({ error: 'Trace not found' });
        }

        // Get all spans for this trace
        const spans = await Span.find({ trace_id: traceId }).sort({ start_time: 1 });

        res.json({
            trace,
            spans
        });
    } catch (error) {
        console.error('Error fetching trace:', error);
        res.status(500).json({ error: 'Failed to fetch trace' });
    }
}

/**
 * Get traces for a service
 * GET /api/services/:serviceId/traces
 */
async function getServiceTraces(req, res) {
    try {
        const { serviceId } = req.params;
        const {
            endpoint,
            status,
            error,
            startTime,
            endTime,
            limit = 100,
            offset = 0
        } = req.query;

        const query = { service_id: serviceId };

        if (endpoint) query.endpoint = endpoint;
        if (status) query.status_code = parseInt(status);
        if (error !== undefined) query.error = error === 'true';

        if (startTime || endTime) {
            query.timestamp = {};
            if (startTime) query.timestamp.$gte = new Date(startTime);
            if (endTime) query.timestamp.$lte = new Date(endTime);
        }

        const traces = await Trace.find(query)
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .sort({ timestamp: -1 });

        const total = await Trace.countDocuments(query);

        res.json({
            traces,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching service traces:', error);
        res.status(500).json({ error: 'Failed to fetch traces' });
    }
}

/**
 * Analyze trace performance breakdown
 * GET /api/traces/:traceId/analysis
 */
async function analyzeTrace(req, res) {
    try {
        const { traceId } = req.params;

        const trace = await Trace.findOne({ trace_id: traceId });
        if (!trace) {
            return res.status(404).json({ error: 'Trace not found' });
        }

        const spans = await Span.find({ trace_id: traceId });

        // Calculate time breakdown
        const dbTime = spans
            .filter(s => s.type === 'db')
            .reduce((sum, s) => sum + s.duration_ms, 0);

        const downstreamTime = spans
            .filter(s => s.type === 'external')
            .reduce((sum, s) => sum + s.duration_ms, 0);

        const codeTime = Math.max(0, trace.duration_ms - dbTime - downstreamTime);

        // Find slowest spans
        const slowestSpans = spans
            .sort((a, b) => b.duration_ms - a.duration_ms)
            .slice(0, 10)
            .map(s => ({
                type: s.type,
                name: s.name,
                duration_ms: s.duration_ms,
                percentage: ((s.duration_ms / trace.duration_ms) * 100).toFixed(2)
            }));

        // Generate recommendations
        const recommendations = [];
        const dbPercentage = (dbTime / trace.duration_ms) * 100;
        const downstreamPercentage = (downstreamTime / trace.duration_ms) * 100;

        if (dbPercentage > 50) {
            recommendations.push({
                type: 'database',
                message: `${dbPercentage.toFixed(1)}% of time spent in database queries. Consider optimizing queries or adding indexes.`
            });
        }

        if (downstreamPercentage > 50) {
            recommendations.push({
                type: 'downstream',
                message: `${downstreamPercentage.toFixed(1)}% of time spent in downstream services. Consider caching or parallel requests.`
            });
        }

        if (codeTime > trace.duration_ms * 0.5) {
            recommendations.push({
                type: 'code',
                message: `${((codeTime / trace.duration_ms) * 100).toFixed(1)}% of time spent in application code. Consider profiling for bottlenecks.`
            });
        }

        res.json({
            trace_id: trace.trace_id,
            total_time: trace.duration_ms,
            breakdown: {
                db_time: dbTime,
                db_percentage: dbPercentage.toFixed(2),
                downstream_time: downstreamTime,
                downstream_percentage: downstreamPercentage.toFixed(2),
                code_time: codeTime,
                code_percentage: ((codeTime / trace.duration_ms) * 100).toFixed(2)
            },
            slowest_spans: slowestSpans,
            recommendations
        });
    } catch (error) {
        console.error('Error analyzing trace:', error);
        res.status(500).json({ error: 'Failed to analyze trace' });
    }
}

/**
 * Get trace statistics for a service
 * GET /api/services/:serviceId/trace-stats
 */
async function getServiceTraceStats(req, res) {
    try {
        const { serviceId } = req.params;
        const { hours = 24 } = req.query;

        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Get trace statistics
        const stats = await Trace.aggregate([
            {
                $match: {
                    service_id: serviceId,
                    timestamp: { $gte: startTime }
                }
            },
            {
                $group: {
                    _id: '$endpoint',
                    count: { $sum: 1 },
                    avg_duration: { $avg: '$duration_ms' },
                    min_duration: { $min: '$duration_ms' },
                    max_duration: { $max: '$duration_ms' },
                    error_count: {
                        $sum: { $cond: ['$error', 1, 0] }
                    }
                }
            },
            {
                $project: {
                    endpoint: '$_id',
                    count: 1,
                    avg_duration: { $round: ['$avg_duration', 2] },
                    min_duration: { $round: ['$min_duration', 2] },
                    max_duration: { $round: ['$max_duration', 2] },
                    error_rate: {
                        $round: [
                            { $multiply: [{ $divide: ['$error_count', '$count'] }, 100] },
                            2
                        ]
                    }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching trace stats:', error);
        res.status(500).json({ error: 'Failed to fetch trace statistics' });
    }
}

module.exports = {
    ingestTraces,
    getTrace,
    getServiceTraces,
    analyzeTrace,
    getServiceTraceStats
};

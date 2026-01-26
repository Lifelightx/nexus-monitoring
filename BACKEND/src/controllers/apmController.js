const { getClickHouseClient } = require('../services/clickhouseClient');

const clickhouse = getClickHouseClient();

/**
 * Get APM Service List with Golden Signals
 * @route GET /api/apm/services
 */
exports.getServices = async (req, res) => {
    try {
        const { startTime, endTime, agentId } = req.query;

        // Calculate dynamic time range if not provided
        // Default to last 6 hours to ensure recent demo data is visible
        let start = startTime;
        if (!start) {
            const date = new Date(Date.now() - 21600000); // 6 hours
            start = date.toISOString().slice(0, 19).replace('T', ' ');
        }

        const stats = await clickhouse.getServiceStats({ startTime: start, endTime, agentId });

        // Format for UI
        const serviceList = (stats || []).map(s => ({
            name: s.service_name,
            rps: parseFloat(s.rps || 0).toFixed(2),
            errorRate: s.request_count > 0 ? ((s.error_count / s.request_count) * 100).toFixed(2) : '0.00',
            p95Latency: Math.round(s.p95 || 0),
            throughput: parseFloat(s.rps || 0).toFixed(2), // Same as RPS usually for HTTP
            requestCount: s.request_count
        }));
        res.json(serviceList);
    } catch (error) {
        console.error('Error fetching APM services:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
};

/**
 * Get Traces List
 * @route GET /api/apm/traces
 */
exports.getTraces = async (req, res) => {
    try {
        const { serviceName, limit } = req.query;
        // Defaults
        const l = limit || 50;

        const traces = await clickhouse.getTraces({
            serviceName,
            limit: l
        });

        res.json({
            success: true,
            data: traces
        });
    } catch (error) {
        console.error('Error fetching traces:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch traces' });
    }
};

/**
 * Get Trace Details (Waterfall)
 * @route GET /api/apm/traces/:traceId
 */
exports.getTraceDetails = async (req, res) => {
    try {
        const { traceId } = req.params;

        const spans = await clickhouse.getTraceDetails(traceId);

        if (!spans || spans.length === 0) {
            return res.status(404).json({ success: false, message: 'Trace not found' });
        }

        // Return standardized format matching frontend expectation
        res.json({
            success: true,
            data: {
                traceId,
                spans: spans.map(s => ({
                    TraceId: s.trace_id,
                    SpanId: s.span_id,
                    ParentSpanId: s.parent_span_id,
                    ServiceName: s.service_name,
                    SpanName: s.span_name,
                    SpanKind: s.span_kind,
                    Timestamp: s.start_time, // ISO String or MS
                    Duration: s.duration_ms * 1000000, // Frontend expects ns? traceWaterfall divides by 1e6
                    StatusCode: s.status_code === 2 ? 'Error' : 'Ok', // OTel convention: 2=Error
                    StatusMessage: s.status_message,
                    Attributes: { // Map flat attributes if needed
                        'http.method': s.http_method,
                        'http.url': s.http_url,
                        'db.statement': s.db_statement
                    }
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching trace details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trace details' });
    }
};

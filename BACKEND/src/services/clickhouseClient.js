const { ClickHouse } = require('clickhouse');

/**
 * ClickHouse Client for querying and storing OpenTelemetry data
 */
class ClickHouseClient {
    constructor() {
        this.client = new ClickHouse({
            url: process.env.CLICKHOUSE_URL || 'http://localhost',
            port: process.env.CLICKHOUSE_PORT || 30123,
            debug: false,
            basicAuth: null,
            isUseGzip: false,
            format: 'json',
            config: {
                session_timeout: 60,
                output_format_json_quote_64bit_integers: 0,
                enable_http_compression: 0
            }
        });
    }

    /**
     * Execute a query
     */
    async query(sql) {
        try {
            const result = await this.client.query(sql).toPromise();
            return result;
        } catch (error) {
            console.error('[ClickHouse] Query error:', error.message);
            throw error;
        }
    }

    /**
     * Insert traces
     */
    async insertTraces(traces) {
        if (!traces || traces.length === 0) return;

        try {
            const rows = traces.map(trace => ({
                trace_id: trace.trace_id,
                service_name: trace.service_name,
                service_instance_id: trace.metadata?.service_instance_id || '',
                endpoint: trace.endpoint,
                duration_ms: trace.duration_ms,
                status_code: trace.status_code,
                error: trace.error ? 1 : 0,
                // DateTime64(3) expects milliseconds or string. Sending number = ticks (ms)
                timestamp: new Date(trace.timestamp).getTime(),
                agent_id: trace.metadata?.agent_id || '',
                span_count: trace.spans?.length || 0
            }));

            await this.client.insert(
                `INSERT INTO otel.traces`,
                rows,
                { format: 'JSONEachRow' }
            );

            console.log(`[ClickHouse] ✅ Inserted ${rows.length} traces`);
        } catch (error) {
            console.error('[ClickHouse] ❌ Error inserting traces:', error.message);
            // Don't throw - allow MongoDB fallback
        }
    }

    /**
     * Insert spans
     */
    async insertSpans(spans) {
        if (!spans || spans.length === 0) return;

        try {
            const rows = spans.map(span => {
                const m = span.metadata || {};
                return {
                    span_id: span.span_id,
                    trace_id: span.trace_id,
                    parent_span_id: span.parent_span_id || '',
                    service_name: span.service_name || '',
                    span_name: span.name,
                    span_kind: span.span_kind || 0,
                    // DateTime64(9) - sending milliseconds * 1,000,000 to get nanoseconds ticks
                    // BUT JS Max Safe Integer is 2^53. 
                    // Current epoch ms ~ 1.7e12. * 1e6 = 1.7e18. Max Safe is 9e15. 
                    // So we cannot pass nanosecond ticks as JS number. 
                    // We must pass as String 'YYYY-MM-DD HH:mm:ss.SSSSSSSSS' or standard ISO.
                    // ClickHouse parses ISO string well.
                    start_time: new Date(span.start_time).toISOString(),
                    end_time: new Date(span.end_time).toISOString(),
                    duration_ms: span.duration_ms,
                    status_code: span.status_code || 0,
                    status_message: span.status_message || '',

                    http_method: m.http_method || '',
                    http_url: m.http_url || '',
                    http_status_code: m.http_status_code || 0,

                    db_system: m.db_type || '',
                    db_operation: m.db_operation || '',
                    db_statement: m.db_query || '',
                    db_collection: m.db_collection || '',
                    db_table: m.db_table || '',

                    net_peer_name: m.external_host || '',
                    external_url: m.external_url || '',
                    external_method: m.external_method || '',
                    external_status_code: m.external_status_code || 0,

                    error: m.error ? 1 : 0,
                    error_message: m.error_message || ''
                };
            });

            await this.client.insert(
                `INSERT INTO otel.spans`,
                rows,
                { format: 'JSONEachRow' }
            );

            console.log(`[ClickHouse] ✅ Inserted ${rows.length} spans`);
        } catch (error) {
            console.error('[ClickHouse] ❌ Error inserting spans:', error.message);
            // Don't throw - allow MongoDB fallback
        }
    }

    /**
     * Convert Date to nanoseconds
     */
    toNanoseconds(date) {
        return Math.floor(new Date(date).getTime() * 1000000);
    }

    /**
     * Get latest metrics
     */
    async getLatestMetrics({ serviceName, limit = 100 }) {
        let query = `
            SELECT 
                Timestamp,
                MetricName,
                Value,
                Attributes,
                ResourceAttributes
            FROM otel.otel_metrics
            WHERE 1=1
        `;

        if (serviceName) {
            query += ` AND ResourceAttributes['service.name'] = '${serviceName}'`;
        }

        query += ` ORDER BY Timestamp DESC LIMIT ${limit}`;

        return await this.query(query);
    }

    /**
     * Get metric time series
     */
    async getMetricTimeSeries({ metricName, serviceName, startTime, endTime, interval = '1m' }) {
        const query = `
            SELECT 
                toStartOfInterval(Timestamp, INTERVAL ${interval}) as time,
                avg(Value) as value,
                ResourceAttributes['service.name'] as service
            FROM otel.otel_metrics
            WHERE MetricName = '${metricName}'
            ${serviceName ? `AND ResourceAttributes['service.name'] = '${serviceName}'` : ''}
            ${startTime ? `AND Timestamp >= '${startTime}'` : ''}
            ${endTime ? `AND Timestamp <= '${endTime}'` : ''}
            GROUP BY time, service
            ORDER BY time
        `;

        return await this.query(query);
    }

    /**
     * Get list of services
     */
    /**
     * Get list of services
     */
    async getServices() {
        // Query Standard OTel Table
        const query = `
            SELECT DISTINCT ServiceName as service_name
            FROM otel.otel_traces
            WHERE ServiceName != ''
            ORDER BY ServiceName
        `;

        return await this.query(query);
    }

    /**
     * Get traces
     */
    async getTraces({ serviceName, startTime, endTime, limit = 50, minDuration, maxDuration }) {
        // Standard OTel: Query otel.otel_traces
        // Select spans that are likely roots (server kind or no parent)
        // Note: Timestamp is DateTime64(9), Duration is Int64 (nanoseconds)
        let query = `
            SELECT 
                TraceId as trace_id,
                ServiceName as service_name,
                SpanName as endpoint,
                Timestamp as start_time,
                CAST(Duration / 1000000 AS Float64) as duration_ms,
                StatusMessage as status_message,
                StatusCode as status_code,
                count() OVER (PARTITION BY TraceId) as span_count
            FROM otel.otel_traces
            WHERE 1=1
            AND (ParentSpanId = '' OR SpanKind = 'SPAN_KIND_SERVER')
        `;

        if (serviceName) {
            query += ` AND ServiceName = '${serviceName}'`;
        }
        if (startTime) {
            query += ` AND Timestamp >= '${startTime}'`;
        }
        if (endTime) {
            query += ` AND Timestamp <= '${endTime}'`;
        }
        if (minDuration) {
            query += ` AND Duration >= ${minDuration * 1000000}`; // ms to ns
        }
        if (maxDuration) {
            query += ` AND Duration <= ${maxDuration * 1000000}`;
        }

        query += ` ORDER BY Timestamp DESC LIMIT ${limit}`;

        return await this.query(query);
    }

    /**
     * Get trace details (all spans for a trace)
     */
    async getTraceDetails(traceId) {
        // Standard OTel: Query otel.otel_traces
        const query = `
            SELECT 
                TraceId as trace_id,
                SpanId as span_id,
                ParentSpanId as parent_span_id,
                ServiceName as service_name,
                SpanName as span_name,
                SpanKind as span_kind,
                Timestamp as start_time,
                Timestamp as end_time, -- Approximated if not available, usually calc start+duration
                CAST(Duration / 1000000 AS Float64) as duration_ms,
                StatusCode as status_code,
                StatusMessage as status_message,
                SpanAttributes as attributes
            FROM otel.otel_traces
            WHERE TraceId = '${traceId}'
            ORDER BY Timestamp
        `;

        return await this.query(query);
    }

    /**
     * Get service topology
     * (Placeholder - requires complex join or materialized view support on otel table)
     */
    async getServiceTopology({ startTime, endTime }) {
        return [];
    }

    /**
     * Get service stats
     */
    async getServiceStats({ serviceName, startTime, endTime, agentId }) {
        // Standard OTel: Aggregation on otel.otel_traces
        // Focusing on Server Kind spans
        let query = `
            SELECT 
                ServiceName as service_name,
                count() as request_count,
                countIf(StatusCode = 'STATUS_CODE_ERROR') as error_count,
                avg(Duration / 1000000) as avg_duration,
                quantile(0.95)(Duration / 1000000) as p95,
                count() / (toUnixTimestamp(now()) - toUnixTimestamp(toDateTime('${startTime || 'now() - INTERVAL 1 HOUR'}'))) as rps
            FROM otel.otel_traces
            WHERE SpanKind = 'SPAN_KIND_SERVER'
        `;

        if (serviceName) {
            query += ` AND ServiceName = '${serviceName}'`;
        }
        if (startTime) {
            query += ` AND Timestamp >= '${startTime}'`;
        }
        if (endTime) {
            query += ` AND Timestamp <= '${endTime}'`;
        } else {
            query += ` AND Timestamp >= now() - INTERVAL 1 HOUR`;
        }

        query += `
            GROUP BY ServiceName
            ORDER BY request_count DESC
        `;

        return await this.query(query);
    }
}

// Singleton instance
let clickhouseClient = null;

function getClickHouseClient() {
    if (!clickhouseClient) {
        clickhouseClient = new ClickHouseClient();
    }
    return clickhouseClient;
}

module.exports = {
    ClickHouseClient,
    getClickHouseClient
};

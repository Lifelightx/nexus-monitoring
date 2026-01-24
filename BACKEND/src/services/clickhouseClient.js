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
                timestamp: Math.floor(new Date(trace.timestamp).getTime() / 1000),
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
                    start_time: Math.floor(new Date(span.start_time).getTime() / 1000),
                    end_time: Math.floor(new Date(span.end_time).getTime() / 1000),
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
    async getServices() {
        const query = `
            SELECT DISTINCT service_name
            FROM otel.traces
            WHERE service_name != ''
            ORDER BY service_name
        `;

        return await this.query(query);
    }

    /**
     * Get traces
     */
    async getTraces({ serviceName, startTime, endTime, limit = 50, minDuration, maxDuration }) {
        let query = `
            SELECT 
                trace_id,
                service_name,
                endpoint,
                timestamp as start_time,
                duration_ms,
                status_code,
                error,
                span_count
            FROM otel.traces
            WHERE 1=1
        `;

        if (serviceName) {
            query += ` AND service_name = '${serviceName}'`;
        }
        if (startTime) {
            query += ` AND timestamp >= '${startTime}'`;
        }
        if (endTime) {
            query += ` AND timestamp <= '${endTime}'`;
        }
        if (minDuration) {
            query += ` AND duration_ms >= ${minDuration}`;
        }
        if (maxDuration) {
            query += ` AND duration_ms <= ${maxDuration}`;
        }

        query += ` ORDER BY timestamp DESC LIMIT ${limit}`;

        return await this.query(query);
    }

    /**
     * Get trace details (all spans for a trace)
     */
    async getTraceDetails(traceId) {
        const query = `
            SELECT *
            FROM otel.spans
            WHERE trace_id = '${traceId}'
            ORDER BY start_time
        `;

        return await this.query(query);
    }

    /**
     * Get service topology
     */
    async getServiceTopology({ startTime, endTime }) {
        let query = `
            SELECT 
                source_service,
                target_service,
                sum(call_count) as total_calls,
                sum(error_count) as total_errors,
                avg(total_duration_ms) as avg_duration
            FROM otel.service_topology
            WHERE 1=1
        `;

        if (startTime) {
            query += ` AND timestamp >= '${startTime}'`;
        }
        if (endTime) {
            query += ` AND timestamp <= '${endTime}'`;
        }

        query += `
            GROUP BY source_service, target_service
            HAVING total_calls > 0
            ORDER BY total_calls DESC
        `;

        return await this.query(query);
    }

    /**
     * Get service stats
     */
    async getServiceStats({ serviceName, startTime, endTime }) {
        let query = `
            SELECT 
                service_name,
                endpoint,
                toDateTime(timestamp) as hour,
                sum(request_count) as total_requests,
                sum(error_count) as total_errors,
                avg(avg_duration_ms) as avg_duration,
                avg(p50_duration_ms) as p50,
                avg(p95_duration_ms) as p95,
                avg(p99_duration_ms) as p99
            FROM otel.service_stats_mv
            WHERE 1=1
        `;

        if (serviceName) {
            query += ` AND service_name = '${serviceName}'`;
        }
        if (startTime) {
            query += ` AND timestamp >= '${startTime}'`;
        }
        if (endTime) {
            query += ` AND timestamp <= '${endTime}'`;
        }

        query += `
            GROUP BY service_name, endpoint, hour
            ORDER BY hour DESC
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

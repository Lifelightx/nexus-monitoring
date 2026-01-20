const { ClickHouse } = require('clickhouse');

/**
 * ClickHouse Client for querying OpenTelemetry data
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
            SELECT DISTINCT ResourceAttributes['service.name'] as service_name
            FROM otel.otel_traces
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
                TraceId,
                ServiceName,
                SpanName,
                min(Timestamp) as StartTime,
                max(Timestamp) as EndTime,
                count() as SpanCount,
                sum(Duration) / 1000000 as TotalDurationMs
            FROM otel.otel_traces
            WHERE 1=1
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

        query += `
            GROUP BY TraceId, ServiceName, SpanName
            HAVING 1=1
        `;

        if (minDuration) {
            query += ` AND TotalDurationMs >= ${minDuration}`;
        }
        if (maxDuration) {
            query += ` AND TotalDurationMs <= ${maxDuration}`;
        }

        query += ` ORDER BY StartTime DESC LIMIT ${limit}`;

        return await this.query(query);
    }

    /**
     * Get trace details
     */
    async getTraceDetails(traceId) {
        const query = `
            SELECT *
            FROM otel.otel_traces
            WHERE TraceId = '${traceId}'
            ORDER BY Timestamp
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

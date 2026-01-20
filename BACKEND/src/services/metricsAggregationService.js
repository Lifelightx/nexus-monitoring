const cron = require('node-cron');
const { getClickHouseClient } = require('./clickhouseClient');
const Service = require('../models/Service');
const TraceMetrics = require('../models/TraceMetrics');
const logger = require('../utils/logger');

const clickhouseClient = getClickHouseClient();

/**
 * Aggregate metrics from traces
 * Runs every minute
 */
async function aggregateMetrics() {
    try {
        const now = new Date();
        const oneMinuteAgo = new Date(now - 60 * 1000);
        const timeBucket = new Date(Math.floor(now.getTime() / 60000) * 60000); // Round to minute

        // Query ClickHouse for aggregation
        // We group by ServiceName and SpanName (Endpoint)
        const query = `
            SELECT 
                ServiceName as service,
                SpanName as endpoint,
                count() as request_count,
                avg(Duration) / 1000000 as avg_latency_ms,
                quantile(0.50)(Duration / 1000000) as p50_latency_ms,
                quantile(0.95)(Duration / 1000000) as p95_latency_ms,
                quantile(0.99)(Duration / 1000000) as p99_latency_ms,
                countIf(StatusCode = 'Error' OR StatusCode = '2') as error_count
            FROM otel.otel_traces
            WHERE Timestamp >= now() - INTERVAL 1 MINUTE
            AND SpanKind = 'Server' -- Only count server spans (incoming requests)
            GROUP BY ServiceName, SpanName
        `;

        const result = await clickhouseClient.query(query);

        if (!result || !result.data || result.data.length === 0) {
            return;
        }

        const aggregations = result.data;
        const serviceUpdates = {}; // Map to store service-level aggregates

        for (const agg of aggregations) {
            const {
                service, endpoint, request_count,
                avg_latency_ms, p50_latency_ms, p95_latency_ms, p99_latency_ms,
                error_count
            } = agg;

            const error_rate = (error_count / request_count) * 100;

            // Update or Create Service in Mongo
            // We need to resolve ServiceName to a Service ID or create it if missing
            // For now, we assume agent registers it, but we can upsert based on name

            // Find service by name
            let serviceDoc = await Service.findOne({ name: service });

            if (!serviceDoc) {
                // If service doesn't exist, we might skip or create a placeholder
                // Ideally, the Agent registration creates the Service document
                // logic here: skip if not found to avoid ghost services
                continue;
            }

            // Save trace metrics (Historical)
            await TraceMetrics.create({
                service_id: serviceDoc._id,
                endpoint: endpoint,
                time_bucket: timeBucket,
                request_count,
                avg_latency_ms,
                p50_latency_ms,
                p95_latency_ms,
                p99_latency_ms,
                error_count,
                error_rate
            });

            // Accumulate for Service Level Metrics (Live View)
            if (!serviceUpdates[service]) {
                serviceUpdates[service] = {
                    total_reqs: 0,
                    total_errors: 0,
                    latencies: []
                };
            }
            serviceUpdates[service].total_reqs += request_count;
            serviceUpdates[service].total_errors += error_count;
            // Weighted average approach for latency is complex, 
            // taking max p95 for the minute as a safe "worst case" indicator
            serviceUpdates[service].latencies.push(p95_latency_ms);
        }

        // Update Service Collection with Live Metrics
        for (const [serviceName, data] of Object.entries(serviceUpdates)) {
            const errorRate = (data.total_errors / data.total_reqs) * 100;
            const p95Latency = Math.max(...data.latencies);
            const requestsPerMin = data.total_reqs; // It's a 1-minute bucket

            await Service.updateOne(
                { name: serviceName },
                {
                    $set: {
                        'metrics.requestsPerMin': requestsPerMin,
                        'metrics.p95Latency': p95Latency,
                        'metrics.errorRate': errorRate,
                        'lastSeen': new Date()
                    }
                }
            );
        }

        logger.info(`[Metrics] Aggregated metrics for ${aggregations.length} endpoints`);

    } catch (error) {
        logger.error('[Metrics] Error aggregating metrics:', error.message);
    }
}

/**
 * Start metrics aggregation scheduler
 */
function startMetricsAggregation() {
    // Run every minute
    cron.schedule('* * * * *', aggregateMetrics);
    logger.info('[Metrics] Metrics aggregation scheduler started (runs every minute)');
}

module.exports = {
    startMetricsAggregation,
    aggregateMetrics
};

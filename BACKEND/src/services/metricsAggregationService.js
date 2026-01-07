const cron = require('node-cron');
const Trace = require('../models/Trace');
const Span = require('../models/Span');
const Service = require('../models/Service');
const TraceMetrics = require('../models/TraceMetrics');

/**
 * Aggregate metrics from traces
 * Runs every minute
 */
async function aggregateMetrics() {
    try {
        const now = new Date();
        const oneMinuteAgo = new Date(now - 60 * 1000);
        const timeBucket = new Date(Math.floor(now.getTime() / 60000) * 60000); // Round to minute

        // Get all traces from the last minute
        const traces = await Trace.find({
            timestamp: { $gte: oneMinuteAgo, $lt: now }
        });

        if (traces.length === 0) return;

        // Group traces by service and endpoint
        const groups = {};
        for (const trace of traces) {
            if (!trace.service_id) continue;

            const key = `${trace.service_id}_${trace.endpoint}`;
            if (!groups[key]) {
                groups[key] = {
                    service_id: trace.service_id,
                    endpoint: trace.endpoint,
                    traces: []
                };
            }
            groups[key].traces.push(trace);
        }

        // Calculate metrics for each group
        for (const [key, group] of Object.entries(groups)) {
            const { service_id, endpoint, traces } = group;

            // Calculate latency metrics
            const latencies = traces.map(t => t.duration_ms).sort((a, b) => a - b);
            const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
            const p50 = latencies[Math.floor(latencies.length * 0.5)];
            const p95 = latencies[Math.floor(latencies.length * 0.95)];
            const p99 = latencies[Math.floor(latencies.length * 0.99)];

            // Calculate error rate
            const errorCount = traces.filter(t => t.error || t.status_code >= 400).length;
            const errorRate = (errorCount / traces.length) * 100;

            // Calculate time breakdown
            let totalDbTime = 0;
            let totalDownstreamTime = 0;

            for (const trace of traces) {
                const spans = await Span.find({ trace_id: trace.trace_id });

                const dbTime = spans
                    .filter(s => s.type === 'db')
                    .reduce((sum, s) => sum + s.duration_ms, 0);

                const downstreamTime = spans
                    .filter(s => s.type === 'external')
                    .reduce((sum, s) => sum + s.duration_ms, 0);

                totalDbTime += dbTime;
                totalDownstreamTime += downstreamTime;
            }

            const avgDbTime = totalDbTime / traces.length;
            const avgDownstreamTime = totalDownstreamTime / traces.length;
            const avgCodeTime = avgLatency - avgDbTime - avgDownstreamTime;

            // Store metrics
            await TraceMetrics.create({
                service_id,
                endpoint,
                time_bucket: timeBucket,
                request_count: traces.length,
                avg_latency_ms: Math.round(avgLatency),
                p50_latency_ms: Math.round(p50),
                p95_latency_ms: Math.round(p95),
                p99_latency_ms: Math.round(p99),
                error_count: errorCount,
                error_rate: Math.round(errorRate * 100) / 100,
                avg_db_time_ms: Math.round(avgDbTime),
                avg_downstream_time_ms: Math.round(avgDownstreamTime),
                avg_code_time_ms: Math.round(avgCodeTime)
            });

            // Update service metrics
            await Service.findByIdAndUpdate(service_id, {
                'metrics.p95Latency': Math.round(p95),
                'metrics.p99Latency': Math.round(p99),
                'metrics.errorRate': Math.round(errorRate * 100) / 100,
                'metrics.avgDbTime': Math.round(avgDbTime),
                'metrics.avgDownstreamTime': Math.round(avgDownstreamTime),
                'metrics.avgCodeTime': Math.round(avgCodeTime)
            });
        }

        console.log(`[Metrics] Aggregated metrics for ${Object.keys(groups).length} service/endpoint combinations`);
    } catch (error) {
        console.error('[Metrics] Error aggregating metrics:', error);
    }
}

/**
 * Start metrics aggregation scheduler
 */
function startMetricsAggregation() {
    // Run every minute
    cron.schedule('* * * * *', aggregateMetrics);
    console.log('[Metrics] Metrics aggregation scheduler started (runs every minute)');
}

module.exports = {
    startMetricsAggregation,
    aggregateMetrics
};

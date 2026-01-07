const mongoose = require('mongoose');

const traceMetricsSchema = new mongoose.Schema({
    service_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    time_bucket: {
        type: Date,
        required: true,
        index: true
    },
    request_count: {
        type: Number,
        default: 0
    },
    avg_latency_ms: {
        type: Number,
        default: 0
    },
    p50_latency_ms: {
        type: Number,
        default: 0
    },
    p95_latency_ms: {
        type: Number,
        default: 0
    },
    p99_latency_ms: {
        type: Number,
        default: 0
    },
    error_count: {
        type: Number,
        default: 0
    },
    error_rate: {
        type: Number,
        default: 0
    },
    avg_db_time_ms: {
        type: Number,
        default: 0
    },
    avg_downstream_time_ms: {
        type: Number,
        default: 0
    },
    avg_code_time_ms: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// TTL index - auto-delete metrics older than 30 days
traceMetricsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound indexes for efficient querying
traceMetricsSchema.index({ service_id: 1, endpoint: 1, time_bucket: -1 });
traceMetricsSchema.index({ service_id: 1, time_bucket: -1 });

module.exports = mongoose.model('TraceMetrics', traceMetricsSchema);

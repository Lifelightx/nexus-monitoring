const mongoose = require('mongoose');

const traceSchema = new mongoose.Schema({
    trace_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    service_name: {
        type: String,
        required: true,
        index: true
    },
    service_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        index: true
    },
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    duration_ms: {
        type: Number,
        required: true
    },
    status_code: {
        type: Number,
        required: true
    },
    error: {
        type: Boolean,
        default: false,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    spans: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Span'
    }],
    metadata: {
        host: String,
        container_id: String,
        process_id: Number,
        agent_id: String
    }
}, {
    timestamps: true
});

// TTL index - auto-delete traces older than 7 days
traceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Compound indexes for efficient querying
traceSchema.index({ service_id: 1, timestamp: -1 });
traceSchema.index({ endpoint: 1, timestamp: -1 });
traceSchema.index({ error: 1, timestamp: -1 });

module.exports = mongoose.model('Trace', traceSchema);

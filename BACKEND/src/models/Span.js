const mongoose = require('mongoose');

const spanSchema = new mongoose.Schema({
    span_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    trace_id: {
        type: String,
        required: true,
        index: true
    },
    parent_span_id: {
        type: String,
        default: null
    },
    type: {
        type: String,
        required: true,
        enum: ['http', 'db', 'external', 'internal'],
        index: true
    },
    name: {
        type: String,
        required: true
    },
    duration_ms: {
        type: Number,
        required: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date,
        required: true
    },
    metadata: {
        // HTTP span metadata
        http_method: String,
        http_url: String,
        http_status_code: Number,

        // DB span metadata
        db_type: String,
        db_query: String,
        db_collection: String,
        db_table: String,
        db_operation: String,

        // External span metadata
        external_host: String,
        external_method: String,
        external_url: String,
        external_status_code: Number,

        // Common metadata
        error: Boolean,
        error_message: String
    }
}, {
    timestamps: true
});

// TTL index - auto-delete spans older than 7 days
spanSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Compound indexes
spanSchema.index({ trace_id: 1, start_time: 1 });
spanSchema.index({ type: 1, duration_ms: -1 });

module.exports = mongoose.model('Span', spanSchema);

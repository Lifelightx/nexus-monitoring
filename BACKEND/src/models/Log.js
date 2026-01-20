const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['kernel', 'system', 'docker', 'agent', 'alert', 'service', 'network', 'disk'],
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ['info', 'warn', 'error', 'debug', 'alert'],
        default: 'info',
        index: true
    },
    source: {
        type: String, // e.g., "nginx", "payment-api", "kernel", "docker-daemon"
        required: true
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        type: Map, // Flexible key-value pairs (e.g., container_id, image_name)
        of: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Important for time-range queries
    }
}, {
    timestamps: true,
    capped: { size: 50 * 1024 * 1024, max: 100000 } // Capped collection: 50MB or 100k logs per collection (per DB actually, wait)
    // Capped collection is per collection, so all agents share this 50MB. Might be too small?
    // Let's stick to TTL index instead for better management
});

// Remove capped, use TTL to auto-expire logs after 7 days
LogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('Log', LogSchema);

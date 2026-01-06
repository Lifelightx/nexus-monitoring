const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'container_stopped',
            'container_error',
            'agent_offline',
            'high_cpu',
            'high_memory',
            'high_disk',
            'docker_daemon_error'
        ]
    },
    severity: {
        type: String,
        required: true,
        enum: ['critical', 'warning', 'info'],
        default: 'warning'
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    containerId: {
        type: String,
        required: false
    },
    containerName: {
        type: String,
        required: false
    },
    message: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    acknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    acknowledgedAt: {
        type: Date,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
alertSchema.index({ agent: 1, timestamp: -1 });
alertSchema.index({ acknowledged: 1, timestamp: -1 });
alertSchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);

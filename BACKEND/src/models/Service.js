const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String, // 'Node.js', 'Python', 'Java', etc.
        required: true
    },
    port: {
        type: Number,
        required: true
    },
    ports: [{
        type: Number
    }],
    pid: {
        type: Number
    },
    containerId: {
        type: String,
        default: null
    },
    containerName: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['running', 'stopped', 'unknown'],
        default: 'running'
    },
    command: {
        type: String
    },
    detectedFrom: {
        type: String,
        enum: ['host', 'container'],
        default: 'host'
    },
    health: {
        type: String,
        enum: ['healthy', 'warning', 'critical', 'unknown'],
        default: 'healthy'
    },
    uptime: {
        type: Number // seconds
    },
    version: {
        type: String
    },
    endpoints: [{
        path: String,
        method: String
    }],
    metrics: {
        requestsPerMin: {
            type: Number,
            default: 0
        },
        p95Latency: {
            type: Number,
            default: 0
        },
        errorRate: {
            type: Number,
            default: 0
        }
    },
    detectedAt: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for unique service per agent
serviceSchema.index({ agentId: 1, port: 1 }, { unique: true });

// Index for queries
serviceSchema.index({ agentId: 1, status: 1 });
serviceSchema.index({ agentId: 1, type: 1 });

module.exports = mongoose.model('Service', serviceSchema);

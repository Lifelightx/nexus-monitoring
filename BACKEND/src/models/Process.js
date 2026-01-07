const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    pid: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    command: {
        type: String
    },
    cpu: {
        type: Number,
        default: 0
    },
    memory: {
        type: Number,
        default: 0
    },
    ports: [{
        port: Number,
        protocol: String
    }],
    type: {
        type: String // 'Node.js', 'Python', etc.
    },
    linkedServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index
processSchema.index({ agentId: 1, timestamp: -1 });
processSchema.index({ agentId: 1, pid: 1 });

// TTL index - automatically delete process records older than 24 hours
processSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Process', processSchema);

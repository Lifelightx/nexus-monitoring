const mongoose = require('mongoose');

const pendingCommandSchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    commandType: {
        type: String,
        required: true,
        enum: [
            'docker:start',
            'docker:stop',
            'docker:restart',
            'docker:remove',
            'docker:logs:get',
            'file:list',
            'file:read'
        ]
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'executing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },
    result: {
        type: mongoose.Schema.Types.Mixed
    },
    error: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    executedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
});

// Index for efficient polling queries
pendingCommandSchema.index({ agentId: 1, status: 1, createdAt: 1 });

// Auto-delete completed commands after 1 hour
pendingCommandSchema.index({ completedAt: 1 }, {
    expireAfterSeconds: 3600,
    partialFilterExpression: { status: { $in: ['completed', 'failed'] } }
});

module.exports = mongoose.model('PendingCommand', pendingCommandSchema);

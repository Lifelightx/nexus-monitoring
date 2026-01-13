const mongoose = require('mongoose');

const commandQueueSchema = new mongoose.Schema({
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    type: {
        type: String,
        enum: ['docker', 'system', 'file'],
        required: true
    },
    action: {
        type: String,
        required: true
    },
    params: {
        type: Object,
        default: {}
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'completed', 'failed'],
        default: 'pending'
    },
    result: {
        type: Object,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    sentAt: Date,
    completedAt: Date
});

module.exports = mongoose.model('CommandQueue', commandQueueSchema);

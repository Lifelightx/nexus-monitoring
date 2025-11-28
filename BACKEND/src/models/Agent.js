const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    hostname: String,
    platform: String,
    distro: String,
    release: String,
    ip: String,
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline',
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    registeredAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Agent', agentSchema);

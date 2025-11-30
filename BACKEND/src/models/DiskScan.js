const mongoose = require('mongoose');

const diskScanSchema = new mongoose.Schema({
    agentId: {
        type: String,
        required: true,
        index: true
    },
    path: {
        type: String,
        required: true
    },
    files: {
        type: String, // Encrypted JSON string
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for agent and path
diskScanSchema.index({ agentId: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('DiskScan', diskScanSchema);

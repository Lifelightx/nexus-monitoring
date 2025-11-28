const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
    },
    cpu: {
        load: Number,
        user: Number,
        sys: Number,
    },
    memory: {
        total: Number,
        used: Number,
        active: Number,
        available: Number,
    },
    network: [{
        iface: String,
        rx_bytes: Number,
        tx_bytes: Number,
        rx_sec: Number,
        tx_sec: Number,
    }],
    docker: [{
        id: String,
        name: String,
        image: String,
        state: String,
    }],
    dockerDetails: {
        containers: [{
            id: String,
            name: String,
            image: String,
            imageID: String,
            state: String,
            status: String,
            created: Number,
            started: Number,
            finished: Number,
            ports: [mongoose.Schema.Types.Mixed],
            mounts: [mongoose.Schema.Types.Mixed],
            restartCount: Number,
            platform: String,
            command: String,
            stats: {
                cpuPercent: Number,
                memUsage: Number,
                memLimit: Number,
                memPercent: Number,
                netIO: {
                    rx: Number,
                    wx: Number
                },
                blockIO: {
                    r: Number,
                    w: Number
                },
                pids: Number
            }
        }],
        images: [{
            id: String,
            container: String,
            comment: String,
            os: String,
            architecture: String,
            parent: String,
            dockerVersion: String,
            size: Number,
            sharedSize: Number,
            virtualSize: Number,
            author: String,
            created: Number,
            containerConfig: mongoose.Schema.Types.Mixed,
            config: mongoose.Schema.Types.Mixed
        }],
        volumes: [{
            name: String,
            driver: String,
            labels: mongoose.Schema.Types.Mixed,
            mountpoint: String,
            options: mongoose.Schema.Types.Mixed,
            scope: String,
            created: Number
        }],
        info: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 7, // Auto-delete after 7 days (TTL index)
    }
});

// Index for efficient querying by agent and time
metricSchema.index({ agent: 1, timestamp: -1 });

module.exports = mongoose.model('Metric', metricSchema);

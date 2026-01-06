const mongoose = require('mongoose');

const alertSettingsSchema = new mongoose.Schema({
    // Email Configuration
    emailProvider: {
        type: String,
        enum: ['gmail', 'outlook', 'smtp'],
        default: 'gmail'
    },
    emailConfig: {
        service: String, // 'gmail', 'outlook', or custom
        host: String, // For custom SMTP
        port: Number, // For custom SMTP
        secure: Boolean, // For custom SMTP
        user: {
            type: String,
            required: false,
            default: ''
        },
        password: {
            type: String,
            required: false,
            default: ''
        },
        from: {
            type: String,
            required: false,
            default: ''
        }
    },
    // Recipient Emails
    recipientEmails: {
        type: [String],
        default: [],
        validate: {
            validator: function (emails) {
                return emails.every(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
            },
            message: 'Invalid email address format'
        }
    },
    // Alert Thresholds
    thresholds: {
        cpu: {
            type: Number,
            default: 80,
            min: 0,
            max: 100
        },
        memory: {
            type: Number,
            default: 90,
            min: 0,
            max: 100
        },
        disk: {
            type: Number,
            default: 85,
            min: 0,
            max: 100
        }
    },
    // Enabled Alert Types
    enabledAlerts: {
        containerStopped: {
            type: Boolean,
            default: true
        },
        containerError: {
            type: Boolean,
            default: true
        },
        agentOffline: {
            type: Boolean,
            default: true
        },
        highCpu: {
            type: Boolean,
            default: true
        },
        highMemory: {
            type: Boolean,
            default: true
        },
        highDisk: {
            type: Boolean,
            default: true
        }
    },
    // Email sending enabled
    emailEnabled: {
        type: Boolean,
        default: false
    },
    // Alert Deduplication Window (in minutes)
    alertDeduplicationWindow: {
        type: Number,
        default: 15,
        min: 0,
        max: 1440 // Max 24 hours
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
alertSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('AlertSettings', alertSettingsSchema);

const express = require('express');
const router = express.Router();
const AlertSettings = require('../models/AlertSettings');
const emailService = require('../services/emailService');
const { protect: authMiddleware } = require('../middleware/authMiddleware');

// Get alert settings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const settings = await AlertSettings.getSettings();

        // Don't send password in response
        const settingsObj = settings.toObject();
        if (settingsObj.emailConfig && settingsObj.emailConfig.password) {
            settingsObj.emailConfig.password = '********';
        }

        res.json(settingsObj);
    } catch (error) {
        console.error('Error fetching alert settings:', error);
        res.status(500).json({ error: 'Failed to fetch alert settings' });
    }
});

// Update alert settings
router.put('/', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;

        let settings = await AlertSettings.getSettings();

        // Update fields
        if (updates.emailProvider !== undefined) {
            settings.emailProvider = updates.emailProvider;
        }

        if (updates.emailConfig) {
            // Only update password if a new one is provided
            if (updates.emailConfig.password && updates.emailConfig.password !== '********') {
                settings.emailConfig = updates.emailConfig;
            } else {
                // Keep existing password
                const { password, ...configWithoutPassword } = updates.emailConfig;
                settings.emailConfig = {
                    ...settings.emailConfig,
                    ...configWithoutPassword
                };
            }
        }

        if (updates.recipientEmails !== undefined) {
            settings.recipientEmails = updates.recipientEmails;
        }

        if (updates.thresholds) {
            settings.thresholds = { ...settings.thresholds, ...updates.thresholds };
        }

        if (updates.enabledAlerts) {
            settings.enabledAlerts = { ...settings.enabledAlerts, ...updates.enabledAlerts };
        }

        if (updates.emailEnabled !== undefined) {
            settings.emailEnabled = updates.emailEnabled;
        }

        if (updates.alertDeduplicationWindow !== undefined) {
            settings.alertDeduplicationWindow = updates.alertDeduplicationWindow;
        }

        await settings.save();

        // Don't send password in response
        const settingsObj = settings.toObject();
        if (settingsObj.emailConfig && settingsObj.emailConfig.password) {
            settingsObj.emailConfig.password = '********';
        }

        res.json(settingsObj);
    } catch (error) {
        console.error('Error updating alert settings:', error);
        res.status(500).json({ error: 'Failed to update alert settings' });
    }
});

// Test email configuration
router.post('/test-email', authMiddleware, async (req, res) => {
    try {
        const { testEmail } = req.body;

        if (!testEmail) {
            return res.status(400).json({ error: 'Test email address required' });
        }

        const settings = await AlertSettings.getSettings();

        if (!settings.emailConfig || !settings.emailConfig.user) {
            return res.status(400).json({ error: 'Email not configured' });
        }

        // Configure email service
        emailService.configure(settings);

        // Test connection
        await emailService.testConnection();

        // Send test email
        const testAlert = {
            type: 'info',
            severity: 'info',
            message: 'This is a test email from Nexus Monitoring',
            details: { test: true },
            timestamp: new Date()
        };

        await emailService.sendAlert(testAlert, [testEmail], 'Test Agent');

        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            error: 'Failed to send test email',
            details: error.message
        });
    }
});

// Add recipient email
router.post('/recipients', authMiddleware, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const settings = await AlertSettings.getSettings();

        if (settings.recipientEmails.includes(email)) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        settings.recipientEmails.push(email);
        await settings.save();

        res.json({ message: 'Email added successfully', recipientEmails: settings.recipientEmails });
    } catch (error) {
        console.error('Error adding recipient email:', error);
        res.status(500).json({ error: 'Failed to add recipient email' });
    }
});

// Remove recipient email
router.delete('/recipients/:email', authMiddleware, async (req, res) => {
    try {
        const { email } = req.params;

        const settings = await AlertSettings.getSettings();

        settings.recipientEmails = settings.recipientEmails.filter(e => e !== email);
        await settings.save();

        res.json({ message: 'Email removed successfully', recipientEmails: settings.recipientEmails });
    } catch (error) {
        console.error('Error removing recipient email:', error);
        res.status(500).json({ error: 'Failed to remove recipient email' });
    }
});

module.exports = router;

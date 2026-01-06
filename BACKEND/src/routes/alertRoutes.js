const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const alertService = require('../services/alertService');
const { protect: authMiddleware } = require('../middleware/authMiddleware');

// Get recent alerts
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { limit = 50, acknowledged } = req.query;

        const query = {};
        if (acknowledged !== undefined) {
            query.acknowledged = acknowledged === 'true';
        }

        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('agent', 'name os')
            .populate('acknowledgedBy', 'username email');

        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Get alerts for specific agent
router.get('/agent/:agentId', authMiddleware, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { limit = 50 } = req.query;

        const alerts = await Alert.find({ agent: agentId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('agent', 'name os');

        res.json(alerts);
    } catch (error) {
        console.error('Error fetching agent alerts:', error);
        res.status(500).json({ error: 'Failed to fetch agent alerts' });
    }
});

// Get alert statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const totalAlerts = await Alert.countDocuments();
        const unacknowledged = await Alert.countDocuments({ acknowledged: false });
        const critical = await Alert.countDocuments({ severity: 'critical', acknowledged: false });

        const alertsByType = await Alert.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        res.json({
            total: totalAlerts,
            unacknowledged,
            critical,
            byType: alertsByType
        });
    } catch (error) {
        console.error('Error fetching alert stats:', error);
        res.status(500).json({ error: 'Failed to fetch alert statistics' });
    }
});

// Acknowledge alert
router.put('/:id/acknowledge', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const alert = await alertService.acknowledgeAlert(id, userId);

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json(alert);
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// Acknowledge multiple alerts
router.put('/acknowledge/bulk', authMiddleware, async (req, res) => {
    try {
        const { alertIds } = req.body;
        const userId = req.user._id;

        const result = await Alert.updateMany(
            { _id: { $in: alertIds } },
            {
                acknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date()
            }
        );

        res.json({ acknowledged: result.modifiedCount });
    } catch (error) {
        console.error('Error acknowledging alerts:', error);
        res.status(500).json({ error: 'Failed to acknowledge alerts' });
    }
});

// Delete alert
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const alert = await Alert.findByIdAndDelete(id);

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
        console.error('Error deleting alert:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// Cleanup old alerts
router.post('/cleanup', authMiddleware, async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;

        const result = await alertService.cleanupOldAlerts(daysToKeep);

        res.json({
            message: 'Cleanup completed',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up alerts:', error);
        res.status(500).json({ error: 'Failed to cleanup alerts' });
    }
});

module.exports = router;

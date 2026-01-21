const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const alertService = require('../services/alertService');
const { protect: authMiddleware } = require('../middleware/authMiddleware');

// Get recent alerts
/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get recent alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of alerts to return (default 50)
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *         description: Filter by acknowledgement status
 *     responses:
 *       200:
 *         description: List of alerts
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/alerts/agent/{agentId}:
 *   get:
 *     summary: Get alerts for valid agent
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the agent
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of alerts to return
 *     responses:
 *       200:
 *         description: List of agent alerts
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/alerts/stats:
 *   get:
 *     summary: Get alert statistics
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 unacknowledged:
 *                   type: integer
 *                 critical:
 *                   type: integer
 *                 byType:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/alerts/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/alerts/acknowledge/bulk:
 *   put:
 *     summary: Acknowledge multiple alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertIds
 *             properties:
 *               alertIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Alerts acknowledged
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert deleted
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/alerts/cleanup:
 *   post:
 *     summary: Cleanup old alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       200:
 *         description: Cleanup completed
 *       500:
 *         description: Server error
 */
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

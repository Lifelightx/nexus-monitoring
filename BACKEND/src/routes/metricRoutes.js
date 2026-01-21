const express = require('express');
const router = express.Router();
const metricController = require('../controllers/metricController');

/**
 * @swagger
 * /api/metrics/{agentId}/report:
 *   get:
 *     summary: Get metrics report
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Metrics report
 *       500:
 *         description: Server error
 */
router.get('/:agentId/report', metricController.getMetricsReport);

module.exports = router;

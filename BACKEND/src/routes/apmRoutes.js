const express = require('express');
const router = express.Router();
const apmController = require('../controllers/apmController');

/**
 * @swagger
 * /api/apm/services:
 *   get:
 *     summary: Get list of services with APM stats (RPS, Error Rate, Latency)
 *     tags: [APM]
 *     parameters:
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *         description: Start time (YYYY-MM-DD HH:mm:ss)
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *         description: End time (YYYY-MM-DD HH:mm:ss)
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/services', apmController.getServices);

/**
 * @swagger
 * /api/apm/traces:
 *   get:
 *     summary: Get list of traces
 *     tags: [APM]
 */
router.get('/traces', apmController.getTraces);

/**
 * @swagger
 * /api/apm/traces/{traceId}:
 *   get:
 *     summary: Get trace details (waterfall)
 *     tags: [APM]
 */
router.get('/traces/:traceId', apmController.getTraceDetails);

module.exports = router;

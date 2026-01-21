const express = require('express');
const router = express.Router();
const otelQueryController = require('../controllers/otelQueryController');

// Metrics endpoints
// Metrics endpoints
/**
 * @swagger
 * /api/otel/metrics/latest:
 *   get:
 *     summary: Get latest metrics
 *     tags: [OTel Query]
 *     responses:
 *       200:
 *         description: Latest metrics data
 *       500:
 *         description: Server error
 */
router.get('/metrics/latest', otelQueryController.getLatestMetrics);

/**
 * @swagger
 * /api/otel/metrics/timeseries:
 *   get:
 *     summary: Get metric timeseries
 *     tags: [OTel Query]
 *     responses:
 *       200:
 *         description: Timeseries data
 *       500:
 *         description: Server error
 */
router.get('/metrics/timeseries', otelQueryController.getMetricTimeSeries);

/**
 * @swagger
 * /api/otel/metrics/daily-usage:
 *   get:
 *     summary: Get daily network usage
 *     tags: [OTel Query]
 *     responses:
 *       200:
 *         description: Daily usage statistics
 *       500:
 *         description: Server error
 */
router.get('/metrics/daily-usage', otelQueryController.getDailyNetworkUsage);

// Traces endpoints
// Traces endpoints
/**
 * @swagger
 * /api/otel/traces:
 *   get:
 *     summary: Get traces
 *     tags: [OTel Query]
 *     responses:
 *       200:
 *         description: List of traces
 *       500:
 *         description: Server error
 */
router.get('/traces', otelQueryController.getTraces);

/**
 * @swagger
 * /api/otel/traces/{traceId}:
 *   get:
 *     summary: Get trace details
 *     tags: [OTel Query]
 *     parameters:
 *       - in: path
 *         name: traceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Trace ID
 *     responses:
 *       200:
 *         description: Trace details
 *       500:
 *         description: Server error
 */
router.get('/traces/:traceId', otelQueryController.getTraceDetails);

// Services endpoints
// Services endpoints
/**
 * @swagger
 * /api/otel/services:
 *   get:
 *     summary: Get all services
 *     tags: [OTel Query]
 *     responses:
 *       200:
 *         description: List of services
 *       500:
 *         description: Server error
 */
router.get('/services', otelQueryController.getServices);

/**
 * @swagger
 * /api/otel/services/{serviceName}:
 *   get:
 *     summary: Get service details
 *     tags: [OTel Query]
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         schema:
 *           type: string
 *         required: true
 *         description: Service Name
 *     responses:
 *       200:
 *         description: Service details
 *       500:
 *         description: Server error
 */
router.get('/services/:serviceName', otelQueryController.getServiceDetails); // New endpoint

/**
 * @swagger
 * /api/otel/service-topology:
 *   get:
 *     summary: Get service topology
 *     tags: [OTel Query]
 *     responses:
 *       200:
 *         description: Service topology graph
 *       500:
 *         description: Server error
 */
router.get('/service-topology', otelQueryController.getServiceTopology);

module.exports = router;

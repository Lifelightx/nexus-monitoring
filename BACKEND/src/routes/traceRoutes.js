const express = require('express');
const router = express.Router();
const traceController = require('../controllers/traceController');
const { protect } = require('../middleware/authMiddleware');

// Trace ingestion (from agent)
/**
 * @swagger
 * /api/traces:
 *   post:
 *     summary: Ingest traces (Legacy/Agent)
 *     tags: [Traces]
 *     responses:
 *       200:
 *         description: Traces ingested
 *       500:
 *         description: Server error
 */
router.post('/traces', traceController.ingestTraces);

// Trace queries
/**
 * @swagger
 * /api/traces/{traceId}:
 *   get:
 *     summary: Get trace by ID
 *     tags: [Traces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: traceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Trace ID
 *     responses:
 *       200:
 *         description: Trace data
 *       500:
 *         description: Server error
 */
router.get('/traces/:traceId', protect, traceController.getTrace);

/**
 * @swagger
 * /api/traces/{traceId}/analysis:
 *   get:
 *     summary: Analyze trace
 *     tags: [Traces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: traceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Trace ID
 *     responses:
 *       200:
 *         description: Trace analysis
 *       500:
 *         description: Server error
 */
router.get('/traces/:traceId/analysis', protect, traceController.analyzeTrace);

// Service traces
/**
 * @swagger
 * /api/services/{serviceId}/traces:
 *   get:
 *     summary: Get traces for service
 *     tags: [Traces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: List of traces
 *       500:
 *         description: Server error
 */
router.get('/services/:serviceId/traces', protect, traceController.getServiceTraces);

/**
 * @swagger
 * /api/services/{serviceId}/trace-stats:
 *   get:
 *     summary: Get trace statistics for service
 *     tags: [Traces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Trace statistics
 *       500:
 *         description: Server error
 */
router.get('/services/:serviceId/trace-stats', protect, traceController.getServiceTraceStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const otlpIngestController = require('../controllers/otlpIngestController');

/**
 * OTLP Ingest Routes
 * These endpoints receive OpenTelemetry Protocol (OTLP) data
 * and forward it to Kafka for processing
 */

// Health check removed - not implemented in OTLP controller
// Use backend health check instead

// OTLP Traces endpoint
/**
 * @swagger
 * /v1/traces:
 *   post:
 *     summary: Ingest OTLP traces
 *     tags: [OTLP Ingest]
 *     responses:
 *       200:
 *         description: Traces ingested
 */
router.post('/traces', otlpIngestController.ingestTraces);

// OTLP Metrics endpoint
/**
 * @swagger
 * /v1/metrics:
 *   post:
 *     summary: Ingest OTLP metrics
 *     tags: [OTLP Ingest]
 *     responses:
 *       200:
 *         description: Metrics ingested
 */
router.post('/metrics', otlpIngestController.ingestMetrics);

// OTLP Logs endpoint
/**
 * @swagger
 * /v1/logs:
 *   post:
 *     summary: Ingest OTLP logs
 *     tags: [OTLP Ingest]
 *     responses:
 *       200:
 *         description: Logs ingested
 */
router.post('/logs', otlpIngestController.ingestLogs);

module.exports = router;

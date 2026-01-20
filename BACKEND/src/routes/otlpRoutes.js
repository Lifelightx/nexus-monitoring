const express = require('express');
const router = express.Router();
const otlpIngestController = require('../controllers/otlpIngestController');

/**
 * OTLP Ingest Routes
 * These endpoints receive OpenTelemetry Protocol (OTLP) data
 * and forward it to Kafka for processing
 */

// Health check
router.get('/health', otlpIngestController.healthCheck);

// OTLP Traces endpoint
router.post('/traces', otlpIngestController.ingestTraces);

// OTLP Metrics endpoint
router.post('/metrics', otlpIngestController.ingestMetrics);

// OTLP Logs endpoint
router.post('/logs', otlpIngestController.ingestLogs);

module.exports = router;

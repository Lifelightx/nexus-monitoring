const otlpClient = require('../services/otlpClient');
const logger = require('../utils/logger');
/**
 * OTLP Ingest Controller
 * Receives OpenTelemetry Protocol (OTLP) data and forwards to OTel Collector
 */

/**
 * Ingest OTLP Traces
 * POST /v1/traces
 */
async function ingestTraces(req, res) {
    try {
        const tracesPayload = req.body;

        // Validate payload
        if (!tracesPayload || !tracesPayload.resourceSpans) {
            return res.status(400).json({
                error: 'Invalid OTLP traces payload',
                message: 'Expected resourceSpans field'
            });
        }

        logger.info(`[OTLP Ingest] Received traces:`, {
            resourceSpansCount: tracesPayload.resourceSpans?.length || 0
        });

        // Send directly to OTel Collector
        await otlpClient.sendTraces(tracesPayload);

        res.status(200).json({
            success: true,
            message: 'Traces ingested successfully'
        });
    } catch (error) {
        console.error('[OTLP Ingest] Error ingesting traces:', error);
        res.status(500).json({
            error: 'Failed to ingest traces',
            message: error.message
        });
    }
}

/**
 * Ingest OTLP Metrics
 * POST /v1/metrics
 */
async function ingestMetrics(req, res) {
    try {
        const metricsPayload = req.body;

        // Validate payload
        if (!metricsPayload || !metricsPayload.resourceMetrics) {
            return res.status(400).json({
                error: 'Invalid OTLP metrics payload',
                message: 'Expected resourceMetrics field'
            });
        }

        logger.info(`[OTLP Ingest] Received metrics:`, {
            resourceMetricsCount: metricsPayload.resourceMetrics?.length || 0
        });

        // Send directly to OTel Collector
        await otlpClient.sendMetrics(metricsPayload);

        res.status(200).json({
            success: true,
            message: 'Metrics ingested successfully'
        });
    } catch (error) {
        console.error('[OTLP Ingest] Error ingesting metrics:', error);
        res.status(500).json({
            error: 'Failed to ingest metrics',
            message: error.message
        });
    }
}

/**
 * Ingest OTLP Logs
 * POST /v1/logs
 */
async function ingestLogs(req, res) {
    try {
        const logsPayload = req.body;

        // Validate payload
        if (!logsPayload || !logsPayload.resourceLogs) {
            return res.status(400).json({
                error: 'Invalid OTLP logs payload',
                message: 'Expected resourceLogs field'
            });
        }

        logger.info(`[OTLP Ingest] Received logs:`, {
            resourceLogsCount: logsPayload.resourceLogs?.length || 0
        });

        // Send directly to OTel Collector
        await otlpClient.sendLogs(logsPayload);

        res.status(200).json({
            success: true,
            message: 'Logs ingested successfully'
        });
    } catch (error) {
        console.error('[OTLP Ingest] Error ingesting logs:', error);
        res.status(500).json({
            error: 'Failed to ingest logs',
            message: error.message
        });
    }
}

/**
 * Health check endpoint for OTLP ingest
 * GET /v1/health
 */
async function healthCheck(req, res) {
    try {
        const kafkaProducer = getKafkaProducer();
        const isKafkaConnected = kafkaProducer.isConnected;

        res.status(200).json({
            status: 'ok',
            kafka: isKafkaConnected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            message: error.message
        });
    }
}

module.exports = {
    ingestTraces,
    ingestMetrics,
    ingestLogs,
    healthCheck
};

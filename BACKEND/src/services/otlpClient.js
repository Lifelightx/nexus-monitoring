const axios = require('axios');
const logger = require('../utils/logger');
/**
 * OTLP HTTP Client
 * Sends OpenTelemetry data directly to OTel Collector via HTTP
 */

const OTEL_COLLECTOR_URL = process.env.OTEL_COLLECTOR_URL || 'http://localhost:30318';

/**
 * Send OTLP Traces
 * @param {Object} tracesPayload - OTLP traces payload (JSON)
 */
async function sendTraces(tracesPayload) {
    try {
        const response = await axios.post(`${OTEL_COLLECTOR_URL}/v1/traces`, tracesPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        logger.info(`[OTLP] ✅ Sent traces to collector:`, {
            status: response.status
        });

        return response.data;
    } catch (error) {
        console.error(`[OTLP] ❌ Failed to send traces:`, error.message);
        throw error;
    }
}

/**
 * Send OTLP Metrics
 * @param {Object} metricsPayload - OTLP metrics payload (JSON)
 */
async function sendMetrics(metricsPayload) {
    try {
        const response = await axios.post(`${OTEL_COLLECTOR_URL}/v1/metrics`, metricsPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        logger.info(`[OTLP] ✅ Sent metrics to collector`);
        return response.data;
    } catch (error) {
        console.error(`[OTLP] ❌ Failed to send metrics:`, error.message);
        throw error;
    }
}

/**
 * Send OTLP Logs
 * @param {Object} logsPayload - OTLP logs payload (JSON)
 */
async function sendLogs(logsPayload) {
    try {
        const response = await axios.post(`${OTEL_COLLECTOR_URL}/v1/logs`, logsPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        logger.info(`[OTLP] ✅ Sent logs to collector`);
        return response.data;
    } catch (error) {
        console.error(`[OTLP] ❌ Failed to send logs:`, error.message);
        throw error;
    }
}

module.exports = {
    sendTraces,
    sendMetrics,
    sendLogs
};

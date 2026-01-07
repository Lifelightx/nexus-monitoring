const axios = require('axios');
const { getTraceContext, completeTrace } = require('./context');
const { createTrace } = require('./tracer');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown';
const SERVICE_ID = process.env.SERVICE_ID || null;
const AGENT_ID = process.env.AGENT_ID || null;
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 5000; // 5 seconds

let traceBatch = [];
let spanBatch = [];
let batchTimer = null;
let isShuttingDown = false;

/**
 * Start the trace sender
 */
function startSender() {
    console.log('[APM] Trace sender initialized');
    scheduleBatchSend();
}

/**
 * Schedule batch send
 */
function scheduleBatchSend() {
    if (batchTimer) clearTimeout(batchTimer);

    batchTimer = setTimeout(async () => {
        await flushBatch();
        if (!isShuttingDown) {
            scheduleBatchSend();
        }
    }, BATCH_INTERVAL);
}

/**
 * Flush current batch to backend
 */
async function flushBatch() {
    if (traceBatch.length === 0) return;

    const traces = [...traceBatch];
    const spans = [...spanBatch];

    // Clear batches
    traceBatch = [];
    spanBatch = [];

    // Clear timer
    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }

    try {
        console.log(`[APM] Sending ${traces.length} traces and ${spans.length} spans to ${SERVER_URL}/api/traces`);

        await axios.post(`${SERVER_URL}/api/traces`, {
            traces,
            spans
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`[APM] ✅ Successfully sent ${traces.length} traces and ${spans.length} spans to backend`);
    } catch (error) {
        console.error('[APM] ❌ Failed to send traces:', error.message);

        // Put traces back in batch for retry (up to a limit)
        if (traceBatch.length < BATCH_SIZE * 2) {
            traceBatch.unshift(...traces);
            spanBatch.unshift(...spans);
        }
    }
}

/**
 * Complete and send current trace
 */
function completeAndSendTrace() {
    const traceData = completeTrace();
    if (!traceData) return;

    const { traceId, rootSpan, spans, metadata, statusCode, durationMs, endTime } = traceData;

    // Create trace object
    const trace = createTrace({
        traceId,
        serviceName: SERVICE_NAME,
        serviceId: SERVICE_ID,
        endpoint: metadata.endpoint || 'unknown',
        durationMs,
        statusCode,
        error: statusCode >= 400,
        timestamp: rootSpan?.start_time || new Date(),
        spans: spans.map(s => s.span_id),
        metadata: {
            agent_id: AGENT_ID,
            ...metadata
        }
    });

    // Add to batch
    traceBatch.push(trace);
    spanBatch.push(...spans);

    // Flush if batch is full
    if (traceBatch.length >= BATCH_SIZE) {
        flushBatch();
    }
}

/**
 * Stop the sender and flush remaining traces
 */
async function stopSender() {
    isShuttingDown = true;

    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }

    await flushBatch();
    console.log('[APM] Trace sender stopped');
}

module.exports = {
    startSender,
    stopSender,
    completeTrace: completeAndSendTrace
};

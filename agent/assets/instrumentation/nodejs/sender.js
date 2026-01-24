const axios = require('axios');
const { getTraceContext, completeTrace } = require('./context');
const { createTrace, createAttribute } = require('./tracer');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown';
const SERVICE_ID = process.env.SERVICE_ID || null;
const AGENT_ID = process.env.AGENT_ID || null;
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 5000; // 5 seconds

// Use OTLP endpoint
const OTLP_ENDPOINT = `${SERVER_URL}/api/otlp/v1/traces`;

let spanBatch = [];
let batchTimer = null;
let isShuttingDown = false;

/**
 * Start the trace sender
 */
function startSender() {
    console.log('[APM] Trace sender initialized (OTLP mode)');
    console.log(`[APM] Sending to: ${OTLP_ENDPOINT}`);
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
 * Create OTLP resource spans payload
 */
function createOTLPPayload(spans) {
    const resourceAttributes = [
        createAttribute('service.name', SERVICE_NAME),
        createAttribute('telemetry.sdk.name', 'nexus-instrumentation'),
        createAttribute('telemetry.sdk.language', 'nodejs'),
        createAttribute('telemetry.sdk.version', '1.0.0')
    ];

    if (SERVICE_ID) {
        resourceAttributes.push(createAttribute('service.instance.id', SERVICE_ID));
    }
    if (AGENT_ID) {
        resourceAttributes.push(createAttribute('agent.id', AGENT_ID));
    }

    return {
        resourceSpans: [
            {
                resource: {
                    attributes: resourceAttributes
                },
                scopeSpans: [
                    {
                        scope: {
                            name: 'nexus-instrumentation',
                            version: '1.0.0'
                        },
                        spans: spans
                    }
                ]
            }
        ]
    };
}

/**
 * Flush current batch to backend
 */
async function flushBatch() {
    if (spanBatch.length === 0) return;

    const spans = [...spanBatch];

    // Clear batch
    spanBatch = [];

    // Clear timer
    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }

    try {
        // Create OTLP payload
        const otlpPayload = createOTLPPayload(spans);

        console.log(`[APM] Sending ${spans.length} spans to ${OTLP_ENDPOINT}`);

        await axios.post(OTLP_ENDPOINT, otlpPayload, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`[APM] ✅ Successfully sent ${spans.length} spans to backend (OTLP format)`);
    } catch (error) {
        console.error('[APM] ❌ Failed to send traces:', error.message);

        // Put spans back in batch for retry (up to a limit)
        if (spanBatch.length < BATCH_SIZE * 2) {
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

    // Add root span if exists
    if (rootSpan) {
        spanBatch.push(rootSpan);
    }

    // Add all child spans
    if (spans && spans.length > 0) {
        spanBatch.push(...spans);
    }

    console.log(`[APM] Collected trace ${traceId.substring(0, 8)}... with ${spans.length + (rootSpan ? 1 : 0)} spans`);

    // Flush if batch is full
    if (spanBatch.length >= BATCH_SIZE) {
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

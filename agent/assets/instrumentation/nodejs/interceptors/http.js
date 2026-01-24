const shimmer = require('../utils/shimmer');
const { setTraceContext, getTraceContext } = require('../context');
const { generateTraceId, generateSpanId, createOTLPHttpSpan } = require('../tracer');

/**
 * Normalize endpoint path (replace IDs with :id)
 */
function normalizeEndpoint(path) {
    if (!path) return '/';

    // Replace UUIDs
    path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

    // Replace numeric IDs
    path = path.replace(/\/\d+/g, '/:id');

    // Replace MongoDB ObjectIds
    path = path.replace(/\/[0-9a-f]{24}/g, '/:id');

    return path;
}

/**
 * Generate W3C traceparent header
 * Format: version-traceid-spanid-flags
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */
function generateTraceparent(traceId, spanId, sampled = true) {
    const version = '00';
    const flags = sampled ? '01' : '00';
    return `${version}-${traceId}-${spanId}-${flags}`;
}

/**
 * Parse W3C traceparent header
 * Returns { traceId, parentSpanId, sampled } or null
 */
function parseTraceparent(traceparent) {
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    const [version, traceId, parentSpanId, flags] = parts;

    // Only support version 00
    if (version !== '00') return null;

    return {
        traceId,
        parentSpanId,
        sampled: flags === '01'
    };
}

/**
 * Instrument HTTP server
 */
function instrumentHttp() {
    const http = require('http');

    shimmer.wrap(http, 'createServer', function (original) {
        return function (...args) {
            const server = original.apply(this, args);

            // Wrap the request listener
            const listeners = server.listeners('request');
            server.removeAllListeners('request');

            listeners.forEach(listener => {
                server.on('request', function (req, res) {
                    // Check for W3C traceparent header
                    const traceparentHeader = req.headers['traceparent'];
                    const parsedParent = parseTraceparent(traceparentHeader);

                    // Use existing trace ID if propagated, otherwise generate new
                    const traceId = parsedParent?.traceId || generateTraceId();
                    const spanId = generateSpanId();
                    const parentSpanId = parsedParent?.parentSpanId || null;

                    const startTime = new Date();

                    // Set trace context
                    const context = setTraceContext(traceId, spanId, {
                        endpoint: `${req.method} ${normalizeEndpoint(req.url)}`,
                        parentSpanId: parentSpanId
                    });

                    if (parsedParent) {
                        console.log(`[APM] Continuing trace ${traceId.substring(0, 8)}... from upstream service`);
                    }

                    // Wrap res.end to capture response
                    const originalEnd = res.end;
                    res.end = function (...args) {
                        const endTime = new Date();
                        const durationMs = endTime - startTime;

                        // Create OTLP HTTP span
                        const rootSpan = createOTLPHttpSpan({
                            spanId,
                            traceId,
                            parentSpanId: context.metadata.parentSpanId,
                            method: req.method,
                            url: req.url,
                            statusCode: res.statusCode,
                            durationMs,
                            startTime,
                            endTime
                        });

                        // Store in context
                        context.rootSpan = rootSpan;
                        context.statusCode = res.statusCode;
                        context.durationMs = durationMs;
                        context.endTime = endTime;

                        // Complete and send trace
                        setImmediate(() => {
                            const { completeTrace } = require('../sender');
                            completeTrace();
                        });

                        return originalEnd.apply(this, args);
                    };

                    // Call original listener
                    listener.call(this, req, res);
                });
            });

            return server;
        };
    });

    console.log('[APM] HTTP server instrumentation enabled (OTLP + W3C Trace Context)');
}

module.exports = { instrumentHttp, generateTraceparent, parseTraceparent };

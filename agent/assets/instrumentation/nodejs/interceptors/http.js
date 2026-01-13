const shimmer = require('../utils/shimmer');
const { setTraceContext, getTraceContext } = require('../context');
const { generateTraceId, generateSpanId, createHttpSpan } = require('../tracer');

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
                    const traceId = generateTraceId();
                    const spanId = generateSpanId();
                    const startTime = new Date();

                    // Set trace context
                    const context = setTraceContext(traceId, spanId, {
                        endpoint: `${req.method} ${normalizeEndpoint(req.url)}`
                    });

                    // Wrap res.end to capture response
                    const originalEnd = res.end;
                    res.end = function (...args) {
                        const endTime = new Date();
                        const durationMs = endTime - startTime;

                        // Create root HTTP span
                        const rootSpan = createHttpSpan({
                            spanId,
                            traceId,
                            parentSpanId: null,
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

    console.log('[APM] HTTP server instrumentation enabled');
}

module.exports = { instrumentHttp };

const shimmer = require('shimmer');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createExternalSpan } = require('../tracer');

/**
 * Instrument HTTP client
 */
function instrumentHttpClient() {
    const http = require('http');
    const https = require('https');

    [http, https].forEach(module => {
        shimmer.wrap(module, 'request', function (original) {
            return function (...args) {
                const context = getTraceContext();
                if (!context) {
                    return original.apply(this, args);
                }

                const startTime = new Date();
                const spanId = generateSpanId();

                // Parse request options
                let options = args[0];
                if (typeof options === 'string') {
                    options = new URL(options);
                }

                const host = options.hostname || options.host || 'unknown';
                const method = options.method || 'GET';
                const path = options.path || '/';

                const req = original.apply(this, args);

                // Capture response
                req.on('response', (res) => {
                    const endTime = new Date();
                    const durationMs = endTime - startTime;

                    const span = createExternalSpan({
                        spanId,
                        traceId: context.traceId,
                        parentSpanId: context.spanId,
                        host,
                        method,
                        url: `${host}${path}`,
                        statusCode: res.statusCode,
                        durationMs,
                        startTime,
                        endTime
                    });

                    addSpan(span);
                });

                // Handle errors
                req.on('error', (err) => {
                    const endTime = new Date();
                    const durationMs = endTime - startTime;

                    const span = createExternalSpan({
                        spanId,
                        traceId: context.traceId,
                        parentSpanId: context.spanId,
                        host,
                        method,
                        url: `${host}${path}`,
                        statusCode: 0,
                        durationMs,
                        startTime,
                        endTime
                    });

                    span.metadata.error = true;
                    span.metadata.error_message = err.message;

                    addSpan(span);
                });

                return req;
            };
        });
    });

    console.log('[APM] HTTP client instrumentation enabled');
}

module.exports = { instrumentHttpClient };

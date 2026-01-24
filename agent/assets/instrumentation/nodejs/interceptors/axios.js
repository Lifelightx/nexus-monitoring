const shimmer = require('../utils/shimmer');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createOTLPExternalSpan } = require('../tracer');
const { generateTraceparent } = require('./http');

/**
 * Instrument Axios
 */
function instrumentAxios() {
    try {
        const axios = require('axios');

        // Intercept axios requests
        axios.interceptors.request.use(
            (config) => {
                const context = getTraceContext();
                if (context) {
                    config._apmStartTime = Date.now();
                    config._apmSpanId = generateSpanId();
                    config._apmContext = context;

                    // Add W3C Trace Context header for distributed tracing
                    const traceparent = generateTraceparent(
                        context.traceId,
                        config._apmSpanId,
                        true // sampled
                    );
                    config.headers['traceparent'] = traceparent;

                    console.log(`[APM] Propagating trace ${context.traceId.substring(0, 8)}... via axios request to ${config.url}`);
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Intercept axios responses
        axios.interceptors.response.use(
            (response) => {
                const config = response.config;
                if (config._apmContext && config._apmStartTime) {
                    const endTime = Date.now();
                    const durationMs = endTime - config._apmStartTime;

                    const url = new URL(config.url, config.baseURL || 'http://localhost');

                    const span = createOTLPExternalSpan({
                        spanId: config._apmSpanId,
                        traceId: config._apmContext.traceId,
                        parentSpanId: config._apmContext.spanId,
                        host: url.hostname,
                        method: (config.method || 'GET').toUpperCase(),
                        url: url.href,
                        statusCode: response.status,
                        durationMs,
                        startTime: new Date(config._apmStartTime),
                        endTime: new Date(endTime)
                    });

                    addSpan(span);
                }
                return response;
            },
            (error) => {
                const config = error.config;
                if (config && config._apmContext && config._apmStartTime) {
                    const endTime = Date.now();
                    const durationMs = endTime - config._apmStartTime;

                    const url = new URL(config.url, config.baseURL || 'http://localhost');

                    const span = createOTLPExternalSpan({
                        spanId: config._apmSpanId,
                        traceId: config._apmContext.traceId,
                        parentSpanId: config._apmContext.spanId,
                        host: url.hostname,
                        method: (config.method || 'GET').toUpperCase(),
                        url: url.href,
                        statusCode: error.response?.status || 0,
                        durationMs,
                        startTime: new Date(config._apmStartTime),
                        endTime: new Date(endTime)
                    });

                    // Mark as error in OTLP span
                    span.status = {
                        code: 2, // STATUS_CODE_ERROR
                        message: error.message
                    };

                    // Add error attribute
                    if (!span.attributes) span.attributes = [];
                    span.attributes.push({
                        key: 'error.message',
                        value: { stringValue: error.message }
                    });

                    addSpan(span);
                }
                return Promise.reject(error);
            }
        );

        console.log('[APM] Axios instrumentation enabled (OTLP + W3C Trace Context)');
    } catch (err) {
        console.log('[APM] Axios not installed, skipping instrumentation');
    }
}

module.exports = { instrumentAxios };

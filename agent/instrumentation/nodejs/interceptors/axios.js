const shimmer = require('shimmer');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createExternalSpan } = require('../tracer');

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

                    const span = createExternalSpan({
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

                    const span = createExternalSpan({
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

                    span.metadata.error = true;
                    span.metadata.error_message = error.message;

                    addSpan(span);
                }
                return Promise.reject(error);
            }
        );

        console.log('[APM] Axios instrumentation enabled');
    } catch (err) {
        console.log('[APM] Axios not installed, skipping instrumentation');
    }
}

module.exports = { instrumentAxios };

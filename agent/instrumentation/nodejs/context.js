const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Initialize context storage
 */
function initContext() {
    console.log('[APM] AsyncLocalStorage context initialized');
}

/**
 * Set trace context for current async execution
 */
function setTraceContext(traceId, spanId, metadata = {}) {
    const context = {
        traceId,
        spanId,
        spans: [],
        metadata,
        startTime: new Date()
    };
    asyncLocalStorage.enterWith(context);
    return context;
}

/**
 * Get current trace context
 */
function getTraceContext() {
    return asyncLocalStorage.getStore();
}

/**
 * Add span to current trace context
 */
function addSpan(span) {
    const context = getTraceContext();
    if (context) {
        context.spans.push(span);
    }
}

/**
 * Get all spans from current trace context
 */
function getSpans() {
    const context = getTraceContext();
    return context ? context.spans : [];
}

/**
 * Complete current trace and return trace data
 */
function completeTrace() {
    const context = getTraceContext();
    if (!context) return null;

    return {
        traceId: context.traceId,
        rootSpan: context.rootSpan,
        spans: context.spans,
        metadata: context.metadata,
        statusCode: context.statusCode,
        durationMs: context.durationMs,
        endTime: context.endTime
    };
}

/**
 * Clear trace context
 */
function clearContext() {
    asyncLocalStorage.disable();
}

module.exports = {
    initContext,
    setTraceContext,
    getTraceContext,
    addSpan,
    getSpans,
    completeTrace,
    clearContext
};

const { randomUUID } = require('crypto');

/**
 * Generate unique trace ID
 */
function generateTraceId() {
    return randomUUID();
}

/**
 * Generate unique span ID
 */
function generateSpanId() {
    return randomUUID();
}

/**
 * Create trace object
 */
function createTrace({
    traceId,
    serviceName,
    serviceId = null,
    endpoint,
    durationMs,
    statusCode,
    error = false,
    timestamp,
    spans = [],
    metadata = {}
}) {
    return {
        trace_id: traceId,
        service_name: serviceName,
        service_id: serviceId,
        endpoint,
        duration_ms: durationMs,
        status_code: statusCode,
        error,
        timestamp,
        spans,
        metadata
    };
}

/**
 * Create HTTP span
 */
function createHttpSpan({
    spanId,
    traceId,
    parentSpanId = null,
    method,
    url,
    statusCode,
    durationMs,
    startTime,
    endTime
}) {
    return {
        span_id: spanId,
        trace_id: traceId,
        parent_span_id: parentSpanId,
        type: 'http',
        name: `${method} ${url}`,
        duration_ms: durationMs,
        start_time: startTime,
        end_time: endTime,
        metadata: {
            http_method: method,
            http_url: url,
            http_status_code: statusCode,
            error: statusCode >= 400
        }
    };
}

/**
 * Create DB span
 */
function createDbSpan({
    spanId,
    traceId,
    parentSpanId,
    dbType,
    operation,
    collection,
    table,
    query,
    durationMs,
    startTime,
    endTime
}) {
    return {
        span_id: spanId,
        trace_id: traceId,
        parent_span_id: parentSpanId,
        type: 'db',
        name: `${dbType}: ${operation} ${collection || table}`,
        duration_ms: durationMs,
        start_time: startTime,
        end_time: endTime,
        metadata: {
            db_type: dbType,
            db_operation: operation,
            db_collection: collection,
            db_table: table,
            db_query: sanitizeQuery(query)
        }
    };
}

/**
 * Create external HTTP span
 */
function createExternalSpan({
    spanId,
    traceId,
    parentSpanId,
    host,
    method,
    url,
    statusCode,
    durationMs,
    startTime,
    endTime
}) {
    return {
        span_id: spanId,
        trace_id: traceId,
        parent_span_id: parentSpanId,
        type: 'external',
        name: `${method} ${host}`,
        duration_ms: durationMs,
        start_time: startTime,
        end_time: endTime,
        metadata: {
            external_host: host,
            external_method: method,
            external_url: url,
            external_status_code: statusCode,
            error: statusCode >= 400
        }
    };
}

/**
 * Sanitize query for storage
 */
function sanitizeQuery(query) {
    if (!query) return '';

    let sanitized = String(query);

    // Limit length
    if (sanitized.length > 1000) {
        sanitized = sanitized.substring(0, 1000) + '...';
    }

    // Remove sensitive data patterns
    sanitized = sanitized.replace(/password\s*=\s*['"][^'"]*['"]/gi, 'password=***');
    sanitized = sanitized.replace(/token\s*=\s*['"][^'"]*['"]/gi, 'token=***');

    return sanitized;
}

module.exports = {
    generateTraceId,
    generateSpanId,
    createTrace,
    createHttpSpan,
    createDbSpan,
    createExternalSpan,
    sanitizeQuery
};

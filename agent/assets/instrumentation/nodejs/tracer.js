const { randomBytes } = require('crypto');

/**
 * Generate OTLP-compliant trace ID (32 hex characters / 16 bytes)
 * OTLP requires trace IDs as hex strings
 */
function generateTraceId() {
    return randomBytes(16).toString('hex');
}

/**
 * Generate OTLP-compliant span ID (16 hex characters / 8 bytes)
 * OTLP requires span IDs as hex strings
 */
function generateSpanId() {
    return randomBytes(8).toString('hex');
}

/**
 * Convert nanoseconds timestamp from Date
 * OTLP uses nanoseconds since epoch
 */
function dateToNanos(date) {
    const millis = date.getTime();
    return (BigInt(millis) * BigInt(1000000)).toString();
}

/**
 * Create OTLP Attribute
 */
function createAttribute(key, value) {
    if (typeof value === 'string') {
        return { key, value: { stringValue: value } };
    } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return { key, value: { intValue: value.toString() } };
        }
        return { key, value: { doubleValue: value } };
    } else if (typeof value === 'boolean') {
        return { key, value: { boolValue: value } };
    }
    return { key, value: { stringValue: String(value) } };
}

/**
 * Convert HTTP status code to OTLP span status
 */
function getSpanStatus(statusCode) {
    if (statusCode >= 500) {
        return {
            code: 2, // STATUS_CODE_ERROR
            message: `HTTP ${statusCode}`
        };
    } else if (statusCode >= 400) {
        return {
            code: 2, // STATUS_CODE_ERROR  
            message: `HTTP ${statusCode}`
        };
    }
    return {
        code: 1 // STATUS_CODE_OK
    };
}

/**
 * Create OTLP HTTP span
 */
function createOTLPHttpSpan({
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
    const attributes = [
        createAttribute('http.method', method),
        createAttribute('http.url', url),
        createAttribute('http.status_code', statusCode),
        createAttribute('http.target', url),
        createAttribute('http.scheme', url.startsWith('https') ? 'https' : 'http')
    ];

    if (statusCode >= 400) {
        attributes.push(createAttribute('error', true));
    }

    const span = {
        traceId: traceId,
        spanId: spanId,
        name: `${method} ${url}`,
        kind: 2, // SPAN_KIND_SERVER
        startTimeUnixNano: dateToNanos(startTime),
        endTimeUnixNano: dateToNanos(endTime),
        attributes: attributes,
        status: getSpanStatus(statusCode)
    };

    if (parentSpanId) {
        span.parentSpanId = parentSpanId;
    }

    return span;
}

/**
 * Create OTLP DB span
 */
function createOTLPDbSpan({
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
    const attributes = [
        createAttribute('db.system', dbType),
        createAttribute('db.operation', operation),
        createAttribute('db.statement', sanitizeQuery(query))
    ];

    if (collection) {
        attributes.push(createAttribute('db.mongodb.collection', collection));
    }
    if (table) {
        attributes.push(createAttribute('db.sql.table', table));
    }

    const span = {
        traceId: traceId,
        spanId: spanId,
        parentSpanId: parentSpanId,
        name: `${dbType}: ${operation} ${collection || table}`,
        kind: 3, // SPAN_KIND_CLIENT
        startTimeUnixNano: dateToNanos(startTime),
        endTimeUnixNano: dateToNanos(endTime),
        attributes: attributes,
        status: { code: 1 } // STATUS_CODE_OK
    };

    return span;
}

/**
 * Create OTLP External HTTP span
 */
function createOTLPExternalSpan({
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
    const attributes = [
        createAttribute('http.method', method),
        createAttribute('http.url', url),
        createAttribute('http.status_code', statusCode),
        createAttribute('net.peer.name', host),
        createAttribute('span.kind', 'client')
    ];

    if (statusCode >= 400) {
        attributes.push(createAttribute('error', true));
    }

    const span = {
        traceId: traceId,
        spanId: spanId,
        parentSpanId: parentSpanId,
        name: `${method} ${host}`,
        kind: 3, // SPAN_KIND_CLIENT
        startTimeUnixNano: dateToNanos(startTime),
        endTimeUnixNano: dateToNanos(endTime),
        attributes: attributes,
        status: getSpanStatus(statusCode)
    };

    return span;
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
    sanitized = sanitized.replace(/password\s*=\s*['""][^'""]*['"]/gi, 'password=***');
    sanitized = sanitized.replace(/token\s*=\s*['""][^'""]*['"]/gi, 'token=***');

    return sanitized;
}

/**
 * Legacy functions for backward compatibility
 * These create the old custom format but will be deprecated
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

module.exports = {
    // OTLP-compliant functions
    generateTraceId,
    generateSpanId,
    createOTLPHttpSpan,
    createOTLPDbSpan,
    createOTLPExternalSpan,
    createAttribute,
    dateToNanos,

    // Legacy functions (backward compatibility)
    createTrace,
    createHttpSpan,
    createDbSpan,
    createExternalSpan,
    sanitizeQuery
};

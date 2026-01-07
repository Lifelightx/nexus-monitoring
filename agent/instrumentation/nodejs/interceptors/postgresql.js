const shimmer = require('shimmer');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createDbSpan } = require('../tracer');

/**
 * Extract table name and operation from SQL query
 */
function parseSql(sql) {
    if (!sql) return { operation: 'unknown', table: 'unknown' };

    const sqlUpper = sql.trim().toUpperCase();
    let operation = 'unknown';
    let table = 'unknown';

    // Detect operation
    if (sqlUpper.startsWith('SELECT')) operation = 'SELECT';
    else if (sqlUpper.startsWith('INSERT')) operation = 'INSERT';
    else if (sqlUpper.startsWith('UPDATE')) operation = 'UPDATE';
    else if (sqlUpper.startsWith('DELETE')) operation = 'DELETE';

    // Extract table name
    const fromMatch = sql.match(/FROM\s+([^\s,;]+)/i);
    const intoMatch = sql.match(/INTO\s+([^\s(,;]+)/i);
    const updateMatch = sql.match(/UPDATE\s+([^\s,;]+)/i);

    if (fromMatch) table = fromMatch[1];
    else if (intoMatch) table = intoMatch[1];
    else if (updateMatch) table = updateMatch[1];

    return { operation, table };
}

/**
 * Instrument PostgreSQL
 */
function instrumentPostgreSQL() {
    try {
        const pg = require('pg');
        const Client = pg.Client;

        shimmer.wrap(Client.prototype, 'query', function (original) {
            return function (...args) {
                const context = getTraceContext();
                if (!context) {
                    return original.apply(this, args);
                }

                const startTime = new Date();
                const spanId = generateSpanId();

                // Parse query
                let queryText = '';
                if (typeof args[0] === 'string') {
                    queryText = args[0];
                } else if (args[0] && args[0].text) {
                    queryText = args[0].text;
                }

                const { operation, table } = parseSql(queryText);

                const result = original.apply(this, args);

                // Handle promise-based results
                if (result && typeof result.then === 'function') {
                    return result.then(
                        (data) => {
                            const endTime = new Date();
                            const durationMs = endTime - startTime;

                            const span = createDbSpan({
                                spanId,
                                traceId: context.traceId,
                                parentSpanId: context.spanId,
                                dbType: 'postgresql',
                                operation,
                                collection: null,
                                table,
                                query: queryText,
                                durationMs,
                                startTime,
                                endTime
                            });

                            addSpan(span);
                            return data;
                        },
                        (err) => {
                            const endTime = new Date();
                            const durationMs = endTime - startTime;

                            const span = createDbSpan({
                                spanId,
                                traceId: context.traceId,
                                parentSpanId: context.spanId,
                                dbType: 'postgresql',
                                operation,
                                collection: null,
                                table,
                                query: queryText,
                                durationMs,
                                startTime,
                                endTime
                            });

                            span.metadata.error = true;
                            span.metadata.error_message = err.message;

                            addSpan(span);
                            throw err;
                        }
                    );
                }

                return result;
            };
        });

        console.log('[APM] PostgreSQL (pg) instrumentation enabled');
    } catch (err) {
        console.log('[APM] PostgreSQL (pg) not installed, skipping instrumentation');
    }
}

module.exports = { instrumentPostgreSQL };

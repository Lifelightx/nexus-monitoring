const shimmer = require('../utils/shimmer');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createDbSpan } = require('../tracer');

/**
 * Instrument MongoDB
 */
function instrumentMongoDB() {
    try {
        // Try mongoose first (more common)
        let mongodb;
        try {
            const mongoose = require('mongoose');
            mongodb = mongoose.mongo || require('mongodb');
        } catch {
            mongodb = require('mongodb');
        }

        const Collection = mongodb.Collection;

        const methods = [
            'find', 'findOne', 'insertOne', 'insertMany',
            'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
            'aggregate', 'countDocuments', 'distinct'
        ];

        methods.forEach(method => {
            if (Collection.prototype[method]) {
                shimmer.wrap(Collection.prototype, method, function (original) {
                    return function (...args) {
                        const context = getTraceContext();
                        if (!context) {
                            return original.apply(this, args);
                        }

                        const startTime = new Date();
                        const spanId = generateSpanId();
                        const collectionName = this.collectionName || 'unknown';
                        const query = args[0] || {};

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
                                        dbType: 'mongodb',
                                        operation: method,
                                        collection: collectionName,
                                        table: null,
                                        query: JSON.stringify(query),
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
                                        dbType: 'mongodb',
                                        operation: method,
                                        collection: collectionName,
                                        table: null,
                                        query: JSON.stringify(query),
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

                        // Handle cursor-based results (find)
                        if (result && typeof result.toArray === 'function') {
                            const originalToArray = result.toArray;
                            result.toArray = function () {
                                return originalToArray.apply(this, arguments).then(
                                    (data) => {
                                        const endTime = new Date();
                                        const durationMs = endTime - startTime;

                                        const span = createDbSpan({
                                            spanId,
                                            traceId: context.traceId,
                                            parentSpanId: context.spanId,
                                            dbType: 'mongodb',
                                            operation: method,
                                            collection: collectionName,
                                            table: null,
                                            query: JSON.stringify(query),
                                            durationMs,
                                            startTime,
                                            endTime
                                        });

                                        addSpan(span);
                                        return data;
                                    }
                                );
                            };
                        }

                        return result;
                    };
                });
            }
        });

        console.log('[APM] MongoDB instrumentation enabled');
    } catch (err) {
        console.log('[APM] MongoDB not installed, skipping instrumentation');
    }
}

module.exports = { instrumentMongoDB };

const shimmer = require('shimmer');
const Module = require('module');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createDbSpan } = require('../tracer');

let isInstrumented = false;

/**
 * Instrument Mongoose Model methods
 */
function wrapMongooseModel(mongoose) {
    if (isInstrumented) return;
    isInstrumented = true;

    const Model = mongoose.Model;

    // Instead of wrapping query methods, wrap Query.prototype.exec
    // This allows query chaining to work properly
    const Query = mongoose.Query;

    if (Query.prototype.exec) {
        shimmer.wrap(Query.prototype, 'exec', function (original) {
            return function (callback) {
                const context = getTraceContext();
                if (!context) {
                    return original.call(this, callback);
                }

                const startTime = new Date();
                const spanId = generateSpanId();
                const collectionName = this.model?.collection?.name || this.mongooseCollection?.name || 'unknown';
                const operation = this.op || 'query';
                const query = this.getQuery ? this.getQuery() : {};

                // Call original exec
                const result = original.call(this, callback);

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
                                operation: operation,
                                collection: collectionName,
                                table: null,
                                query: JSON.stringify(query).substring(0, 500),
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
                                operation: operation,
                                collection: collectionName,
                                table: null,
                                query: JSON.stringify(query).substring(0, 500),
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
    }

    // Wrap document methods (instance methods like save())
    const documentMethods = ['save'];

    documentMethods.forEach(method => {
        if (Model.prototype[method]) {
            shimmer.wrap(Model.prototype, method, function (original) {
                return function (...args) {
                    const context = getTraceContext();
                    if (!context) {
                        return original.apply(this, args);
                    }

                    const startTime = new Date();
                    const spanId = generateSpanId();
                    const collectionName = this.collection?.name || this.constructor.modelName || 'unknown';

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
                                    query: 'document.save()',
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
                                    query: 'document.save()',
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
        }
    });

    console.log('[APM] Mongoose instrumentation enabled');
}

/**
 * Instrument Mongoose (lazy loading via Module._load hook)
 */
function instrumentMongoose() {
    const originalLoad = Module._load;

    Module._load = function (request, parent) {
        const exports = originalLoad.apply(this, arguments);

        // Intercept mongoose when it's loaded
        if (request === 'mongoose' && exports && exports.Model) {
            wrapMongooseModel(exports);
        }

        return exports;
    };
}

module.exports = { instrumentMongoose };

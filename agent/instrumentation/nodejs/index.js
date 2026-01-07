const config = require('../config');
const { initContext } = require('./context');
const { instrumentHttp } = require('./interceptors/http');
const { instrumentHttpClient } = require('./interceptors/httpClient');
const { instrumentAxios } = require('./interceptors/axios');
const { instrumentMongoDB } = require('./interceptors/mongodb');
const { instrumentMongoose } = require('./interceptors/mongoose');
const { instrumentPostgreSQL } = require('./interceptors/postgresql');
const { startSender, stopSender } = require('./sender');

let isInitialized = false;

/**
 * Initialize Node.js auto-instrumentation
 */
function initialize() {
    if (isInitialized) return;
    if (!config.nodejs.enabled) {
        console.log('[APM] Node.js instrumentation disabled');
        return;
    }

    try {
        console.log('[APM] Initializing Node.js auto-instrumentation...');

        // Initialize context
        initContext();

        // Instrument modules
        instrumentHttp();
        instrumentHttpClient();
        instrumentAxios();  // Add axios interceptor
        instrumentMongoose();  // Mongoose (higher priority)
        instrumentMongoDB();   // Fallback to native driver
        instrumentPostgreSQL();

        // Start trace sender
        startSender();

        isInitialized = true;
        console.log('[APM] Node.js auto-instrumentation initialized successfully');
        console.log('[APM] Sampling rate:', config.nodejs.sampling.rate * 100 + '%');
    } catch (error) {
        console.error('[APM] Failed to initialize instrumentation:', error);
    }
}

/**
 * Shutdown instrumentation
 */
function shutdown() {
    if (!isInitialized) return;

    console.log('[APM] Shutting down instrumentation...');
    stopSender();
    isInitialized = false;
    console.log('[APM] Instrumentation shutdown complete');
}

// Auto-initialize when loaded via --require
initialize();

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
    initialize,
    shutdown
};

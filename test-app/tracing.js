/* tracing.js */
'use strict';

const process = require('process');
const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
// const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http'); // Alternative if gRPC fails
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configure the SDK
const sdk = new opentelemetry.NodeSDK({
    resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'node-test-service',
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.SERVICE_INSTANCE_ID || 'instance-1',
    }),
    traceExporter: new OTLPTraceExporter({
        // Default url is localhost:4317 for gRPC
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:30317',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize the SDK and start it
sdk.start();

console.log('✅ OpenTelemetry SDK initialized');

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});

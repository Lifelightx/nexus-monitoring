const { Kafka, logLevel } = require('kafkajs');

class KafkaProducer {
    constructor() {
        this.kafka = new Kafka({
            clientId: 'nexus-backend',
            brokers: [process.env.KAFKA_BROKERS || 'localhost:30092'],
            logLevel: logLevel.ERROR,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 30000
        });

        this.isConnected = false;
        this.topics = {
            traces: process.env.KAFKA_TOPIC_TRACES || 'traces',
            metrics: process.env.KAFKA_TOPIC_METRICS || 'otel_metrics',
            logs: process.env.KAFKA_TOPIC_LOGS || 'otel_logs'
        };
    }

    async connect() {
        if (this.isConnected) {
            return;
        }

        try {
            await this.producer.connect();
            this.isConnected = true;
            console.log('[Kafka] ✅ Producer connected successfully');
        } catch (error) {
            console.error('[Kafka] ❌ Failed to connect producer:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            await this.producer.disconnect();
            this.isConnected = false;
            console.log('[Kafka] Producer disconnected');
        } catch (error) {
            console.error('[Kafka] Error disconnecting producer:', error.message);
        }
    }

    /**
     * Send OTLP traces to Kafka
     * @param {Object} tracesPayload - OTLP traces payload (JSON or Protobuf)
     * @param {Object} metadata - Optional metadata (service name, etc.)
     */
    async sendTraces(tracesPayload, metadata = {}) {
        return this._sendMessage(this.topics.traces, tracesPayload, metadata);
    }

    /**
     * Send OTLP metrics to Kafka
     * @param {Object} metricsPayload - OTLP metrics payload (JSON or Protobuf)
     * @param {Object} metadata - Optional metadata
     */
    async sendMetrics(metricsPayload, metadata = {}) {
        return this._sendMessage(this.topics.metrics, metricsPayload, metadata);
    }

    /**
     * Send OTLP logs to Kafka
     * @param {Object} logsPayload - OTLP logs payload (JSON or Protobuf)
     * @param {Object} metadata - Optional metadata
     */
    async sendLogs(logsPayload, metadata = {}) {
        return this._sendMessage(this.topics.logs, logsPayload, metadata);
    }

    /**
     * Internal method to send message to Kafka
     * @private
     */
    async _sendMessage(topic, payload, metadata) {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            // Convert all metadata values to strings for Kafka headers
            const headers = {
                'content-type': 'application/json',
                'timestamp': Date.now().toString()
            };

            // Add metadata as headers, ensuring all values are strings
            for (const [key, value] of Object.entries(metadata)) {
                headers[key] = value != null ? String(value) : '';
            }

            const message = {
                key: metadata.serviceName || metadata.traceId || Date.now().toString(),
                value: JSON.stringify(payload),
                headers
            };

            const result = await this.producer.send({
                topic,
                messages: [message],
                compression: 1 // GZIP compression
            });

            console.log(`[Kafka] ✅ Sent message to topic '${topic}':`, {
                partition: result[0].partition,
                offset: result[0].offset
            });

            return result;
        } catch (error) {
            console.error(`[Kafka] ❌ Failed to send message to topic '${topic}':`, error.message);
            throw error;
        }
    }

    /**
     * Send batch of messages to a topic
     * @param {string} topic - Topic name
     * @param {Array} payloads - Array of payloads
     */
    async sendBatch(topic, payloads) {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const messages = payloads.map((payload, index) => ({
                key: payload.metadata?.serviceName || `batch-${index}`,
                value: JSON.stringify(payload.data),
                headers: {
                    'content-type': 'application/json',
                    'timestamp': Date.now().toString(),
                    ...(payload.metadata || {})
                }
            }));

            const result = await this.producer.send({
                topic,
                messages,
                compression: 1
            });

            console.log(`[Kafka] ✅ Sent ${messages.length} messages to topic '${topic}'`);
            return result;
        } catch (error) {
            console.error(`[Kafka] ❌ Failed to send batch to topic '${topic}':`, error.message);
            throw error;
        }
    }
}

// Singleton instance
let kafkaProducerInstance = null;

function getKafkaProducer() {
    if (!kafkaProducerInstance) {
        kafkaProducerInstance = new KafkaProducer();
    }
    return kafkaProducerInstance;
}

module.exports = {
    KafkaProducer,
    getKafkaProducer
};

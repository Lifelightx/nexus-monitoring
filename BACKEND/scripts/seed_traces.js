require('dotenv').config();
const { getClickHouseClient } = require('../src/services/clickhouseClient');
const { v4: uuidv4 } = require('uuid');

const clickhouse = getClickHouseClient();

const SERVICES = ['frontend-service', 'payment-service', 'user-service'];
const OPERATIONS = ['GET /api/checkout', 'POST /api/pay', 'GET /api/user/:id'];

function generateTraceId() {
    return uuidv4().replace(/-/g, '');
}

function generateSpanId() {
    return uuidv4().replace(/-/g, '').substring(0, 16);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function seedData() {
    console.log('🌱 Seeding ClickHouse with demo traces...');

    const traces = [];
    const spans = [];
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
        const traceId = generateTraceId();
        const rootSpanId = generateSpanId();
        const childSpanId1 = generateSpanId();
        const childSpanId2 = generateSpanId();

        const timestamp = now - Math.floor(Math.random() * 3600000); // Past 1 hour
        const duration = Math.floor(Math.random() * 500) + 50;

        // Root Span (Frontend)
        traces.push({
            trace_id: traceId,
            service_name: 'frontend-service',
            endpoint: 'POST /checkout',
            duration_ms: duration,
            status_code: 200,
            error: false,
            timestamp: timestamp,
            span_count: 3
        });

        spans.push({
            span_id: rootSpanId,
            trace_id: traceId,
            parent_span_id: '',
            service_name: 'frontend-service',
            name: 'POST /checkout',
            span_kind: 1, // Server
            start_time: timestamp,
            end_time: timestamp + duration,
            duration_ms: duration,
            status_code: 1, // OK
            status_message: 'OK'
        });

        // Child Span 1 (Payment)
        const d1 = Math.floor(duration * 0.4);
        traces.push({
            trace_id: traceId,
            service_name: 'payment-service',
            endpoint: 'POST /process',
            duration_ms: d1,
            status_code: 200,
            error: false,
            timestamp: timestamp + 10,
            span_count: 1
        });

        spans.push({
            span_id: childSpanId1,
            trace_id: traceId,
            parent_span_id: rootSpanId,
            service_name: 'payment-service',
            name: 'process_payment',
            span_kind: 1,
            start_time: timestamp + 10,
            end_time: timestamp + 10 + d1,
            duration_ms: d1,
            status_code: 1,
            status_message: 'OK'
        });

        // Child Span 2 (DB)
        const d2 = Math.floor(duration * 0.3);
        spans.push({
            span_id: childSpanId2,
            trace_id: traceId,
            parent_span_id: childSpanId1,
            service_name: 'payment-service',
            name: 'UPDATE users SET balance = ...',
            span_kind: 3, // Client (DB)
            start_time: timestamp + 20,
            end_time: timestamp + 20 + d2,
            duration_ms: d2,
            status_code: 1,
            db_system: 'postgres',
            db_statement: 'UPDATE users SET balance = ...',
            status_message: 'OK'
        });
    }

    try {
        await clickhouse.insertTraces(traces);
        await clickhouse.insertSpans(spans);
        console.log('✅ Successfully seeded demo data!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to seed data:', error);
        process.exit(1);
    }
}

seedData();

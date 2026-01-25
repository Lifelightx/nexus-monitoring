require('dotenv').config();
const { getClickHouseClient } = require('../src/services/clickhouseClient');
const { v4: uuidv4 } = require('uuid');

const clickhouse = getClickHouseClient();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TRACE_ID = 'dist_test_' + Date.now(); // Unique but readable ID

async function insertDistributedTrace() {
    console.log(`Creating distributed trace: ${TRACE_ID}`);

    const now = Date.now();

    // Spans
    // 1. Frontend: POST /checkout (Root)
    const span1 = {
        span_id: uuidv4().replace(/-/g, '').substring(0, 16),
        trace_id: TRACE_ID,
        parent_span_id: '',
        service_name: 'frontend-service',
        name: 'POST /checkout',
        span_kind: 1, // Server
        start_time: now,
        end_time: now + 500,
        duration_ms: 500,
        status_code: 1,
        status_message: 'OK'
    };

    // 2. Checkout Service: process_order (Child of 1)
    const span2 = {
        span_id: uuidv4().replace(/-/g, '').substring(0, 16),
        trace_id: TRACE_ID,
        parent_span_id: span1.span_id,
        service_name: 'checkout-service',
        name: 'process_order',
        span_kind: 1,
        start_time: now + 50,
        end_time: now + 450,
        duration_ms: 400,
        status_code: 1,
        status_message: 'OK'
    };

    // 3. Payment Service: charge_card (Child of 2)
    const span3 = {
        span_id: uuidv4().replace(/-/g, '').substring(0, 16),
        trace_id: TRACE_ID,
        parent_span_id: span2.span_id,
        service_name: 'payment-service',
        name: 'charge_card',
        span_kind: 1,
        start_time: now + 100,
        end_time: now + 300,
        duration_ms: 200,
        status_code: 1,
        status_message: 'OK'
    };

    // 4. External: Stripe API (Child of 3)
    const span4 = {
        span_id: uuidv4().replace(/-/g, '').substring(0, 16),
        trace_id: TRACE_ID,
        parent_span_id: span3.span_id,
        service_name: 'payment-service',
        name: 'POST api.stripe.com',
        span_kind: 3, // Client
        start_time: now + 120,
        end_time: now + 280,
        duration_ms: 160,
        status_code: 1,
        status_message: 'OK',
        metadata: {
            external_url: 'https://api.stripe.com/v1/charges',
            external_method: 'POST'
        }
    };

    // 5. Database: Update Inventory (Child of 2)
    const span5 = {
        span_id: uuidv4().replace(/-/g, '').substring(0, 16),
        trace_id: TRACE_ID,
        parent_span_id: span2.span_id,
        service_name: 'checkout-service',
        name: 'UPDATE inventory',
        span_kind: 3, // Client (DB)
        start_time: now + 350,
        end_time: now + 400,
        duration_ms: 50,
        status_code: 1,
        status_message: 'OK',
        metadata: {
            db_type: 'postgres',
            db_query: 'UPDATE inventory SET stock = stock - 1 WHERE id = ?'
        }
    };

    const spans = [span1, span2, span3, span4, span5];

    // Trace Summaries (one per service involved seems to be the pattern, or just root)
    // For listing purposes, we usually just need the root trace record or one for each service participation.
    // Let's insert for each service so they appear in Service filtering.
    const traces = [
        {
            trace_id: TRACE_ID,
            service_name: 'frontend-service',
            endpoint: 'POST /checkout',
            duration_ms: 500,
            status_code: 200,
            error: false,
            timestamp: now,
            span_count: 5
        },
        {
            trace_id: TRACE_ID,
            service_name: 'checkout-service',
            endpoint: 'process_order',
            duration_ms: 400,
            status_code: 200,
            error: false,
            timestamp: now + 50,
            span_count: 2
        },
        {
            trace_id: TRACE_ID,
            service_name: 'payment-service',
            endpoint: 'charge_card',
            duration_ms: 200,
            status_code: 200,
            error: false,
            timestamp: now + 100,
            span_count: 2
        }
    ];

    try {
        console.log('Sending traces to ClickHouse...');
        await clickhouse.insertTraces(traces);

        console.log('Sending spans to ClickHouse...');
        // Inspect valid rows
        // console.log(JSON.stringify(spans, null, 2));
        await clickhouse.insertSpans(spans);

        console.log('Waiting for ingestion...');
        await sleep(2000);

        console.log('✅ Distributed trace inserted!');
        console.log(`👉 View here: http://localhost:5173/traces/${TRACE_ID}/details`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

insertDistributedTrace();

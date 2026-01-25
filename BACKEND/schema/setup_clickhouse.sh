#!/bin/bash

# ClickHouse Setup Script for Nexus Monitor
# Executes DDL statements sequentially to avoid multi-statement errors in HTTP API

echo "🚀 Setting up ClickHouse for OTLP traces..."

CLICKHOUSE_HOST=${CLICKHOUSE_HOST:-localhost}
CLICKHOUSE_PORT=${CLICKHOUSE_PORT:-30123} # This script expects the HTTP Port!
CLICKHOUSE_HTTP_PORT=${CLICKHOUSE_HTTP_PORT:-$CLICKHOUSE_PORT}

echo "📍 ClickHouse Limit: http://$CLICKHOUSE_HOST:$CLICKHOUSE_HTTP_PORT"

# Helper function to run query
run_query() {
    local query="$1"
    local msg="$2"
    
    echo -n "👉 $msg ... "
    response=$(curl -s -X POST "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_HTTP_PORT}/" --data-binary "$query")
    
    if [[ -z "$response" ]]; then
        echo "✅ OK"
    else
        echo "❌ Error"
        echo "   Response: $response"
        # Don't exit on error, as tables might already exist
    fi
}

# 1. Create Database
run_query "CREATE DATABASE IF NOT EXISTS otel" "Creating 'otel' database"

# 2. Create Traces Table
query_traces="CREATE TABLE IF NOT EXISTS otel.traces (
    trace_id String,
    service_name String,
    service_instance_id String,
    endpoint String,
    duration_ms Float64,
    status_code UInt16,
    error UInt8,
    timestamp DateTime64(3),
    agent_id String,
    span_count UInt32,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_timestamp timestamp TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (service_name, timestamp, trace_id)
TTL timestamp + INTERVAL 30 DAY"
run_query "$query_traces" "Creating 'otel.traces' table"

# 3. Create Spans Table
query_spans="CREATE TABLE IF NOT EXISTS otel.spans (
    span_id String,
    trace_id String,
    parent_span_id String,
    service_name String,
    span_name String,
    span_kind UInt8,
    start_time DateTime64(9),
    end_time DateTime64(9),
    duration_ms Float64,
    status_code UInt8,
    status_message String,
    http_method String,
    http_url String,
    http_status_code UInt16,
    db_system String,
    db_operation String,
    db_statement String,
    db_collection String,
    db_table String,
    net_peer_name String,
    external_url String,
    external_method String,
    external_status_code UInt16,
    error UInt8,
    error_message String,
    INDEX idx_span_id span_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_start_time start_time TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (service_name, start_time, trace_id, span_id)
TTL start_time + INTERVAL 30 DAY"
run_query "$query_spans" "Creating 'otel.spans' table"

echo ""
echo "✅ ClickHouse Schema setup complete!"
echo "Skipped Materialized Views to allow direct raw querying for APM metrics."

-- ClickHouse Schema for OTLP Traces and Spans
-- Create database
CREATE DATABASE IF NOT EXISTS otel;

-- Traces Table
CREATE TABLE IF NOT EXISTS otel.traces (
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
TTL timestamp + INTERVAL 30 DAY;

-- Spans Table
CREATE TABLE IF NOT EXISTS otel.spans (
    span_id String,
    trace_id String,
    parent_span_id String,
    service_name String,
    span_name String,
    span_kind UInt8,  -- 0=UNSPECIFIED, 1=INTERNAL, 2=SERVER, 3=CLIENT, 4=PRODUCER, 5=CONSUMER
    start_time DateTime64(9),  -- Nanosecond precision
    end_time DateTime64(9),
    duration_ms Float64,
    status_code UInt8,  -- 0=UNSET, 1=OK, 2=ERROR
    status_message String,
    
    -- HTTP attributes
    http_method String,
    http_url String,
    http_status_code UInt16,
    
    -- DB attributes
    db_system String,
    db_operation String,
    db_statement String,
    db_collection String,
    db_table String,
    
    -- External/Network attributes
    net_peer_name String,
    external_url String,
    external_method String,
    external_status_code UInt16,
    
    -- Error tracking
    error UInt8,
    error_message String,
    
    INDEX idx_span_id span_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_start_time start_time TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (service_name, start_time, trace_id, span_id)
TTL start_time + INTERVAL 30 DAY;

-- Materialized View for Service Stats
CREATE MATERIALIZED VIEW IF NOT EXISTS otel.service_stats_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (service_name, endpoint, toStartOfHour(timestamp))
AS SELECT
    service_name,
    endpoint,
    toStartOfHour(timestamp) as timestamp,
    count() as request_count,
    sum(error) as error_count,
    avg(duration_ms) as avg_duration_ms,
    quantile(0.50)(duration_ms) as p50_duration_ms,
    quantile(0.95)(duration_ms) as p95_duration_ms,
    quantile(0.99)(duration_ms) as p99_duration_ms
FROM otel.traces
GROUP BY service_name, endpoint, toStartOfHour(timestamp);

-- Materialized View for Trace Span Relationships
CREATE MATERIALIZED VIEW IF NOT EXISTS otel.span_relationships_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (trace_id, parent_span_id, span_id)
AS SELECT
    trace_id,
    parent_span_id,
    span_id,
    service_name,
    span_name,
    span_kind,
    toStartOfHour(start_time) as start_time,
    count() as call_count
FROM otel.spans
WHERE parent_span_id != ''
GROUP BY trace_id, parent_span_id, span_id, service_name, span_name, span_kind, toStartOfHour(start_time);

-- Standard OpenTelemetry Protocol (OTLP) Schema for ClickHouse
-- Compatible with OTEL Collector ClickHouse Exporter
-- Auto-initializes on ClickHouse container startup

CREATE DATABASE IF NOT EXISTS otel;

-- OTLP Traces Table (Standard Format)
CREATE TABLE IF NOT EXISTS otel.otel_traces (
    Timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    ParentSpanId String CODEC(ZSTD(1)),
    TraceState String CODEC(ZSTD(1)),
    SpanName LowCardinality(String) CODEC(ZSTD(1)),
    SpanKind LowCardinality(String) CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion String CODEC(ZSTD(1)),
    SpanAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    Duration Int64 CODEC(ZSTD(1)),
    StatusCode LowCardinality(String) CODEC(ZSTD(1)),
    StatusMessage String CODEC(ZSTD(1)),
    Events Nested (
        Timestamp DateTime64(9),
        Name LowCardinality(String),
        Attributes Map(LowCardinality(String), String)
    ) CODEC(ZSTD(1)),
    Links Nested (
        TraceId String,
        SpanId String,
        TraceState String,
        Attributes Map(LowCardinality(String), String)
    ) CODEC(ZSTD(1)),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_service_name ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_span_name SpanName TYPE bloom_filter(0.01) GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SpanName, toUnixTimestamp(Timestamp), TraceId)
TTL toDateTime(Timestamp) + toIntervalDay(30)
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- OTLP Logs Table (Standard Format)
CREATE TABLE IF NOT EXISTS otel.otel_logs (
    Timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    TraceFlags UInt32 CODEC(ZSTD(1)),
    SeverityText LowCardinality(String) CODEC(ZSTD(1)),
    SeverityNumber Int32 CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    Body String CODEC(ZSTD(1)),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    LogAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    INDEX idx_trace_id TraceId TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_service_name ServiceName TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_severity SeverityText TYPE set(25) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SeverityText, toUnixTimestamp(Timestamp), TraceId)
TTL toDateTime(Timestamp) + toIntervalDay(30)
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- Service Dependency Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS otel.service_dependencies_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour_timestamp)
ORDER BY (client_service, server_service, hour_timestamp)
AS SELECT
    ResourceAttributes['service.name'] as client_service,
    SpanAttributes['peer.service'] as server_service,
    toStartOfHour(Timestamp) as hour_timestamp,
    count() as call_count,
    countIf(StatusCode = 'STATUS_CODE_ERROR') as error_count,
    avg(Duration) as avg_duration_ns
FROM otel.otel_traces
WHERE SpanKind = 'SPAN_KIND_CLIENT' 
  AND SpanAttributes['peer.service'] != ''
GROUP BY ResourceAttributes['service.name'], SpanAttributes['peer.service'], toStartOfHour(Timestamp);

-- Service Statistics Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS otel.service_stats_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_timestamp)
ORDER BY (ServiceName, SpanName, hour_timestamp)
AS SELECT
    ServiceName,
    SpanName,
    toStartOfHour(Timestamp) as hour_timestamp,
    count() as request_count,
    countIf(StatusCode = 'STATUS_CODE_ERROR') as error_count,
    avg(Duration) as avg_duration_ns,
    quantile(0.50)(Duration) as p50_duration_ns,
    quantile(0.95)(Duration) as p95_duration_ns,
    quantile(0.99)(Duration) as p99_duration_ns
FROM otel.otel_traces
WHERE SpanKind = 'SPAN_KIND_SERVER'
GROUP BY ServiceName, SpanName, toStartOfHour(Timestamp);

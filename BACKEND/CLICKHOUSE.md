# ClickHouse Integration for Nexus Monitor

## Overview

Nexus Monitor now supports **dual-write** to both MongoDB and ClickHouse for trace and span storage. This provides:
- **MongoDB**: Real-time queries, dashboard display, backward compatibility
- **ClickHouse**: High-performance analytics, long-term storage, time-series queries

## Setup

### 1. Start ClickHouse (Docker)

```bash
docker run -d \
  --name clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  -p 30123:9000 \
  clickhouse/clickhouse-server
```

### 2. Initialize Schema

```bash
cd BACKEND/schema
./setup_clickhouse.sh
```

Or manually:

```bash
clickhouse-client --host=localhost --port=9000 < clickhouse_traces.sql
```

### 3. Configure Backend

Add to your `.env`:

```env
CLICKHOUSE_URL=http://localhost
CLICKHOUSE_PORT=30123
```

### 4. Restart Backend

The backend will automatically start dual-writing to ClickHouse.

```bash
cd BACKEND
npm run dev
```

## Schema

### Traces Table

```sql
otel.traces (
    trace_id String,
    service_name String,
    endpoint String,
    duration_ms Float64,
    status_code UInt16,
    error UInt8,
    timestamp DateTime64(3),
    span_count UInt32,
    ...
)
TTL: 30 days
Partitioned by: date (toYYYYMMDD(timestamp))
```

### Spans Table

```sql
otel.spans (
    span_id String,
    trace_id String,
    parent_span_id String,
    service_name String,
    span_name String,
    span_kind UInt8,
    start_time DateTime64(9),  -- Nanosecond precision
    end_time DateTime64(9),
    duration_ms Float64,
    status_code UInt8,
    ...
)
TTL: 30 days
Partitioned by: date (toYYYYMMDD(start_time))
```

### Materialized Views

- **service_stats_mv**: Hourly aggregated stats (p50, p95, p99, error rates)
- **span_relationships_mv**: Span parent-child relationships for topology

## Data Flow

```
OTLP Traces (Client)
        ↓
/api/otlp/v1/traces
        ↓
otlpIngestController
        ↓
   ┌────────────┐
   │  Dual-Write │
   └────┬───┬────┘
        │   │
   ┌────▼───▼────┐
   │             │
MongoDB     ClickHouse
(Real-time)  (Analytics)
```

## Queries

### Get Recent Traces

```sql
SELECT 
    trace_id,
    service_name,
    endpoint,
    duration_ms,
    status_code,
    timestamp
FROM otel.traces
WHERE service_name = 'nodejs-3001'
  AND timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 100;
```

### Get Trace Details (All Spans)

```sql
SELECT *
FROM otel.spans
WHERE trace_id = 'fce7fb6a12345678abcd0123456789ab'
ORDER BY start_time;
```

### Service Performance Stats

```sql
SELECT 
    service_name,
    endpoint,
    hour,
    total_requests,
    total_errors,
    avg_duration,
    p95,
    p99
FROM otel.service_stats_mv
WHERE service_name = 'nodejs-3001'
  AND hour >= now() - INTERVAL 24 HOUR
ORDER BY hour DESC;
```

### Slowest Endpoints

```sql
SELECT 
    endpoint,
    count() as request_count,
    avg(duration_ms) as avg_duration,
    quantile(0.95)(duration_ms) as p95,
    quantile(0.99)(duration_ms) as p99
FROM otel.traces
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY endpoint
ORDER BY p95 DESC
LIMIT 10;
```

## Migration Path

### Current State (Dual-Write)
- ✅ New traces write to **both** MongoDB and ClickHouse
- ✅ Dashboard reads from **MongoDB** (existing queries work)
- ✅ No breaking changes

### Future State (ClickHouse Only)
1. Update dashboard queries to read from ClickHouse
2. Remove MongoDB Trace/Span models
3. Use ClickHouse as single source of truth

## Benefits

### ClickHouse Advantages
- **Fast Queries**: 100x faster for time-series analytics
- **Compression**: ~10x better storage efficiency
- **Scalability**: Handles millions of traces per day
- **TTL**: Automatic data expiration (30 days)
- **Materialized Views**: Pre-aggregated stats

### Cost Comparison
| Storage   | 1M Traces/Day | 30 Days | Compression |
|-----------|---------------|---------|-------------|
| MongoDB   | ~50 GB        | 1.5 TB  | None        |
| ClickHouse| ~5 GB         | 150 GB  | 10x         |

## Monitoring

### Check ClickHouse Status

```bash
curl http://localhost:8123/ping
# Response: Ok.
```

### View Table Stats

```sql
SELECT 
    table,
    formatReadableSize(sum(bytes)) as size,
    sum(rows) as rows
FROM system.parts
WHERE database = 'otel'
  AND active
GROUP BY table;
```

### Backend Logs

Look for these messages:
```
[OTLP] ✅ Stored 5 traces in MongoDB
[ClickHouse] ✅ Inserted 5 traces
[ClickHouse] ✅ Inserted 10 spans
```

If ClickHouse is down:
```
[ClickHouse] Failed to insert traces: connect ECONNREFUSED
```
*Traces still save to MongoDB - no data loss!*

## Troubleshooting

### ClickHouse Not Connecting

1. Check if running:
   ```bash
   docker ps | grep clickhouse
   ```

2. Check logs:
   ```bash
   docker logs clickhouse
   ```

3. Test connection:
   ```bash
   clickhouse-client --host=localhost --port=9000
   ```

### Schema Issues

Drop and recreate:
```sql
DROP DATABASE IF EXISTS otel;
```

Then run `setup_clickhouse.sh` again.

## Performance Tips

1. **Indexes**: Already configured for common queries
2. **Partitioning**: Automatic by date
3. **TTL**: Set to 30 days (configurable)
4. **Materialized Views**: Pre-aggregate hourly stats

## Next Steps

- [ ] Update frontend to query ClickHouse for analytics
- [ ] Create dashboards with ClickHouse data
- [ ] Implement trace sampling for high-volume services
- [ ] Add ClickHouse metrics (not just traces)

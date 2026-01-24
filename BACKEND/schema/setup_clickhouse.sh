#!/bin/bash

# ClickHouse Setup Script for Nexus Monitor OTLP Traces

echo "🚀 Setting up ClickHouse for OTLP traces..."

CLICKHOUSE_HOST=${CLICKHOUSE_HOST:-localhost}
CLICKHOUSE_PORT=${CLICKHOUSE_PORT:-30123}
CLICKHOUSE_HTTP_PORT=${CLICKHOUSE_HTTP_PORT:-8123}

echo "📍 ClickHouse Host: $CLICKHOUSE_HOST"
echo "📍 ClickHouse Port: $CLICKHOUSE_PORT"

# Check if ClickHouse is running
if ! curl -s "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_HTTP_PORT}/ping" > /dev/null; then
    echo "❌ ClickHouse is not running at http://${CLICKHOUSE_HOST}:${CLICKHOUSE_HTTP_PORT}"
    echo "Please start ClickHouse first:"
    echo "  docker run -d --name clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server"
    exit 1
fi

echo "✅ ClickHouse is running"

# Execute schema
echo "📝 Creating database and tables..."

clickhouse-client --host=$CLICKHOUSE_HOST --port=$CLICKHOUSE_PORT < "$(dirname "$0")/clickhouse_traces.sql"

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully!"
    echo ""
    echo "📊 Tables created:"
    echo "   - otel.traces (with 30-day TTL)"
    echo "   - otel.spans (with 30-day TTL)"
    echo "   - otel.service_stats_mv (materialized view)"
    echo "   - otel.span_relationships_mv (materialized view)"
    echo ""
    echo "🔧 Configuration:"
    echo "   Set these environment variables in your .env:"
    echo "   CLICKHOUSE_URL=http://${CLICKHOUSE_HOST}"
    echo "   CLICKHOUSE_PORT=${CLICKHOUSE_PORT}"
else
    echo "❌ Failed to create schema"
    exit 1
fi

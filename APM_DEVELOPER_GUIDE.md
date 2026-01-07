# APM System - Developer Guide

## Overview

The Nexus Monitoring APM (Application Performance Monitoring) system provides automatic distributed tracing for Node.js applications with **zero code changes**. It captures HTTP requests, database queries, and external API calls, then visualizes them in an enterprise-grade waterfall view.

## Architecture

```
┌─────────────────┐
│  Instrumented   │
│   Application   │
│  (Node.js App)  │
└────────┬────────┘
         │ Auto-instrumentation via --require
         │ Captures: HTTP, DB, External calls
         ▼
┌─────────────────┐
│  Agent Sender   │
│  (Batch every   │
│    5 seconds)   │
└────────┬────────┘
         │ POST /api/traces
         ▼
┌─────────────────┐
│  Backend API    │
│  - Ingestion    │
│  - Storage      │
│  - Aggregation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MongoDB       │
│  - traces       │
│  - spans        │
│  - services     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Frontend UI    │
│  - Explorer     │
│  - Waterfall    │
│  - Analytics    │
└─────────────────┘
```

## Components

### 1. Agent (Auto-Instrumentation)

**Location**: `agent/instrumentation/nodejs/`

The agent automatically instruments Node.js applications at runtime using module patching.

#### Key Files

- **`index.js`** - Main entry point, initializes all interceptors
- **`context.js`** - AsyncLocalStorage-based context propagation
- **`tracer.js`** - Span creation utilities
- **`sender.js`** - Batches and sends traces to backend every 5 seconds

#### Interceptors

| Interceptor | File | What it captures |
|-------------|------|------------------|
| HTTP Server | `interceptors/http.js` | Incoming HTTP requests (Express, Fastify, etc.) |
| HTTP Client | `interceptors/httpClient.js` | Outgoing HTTP calls (native `http` module) |
| Axios | `interceptors/axios.js` | Axios HTTP client requests/responses |
| Mongoose | `interceptors/mongoose.js` | Mongoose ORM operations (Query.exec, Model.save) |
| MongoDB | `interceptors/mongodb.js` | Native MongoDB driver operations |
| PostgreSQL | `interceptors/postgresql.js` | PostgreSQL queries (pg module) |

#### How It Works

1. **Module Loading Hook**: Uses `Module._load` to intercept when modules are loaded
2. **Method Wrapping**: Uses `shimmer` to wrap methods (e.g., `Query.prototype.exec`)
3. **Context Propagation**: Uses AsyncLocalStorage to maintain trace context across async calls
4. **Span Creation**: Creates spans for each operation with timing and metadata
5. **Batch Sending**: Collects spans and sends them in batches every 5 seconds

#### Example: Mongoose Interceptor

```javascript
// When mongoose is loaded, wrap Query.prototype.exec
Module._load = function(request, parent) {
    const exports = originalLoad.apply(this, arguments);
    
    if (request === 'mongoose' && exports && exports.Model) {
        shimmer.wrap(Query.prototype, 'exec', function(original) {
            return function(callback) {
                const context = getTraceContext(); // Get current trace
                const startTime = new Date();
                
                const result = original.call(this, callback);
                
                return result.then(data => {
                    const span = createDbSpan({
                        traceId: context.traceId,
                        operation: this.op, // 'find', 'update', etc.
                        collection: this.model.collection.name,
                        duration: Date.now() - startTime
                    });
                    addSpan(span);
                    return data;
                });
            };
        });
    }
    
    return exports;
};
```

### 2. Backend (Trace Ingestion & Storage)

**Location**: `BACKEND/src/`

#### Data Models

**Trace Model** (`models/Trace.js`):
```javascript
{
    trace_id: String (unique),
    service_name: String,
    service_id: ObjectId (ref: Service),
    endpoint: String,
    duration_ms: Number,
    status_code: Number,
    error: Boolean,
    timestamp: Date,
    spans: [ObjectId] (ref: Span),
    metadata: {
        host, container_id, process_id, agent_id
    }
}
```

**Span Model** (`models/Span.js`):
```javascript
{
    span_id: String (unique),
    trace_id: String,
    parent_span_id: String,
    type: String ('http', 'db', 'external'),
    name: String,
    duration_ms: Number,
    start_time: Date,
    end_time: Date,
    metadata: {
        // For DB spans:
        db_type, operation, collection, query
        
        // For HTTP spans:
        method, url, host, status_code
        
        // For errors:
        error, error_message
    }
}
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/traces` | Ingest traces and spans from agents |
| GET | `/api/traces/:traceId` | Get trace details with spans |
| GET | `/api/services/:serviceId/traces` | Get all traces for a service |
| GET | `/api/traces/:traceId/analysis` | Get performance breakdown |

#### Trace Ingestion Flow

```javascript
// POST /api/traces
async function ingestTraces(req, res) {
    const { traces, spans } = req.body;
    
    // 1. Store spans first (generates MongoDB ObjectIds)
    await Span.insertMany(spans);
    
    // 2. Look up Span ObjectIds by span_id
    for (const trace of traces) {
        const spanDocs = await Span.find({
            span_id: { $in: trace.spans }
        }).select('_id');
        
        // Replace span_id strings with ObjectIds
        trace.spans = spanDocs.map(s => s._id);
    }
    
    // 3. Store traces with proper span references
    await Trace.insertMany(traces);
    
    // 4. Update service metrics
    await updateServiceMetrics(traces);
}
```

**Why Span ObjectId Lookup?**
- Agent sends `span_id` strings (UUIDs)
- Trace model expects MongoDB ObjectIds for referential integrity
- We store spans first, then look up their ObjectIds to link traces

### 3. Frontend (Visualization)

**Location**: `frontend/src/pages/apm/`

#### Components

**TraceExplorer** (`TraceExplorer.jsx`):
- Browse traces by service
- Filter by endpoint, status, time range
- Click to view waterfall

**TraceWaterfall** (`TraceWaterfall.jsx`):
- Hierarchical span timeline
- Detailed span information
- Performance breakdown
- Recommendations

#### Waterfall Rendering

```javascript
function renderSpan(span, depth, traceStartTime) {
    const offset = (span.start_time - traceStartTime) / trace.duration_ms * 100;
    const width = (span.duration_ms / trace.duration_ms) * 100;
    
    return (
        <div style={{ paddingLeft: `${depth * 20}px` }}>
            {/* Span info */}
            <div>{span.name}</div>
            
            {/* Timeline bar */}
            <div style={{
                marginLeft: `${offset}%`,
                width: `${width}%`,
                backgroundColor: getSpanColor(span.type)
            }} />
            
            {/* Render child spans recursively */}
            {span.children.map(child => renderSpan(child, depth + 1))}
        </div>
    );
}
```

## Usage

### Instrumenting an Application

#### 1. Install Dependencies

Your application needs these packages (agent handles instrumentation):
```bash
npm install express mongoose axios
```

#### 2. Start with Instrumentation

**Option A: Environment Variables**
```bash
NODE_OPTIONS='--require /path/to/agent/instrumentation/nodejs/index.js' \
INSTRUMENT_NODEJS=true \
SERVICE_NAME=my-service \
SERVER_URL=http://localhost:3000 \
node app.js
```

**Option B: package.json Script**
```json
{
  "scripts": {
    "start:instrumented": "NODE_OPTIONS='--require ../agent/instrumentation/nodejs/index.js' INSTRUMENT_NODEJS=true SERVICE_NAME=my-service SERVER_URL=http://localhost:3000 node app.js"
  }
}
```

#### 3. No Code Changes Required!

Your application code remains unchanged:
```javascript
// app.js - NO CHANGES NEEDED
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

app.get('/api/users', async (req, res) => {
    // ✅ Automatically traced as DB span
    const users = await User.find().limit(10);
    
    // ✅ Automatically traced as external span
    const posts = await axios.get('https://api.example.com/posts');
    
    res.json({ users, posts });
});

app.listen(3000);
```

### Configuration

**Agent Config** (`agent/instrumentation/config.js`):
```javascript
module.exports = {
    nodejs: {
        enabled: process.env.INSTRUMENT_NODEJS === 'true',
        serviceName: process.env.SERVICE_NAME || 'unknown',
        serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
        samplingRate: parseFloat(process.env.SAMPLING_RATE || '1.0'), // 100%
        batchInterval: 5000 // Send every 5 seconds
    }
};
```

**Environment Variables**:
- `INSTRUMENT_NODEJS` - Enable/disable instrumentation (true/false)
- `SERVICE_NAME` - Name of your service (appears in UI)
- `SERVER_URL` - Backend URL for trace ingestion
- `SAMPLING_RATE` - Percentage of traces to capture (0.0-1.0)

## Development

### Running the Test App

```bash
cd test-app
npm install
npm run start:instrumented
```

Open test dashboard: `http://localhost:3001`

### Adding a New Interceptor

1. **Create interceptor file**: `agent/instrumentation/nodejs/interceptors/mydb.js`

```javascript
const shimmer = require('shimmer');
const { getTraceContext, addSpan } = require('../context');
const { generateSpanId, createDbSpan } = require('../tracer');

function instrumentMyDB() {
    try {
        const mydb = require('mydb');
        
        shimmer.wrap(mydb.Client.prototype, 'query', function(original) {
            return function(sql, ...args) {
                const context = getTraceContext();
                if (!context) return original.apply(this, args);
                
                const startTime = new Date();
                const spanId = generateSpanId();
                
                const result = original.apply(this, args);
                
                if (result && typeof result.then === 'function') {
                    return result.then(data => {
                        const span = createDbSpan({
                            spanId,
                            traceId: context.traceId,
                            parentSpanId: context.spanId,
                            dbType: 'mydb',
                            operation: 'query',
                            query: sql,
                            durationMs: Date.now() - startTime,
                            startTime,
                            endTime: new Date()
                        });
                        addSpan(span);
                        return data;
                    });
                }
                
                return result;
            };
        });
        
        console.log('[APM] MyDB instrumentation enabled');
    } catch (err) {
        console.log('[APM] MyDB not installed, skipping');
    }
}

module.exports = { instrumentMyDB };
```

2. **Register in index.js**:
```javascript
const { instrumentMyDB } = require('./interceptors/mydb');

function initialize() {
    // ... other interceptors
    instrumentMyDB();
}
```

### Testing

1. **Start backend**: `cd BACKEND && npm start`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Start test app**: `cd test-app && npm run start:instrumented`
4. **Generate traces**: Open `http://localhost:3001` and click API buttons
5. **View traces**: Open `http://localhost:5173` → Services → nodejs-3001 → Traces

## Troubleshooting

### Traces Not Appearing

**Check agent logs**:
```
[APM] Initializing Node.js auto-instrumentation...
[APM] Mongoose instrumentation enabled
[APM] Sending 1 traces and 2 spans to http://localhost:3000/api/traces
[APM] ✅ Successfully sent 1 traces and 2 spans to backend
```

**Check backend logs**:
```
[Trace Ingestion] Received 1 traces and 2 spans
[Trace] Storing 2 spans
[Trace] ✅ Stored 2 spans successfully
[Trace] Storing 1 traces
[Trace] ✅ Stored 1 traces successfully
```

**Common Issues**:
1. **"Mongoose not installed"** - Agent loaded before app required mongoose
   - Solution: Use lazy loading via `Module._load` hook (already implemented)

2. **"Stored 0 traces"** - Span ObjectId lookup failed
   - Solution: Ensure spans are stored before traces (already implemented)

3. **Query chaining broken** (`.find().limit()` fails)
   - Solution: Wrap `Query.prototype.exec` instead of individual methods (already implemented)

### Database Empty

**Verify MongoDB**:
```bash
docker exec -it mongodb mongosh nexus-monitoring --eval "db.traces.countDocuments({})"
docker exec -it mongodb mongosh nexus-monitoring --eval "db.spans.countDocuments({})"
```

**Check for errors**:
```bash
# Backend logs should show any insertion errors
[Trace] ❌ Error storing traces: <error message>
```

## Performance Considerations

### Overhead

- **CPU**: ~2-5% overhead from instrumentation
- **Memory**: ~10-20MB for trace buffer
- **Network**: Batched sends every 5 seconds (minimal impact)

### Sampling

For high-traffic applications, use sampling:
```bash
SAMPLING_RATE=0.1  # Capture 10% of traces
```

### TTL (Time To Live)

Traces auto-delete after 7 days:
```javascript
// In Trace model
traceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
```

## Next.js Support

✅ **Fully supported!** Works with:
- API Routes (`pages/api/*` or `app/api/*`)
- Server Components (App Router)
- Server-Side Rendering (`getServerSideProps`)
- Middleware

❌ **Not supported**:
- Client Components (browser-side code)
- Client-side fetch calls

**Usage**:
```bash
NODE_OPTIONS='--require /path/to/agent/instrumentation/nodejs/index.js' \
INSTRUMENT_NODEJS=true \
SERVICE_NAME=my-nextjs-app \
SERVER_URL=http://localhost:3000 \
npm run dev
```

## Contributing

### Code Style

- Use ES6+ features
- Add JSDoc comments for public functions
- Follow existing naming conventions
- Add error handling for all interceptors

### Commit Messages

Follow conventional commits:
```
feat(agent): Add Redis interceptor
fix(backend): Fix span ObjectId lookup
docs(readme): Update installation instructions
refactor(frontend): Improve waterfall rendering
```

### Pull Request Process

1. Create feature branch: `git checkout -b feat/redis-interceptor`
2. Make changes and test thoroughly
3. Commit with descriptive messages
4. Push and create PR
5. Ensure all tests pass

## License

MIT License - See LICENSE file for details

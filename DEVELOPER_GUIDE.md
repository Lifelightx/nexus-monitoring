# Nexus Monitoring - Developer Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Development Setup](#development-setup)
- [Component Guide](#component-guide)
- [API Reference](#api-reference)
- [Agent Development](#agent-development)
- [APM System](#apm-system)
- [Contributing](#contributing)

## Overview

Nexus Monitoring is a comprehensive, enterprise-grade infrastructure monitoring platform that provides:

- **Real-time Server Monitoring** - CPU, memory, disk, network metrics
- **Docker Container Management** - Start/stop/restart containers, view logs, exec into terminals
- **APM (Application Performance Monitoring)** - Distributed tracing with zero code changes
- **Alert Management** - Configurable alerts with email notifications
- **Multi-Server Dashboard** - Monitor entire fleet from single interface

### Tech Stack

**Frontend**:
- React 19 with Vite
- TailwindCSS for styling
- Recharts for metrics visualization
- Xterm.js for terminal emulation
- Socket.io for real-time updates

**Backend**:
- Node.js 22 with Express 5
- MongoDB with Mongoose 9
- Socket.io for WebSocket communication
- JWT authentication
- Node-cron for scheduled tasks

**Agent**:
- Node.js with systeminformation
- Dockerode for Docker API
- Socket.io client for backend communication
- Auto-instrumentation for APM tracing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Docker  │  │   APM    │  │  Alerts  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Metrics │  │  Docker  │  │  Traces  │  │  Alerts  │   │
│  │Controller│  │Controller│  │Controller│  │Controller│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Socket.io Event Hub                        │  │
│  │  - agent:register, agent:metrics                     │  │
│  │  - docker:control, docker:logs, docker:terminal      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Agents  │  │ Metrics  │  │  Traces  │  │  Alerts  │   │
│  │ Services │  │  Spans   │  │  Users   │  │  Logs    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ WebSocket
                     │
┌─────────────────────────────────────────────────────────────┐
│                    Agent (Node.js)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Metrics    │  │    Docker    │  │     APM      │      │
│  │  Collector   │  │   Manager    │  │Instrumentation│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Runs on each monitored server                              │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
nexus-monitoring/
├── BACKEND/                    # Express backend server
│   └── src/
│       ├── config/            # Database, environment config
│       ├── controllers/       # Request handlers
│       │   ├── alertController.js
│       │   ├── authController.js
│       │   ├── dockerController.js
│       │   ├── serviceController.js
│       │   └── traceController.js
│       ├── middleware/        # Auth, error handling
│       ├── models/            # Mongoose schemas
│       │   ├── Agent.js
│       │   ├── Alert.js
│       │   ├── Metric.js
│       │   ├── Service.js
│       │   ├── Trace.js
│       │   └── Span.js
│       ├── routes/            # API routes
│       ├── services/          # Business logic
│       │   ├── alertService.js
│       │   ├── metricsAggregationService.js
│       │   └── schedulerService.js
│       ├── socket/            # WebSocket handlers
│       └── server.js          # Entry point
│
├── frontend/                  # React frontend
│   └── src/
│       ├── components/
│       │   ├── dashboard/    # Main dashboard components
│       │   ├── shared/       # Reusable UI components
│       │   └── docker/       # Docker-specific components
│       ├── pages/
│       │   ├── auth/         # Login, register
│       │   ├── dashboard/    # Server overview
│       │   ├── server/       # Server details, metrics
│       │   ├── docker/       # Container management
│       │   ├── apm/          # APM traces, services
│       │   └── alerts/       # Alert management
│       ├── services/         # API clients
│       │   ├── api.js
│       │   ├── apmService.js
│       │   └── dockerService.js
│       └── App.jsx           # Root component, routing
│
├── agent/                     # Monitoring agent
│   ├── index.js              # Agent entry point
│   ├── collectors/           # Metric collectors
│   │   ├── processCollector.js
│   │   └── serviceDetector.js
│   ├── instrumentation/      # APM auto-instrumentation
│   │   ├── config.js
│   │   └── nodejs/
│   │       ├── index.js
│   │       ├── context.js
│   │       ├── tracer.js
│   │       ├── sender.js
│   │       └── interceptors/
│   │           ├── http.js
│   │           ├── httpClient.js
│   │           ├── axios.js
│   │           ├── mongoose.js
│   │           ├── mongodb.js
│   │           └── postgresql.js
│   └── docker/               # Docker management
│
└── test-app/                 # APM test application
    ├── server.js
    └── public/index.html     # Test dashboard
```

## Core Features

### 1. Server Monitoring

**Data Flow**:
1. Agent collects metrics every 5 seconds using `systeminformation`
2. Sends metrics via WebSocket (`agent:metrics` event)
3. Backend stores in MongoDB and broadcasts to dashboards
4. Frontend displays real-time charts

**Key Files**:
- Agent: `agent/index.js` - Metric collection loop
- Backend: `BACKEND/src/socket/index.js` - WebSocket event handlers
- Frontend: `frontend/src/pages/dashboard/Dashboard.jsx`

**Metrics Collected**:
```javascript
{
    cpu: { usage: 45.2, cores: 8, model: "Intel i7" },
    memory: { used: 8192, total: 16384, percent: 50 },
    disk: { used: 250000, total: 500000, percent: 50 },
    network: { rx: 1024000, tx: 512000 },
    uptime: 86400,
    docker: {
        running: 5,
        stopped: 2,
        containers: [...]
    }
}
```

### 2. Docker Management

**Remote Control Flow**:
1. Frontend emits `docker:control` event with action
2. Backend forwards to specific agent via Socket.io
3. Agent executes Docker command using Dockerode
4. Agent sends result back to backend
5. Backend broadcasts result to all dashboards

**Supported Actions**:
- `start`, `stop`, `restart`, `remove` - Container lifecycle
- `logs` - Stream container logs
- `exec` - Interactive terminal (sh/bash)
- `inspect` - Container details

**Key Files**:
- Backend: `BACKEND/src/controllers/dockerController.js`
- Agent: `agent/docker/` (Docker API wrapper)
- Frontend: `frontend/src/pages/docker/`

**Example: Starting a Container**
```javascript
// Frontend
socket.emit('docker:control', {
    agentId: '507f1f77bcf86cd799439011',
    containerId: 'abc123',
    action: 'start'
});

// Backend forwards to agent
io.to(agentSocketId).emit('docker:control', data);

// Agent executes
const container = docker.getContainer(containerId);
await container.start();

// Agent sends result
socket.emit('docker:control:result', {
    success: true,
    containerId: 'abc123'
});
```

### 3. APM (Application Performance Monitoring)

**See [APM_DEVELOPER_GUIDE.md](./APM_DEVELOPER_GUIDE.md) for detailed APM documentation.**

**Quick Overview**:
- Zero-code-change instrumentation via `NODE_OPTIONS`
- Captures HTTP requests, DB queries, external API calls
- Stores traces and spans in MongoDB
- Visualizes in waterfall view with performance breakdown

**Instrumentation Example**:
```bash
NODE_OPTIONS='--require /path/to/agent/instrumentation/nodejs/index.js' \
INSTRUMENT_NODEJS=true \
SERVICE_NAME=my-app \
SERVER_URL=http://localhost:3000 \
node app.js
```

### 4. Alert Management

**Alert Types**:
- High CPU usage (>80%)
- High memory usage (>90%)
- Disk space critical (<10% free)
- Container stopped/exited unexpectedly
- Service down

**Alert Flow**:
1. Backend receives metrics from agent
2. `alertService.detectAlerts()` checks thresholds
3. Creates alert in database
4. Sends email notification (if configured)
5. Broadcasts to dashboards via WebSocket
6. Auto-cleanup after 1 hour

**Key Files**:
- Backend: `BACKEND/src/services/alertService.js`
- Backend: `BACKEND/src/controllers/alertController.js`
- Frontend: `frontend/src/pages/alerts/`

**Email Configuration**:
```javascript
// BACKEND/src/models/AlertSettings.js
{
    emailService: 'gmail' | 'outlook' | 'smtp',
    recipients: ['admin@example.com'],
    smtpConfig: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'user@gmail.com',
        pass: 'app-password'
    }
}
```

## Development Setup

### Prerequisites
- Node.js 22+
- MongoDB 6+
- Docker (for agent testing)

### 1. Clone and Install

```bash
git clone <repository-url>
cd nexus-monitoring

# Install backend dependencies
cd BACKEND
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install agent dependencies
cd ../agent
npm install
```

### 2. Environment Configuration

**Backend** (`.env`):
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/nexus-monitoring
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

**Frontend** (`src/config.js`):
```javascript
export const API_URL = 'http://localhost:3000';
export const WS_URL = 'http://localhost:3000';
```

**Agent** (`.env`):
```env
BACKEND_URL=http://localhost:3000
AGENT_NAME=dev-server
AGENT_TOKEN=your-jwt-token
```

### 3. Start Development Servers

**Terminal 1 - MongoDB**:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Terminal 2 - Backend**:
```bash
cd BACKEND
npm run dev  # Uses nodemon for auto-reload
```

**Terminal 3 - Frontend**:
```bash
cd frontend
npm run dev  # Vite dev server on port 5173
```

**Terminal 4 - Agent** (optional):
```bash
cd agent
npm start
```

### 4. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs (if Swagger enabled)

## Component Guide

### Backend Components

#### Controllers

**Purpose**: Handle HTTP requests and WebSocket events

**Example: traceController.js**
```javascript
// POST /api/traces - Ingest traces from agents
async function ingestTraces(req, res) {
    const { traces, spans } = req.body;
    
    // Store spans first
    await Span.insertMany(spans);
    
    // Look up span ObjectIds
    for (const trace of traces) {
        const spanDocs = await Span.find({
            span_id: { $in: trace.spans }
        });
        trace.spans = spanDocs.map(s => s._id);
    }
    
    // Store traces
    await Trace.insertMany(traces);
    
    res.status(201).json({ success: true });
}
```

#### Models

**Purpose**: Define MongoDB schemas with Mongoose

**Example: Agent.js**
```javascript
const agentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    hostname: String,
    platform: String,
    cpuModel: String,
    totalMemory: Number,
    lastSeen: Date,
    instrumentation: {
        enabled: Boolean,
        last_trace_id: String
    }
});
```

#### Services

**Purpose**: Business logic, reusable functions

**Example: alertService.js**
```javascript
async function detectAlerts(previousMetric, currentMetric, agentInfo) {
    const alerts = [];
    
    // CPU alert
    if (currentMetric.cpu > 80) {
        alerts.push({
            type: 'cpu',
            severity: 'high',
            message: `CPU usage is ${currentMetric.cpu}%`,
            agent: agentInfo._id
        });
    }
    
    // Save and send emails
    for (const alert of alerts) {
        await Alert.create(alert);
        await sendEmailNotification(alert);
    }
    
    return alerts;
}
```

### Frontend Components

#### Page Components

**Location**: `frontend/src/pages/`

**Structure**:
```
pages/
├── dashboard/Dashboard.jsx      # Server grid overview
├── server/ServerDetails.jsx     # Single server metrics
├── docker/ContainerList.jsx     # Docker management
├── apm/TraceExplorer.jsx        # APM traces
└── alerts/AlertsPage.jsx        # Alert management
```

**Example: ServerDetails.jsx**
```jsx
function ServerDetails() {
    const { id } = useParams();
    const [metrics, setMetrics] = useState([]);
    
    useEffect(() => {
        // Fetch historical metrics
        api.get(`/api/agents/${id}/metrics`).then(setMetrics);
        
        // Listen for real-time updates
        socket.on('dashboard:update', (data) => {
            if (data.agentId === id) {
                setMetrics(prev => [...prev, data]);
            }
        });
    }, [id]);
    
    return (
        <div>
            <CPUChart data={metrics} />
            <MemoryChart data={metrics} />
            <NetworkChart data={metrics} />
        </div>
    );
}
```

#### Shared Components

**Location**: `frontend/src/components/shared/`

**Reusable UI components**:
- `MetricCard.jsx` - Display single metric with sparkline
- `StatusBadge.jsx` - Online/offline/error status indicator
- `HealthIndicator.jsx` - Color-coded health status
- `TimeRangeSelector.jsx` - Date range picker for metrics

### Agent Components

#### Metric Collectors

**Purpose**: Gather system metrics using `systeminformation`

**Example: agent/index.js**
```javascript
async function collectMetrics() {
    const [cpu, mem, disk, network] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats()
    ]);
    
    const dockerInfo = await collectDockerMetrics();
    
    return {
        cpu: cpu.currentLoad,
        memory: {
            used: mem.used,
            total: mem.total,
            percent: (mem.used / mem.total) * 100
        },
        disk: disk[0],
        network: {
            rx: network[0].rx_sec,
            tx: network[0].tx_sec
        },
        docker: dockerInfo
    };
}

// Send metrics every 5 seconds
setInterval(async () => {
    const metrics = await collectMetrics();
    socket.emit('agent:metrics', metrics);
}, 5000);
```

## API Reference

### Authentication

**POST /api/auth/register**
```json
Request:
{
    "username": "admin",
    "email": "admin@example.com",
    "password": "secure-password"
}

Response:
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "507f1f77bcf86cd799439011",
        "username": "admin",
        "email": "admin@example.com"
    }
}
```

**POST /api/auth/login**
```json
Request:
{
    "email": "admin@example.com",
    "password": "secure-password"
}

Response:
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
}
```

### Agents

**GET /api/agents** - List all agents
**GET /api/agents/:id** - Get agent details
**GET /api/agents/:id/metrics** - Get historical metrics

### Docker

**POST /api/docker/control** - Control containers
```json
{
    "agentId": "507f1f77bcf86cd799439011",
    "containerId": "abc123",
    "action": "start" | "stop" | "restart" | "remove"
}
```

### APM

**POST /api/traces** - Ingest traces (from agents)
**GET /api/traces/:traceId** - Get trace details
**GET /api/services/:serviceId/traces** - Get service traces
**GET /api/traces/:traceId/analysis** - Get performance breakdown

### Alerts

**GET /api/alerts** - List all alerts
**POST /api/alerts/:id/acknowledge** - Acknowledge alert
**DELETE /api/alerts/:id** - Delete alert
**GET /api/alerts/settings** - Get alert settings
**PUT /api/alerts/settings** - Update alert settings

## Agent Development

### Adding New Metrics

1. **Create collector function**:
```javascript
// agent/collectors/customMetric.js
async function collectCustomMetric() {
    // Your metric collection logic
    return {
        customValue: 42
    };
}
```

2. **Add to main collection loop**:
```javascript
// agent/index.js
const customMetric = await collectCustomMetric();
socket.emit('agent:metrics', {
    ...existingMetrics,
    custom: customMetric
});
```

3. **Update backend model**:
```javascript
// BACKEND/src/models/Metric.js
const metricSchema = new mongoose.Schema({
    // ... existing fields
    custom: {
        customValue: Number
    }
});
```

4. **Display in frontend**:
```jsx
// frontend/src/pages/server/ServerDetails.jsx
<MetricCard
    title="Custom Metric"
    value={metrics.custom?.customValue}
/>
```

### Docker Integration

The agent uses `dockerode` to interact with Docker:

```javascript
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// List containers
const containers = await docker.listContainers({ all: true });

// Start container
const container = docker.getContainer(containerId);
await container.start();

// Stream logs
const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true
});
stream.on('data', chunk => {
    socket.emit('docker:logs:data', { data: chunk.toString() });
});
```

## APM System

For detailed APM documentation, see **[APM_DEVELOPER_GUIDE.md](./APM_DEVELOPER_GUIDE.md)**.

**Quick Start**:
```bash
# Instrument any Node.js app
NODE_OPTIONS='--require /path/to/agent/instrumentation/nodejs/index.js' \
INSTRUMENT_NODEJS=true \
SERVICE_NAME=my-app \
SERVER_URL=http://localhost:3000 \
node app.js
```

**Supported Frameworks**:
- Express, Fastify, Koa (HTTP server)
- Mongoose, MongoDB native (Database)
- Axios, native http (HTTP client)
- Next.js (API routes, SSR, server components)

## Contributing

### Code Style

- **JavaScript**: ES6+, async/await preferred
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc for public functions

### Commit Messages

Follow conventional commits:
```
feat(backend): Add PostgreSQL support
fix(frontend): Fix memory leak in metrics chart
docs(readme): Update installation instructions
refactor(agent): Improve Docker error handling
perf(backend): Optimize trace query performance
```

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feat/my-feature`
3. Make changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork
6. Create Pull Request with description

### Testing

**Backend**:
```bash
cd BACKEND
npm test
```

**Frontend**:
```bash
cd frontend
npm test
```

**Agent**:
```bash
cd agent
npm test
```

## Troubleshooting

### Agent Not Connecting

**Check**:
1. Backend URL is correct in agent `.env`
2. Backend is running and accessible
3. JWT token is valid
4. Firewall allows WebSocket connections

**Debug**:
```bash
# Agent logs
cd agent
DEBUG=* npm start

# Backend logs
cd BACKEND
DEBUG=socket.io* npm run dev
```

### Docker Commands Failing

**Common Issues**:
1. Docker socket not accessible: `sudo usermod -aG docker $USER`
2. Agent not running as root: Use `sudo` or add user to docker group
3. Container doesn't exist: Refresh container list

### Metrics Not Updating

**Check**:
1. Agent is connected (check dashboard)
2. WebSocket connection is active
3. MongoDB is running
4. No errors in browser console

## License

MIT License - See LICENSE file for details

## Support

- **Issues**: https://github.com/your-org/nexus-monitoring/issues
- **Discussions**: https://github.com/your-org/nexus-monitoring/discussions
- **Email**: support@nexusmonitoring.com

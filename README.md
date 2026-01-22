# Nexus Monitor

Nexus Monitor is a comprehensive, enterprise-grade **Application Performance Monitoring (APM) and Server Monitoring** solution. It provides real-time insights into your infrastructure, distributed tracing for Node.js applications, Docker container management, and server health monitoring—all from a single, beautiful dashboard.

## 🚀 Features

### 📊 Core Monitoring
- **Real-time Metrics**: Live tracking of CPU usage, Memory consumption, Disk I/O, and Network traffic (RX/TX)
- **Multi-Server Dashboard**: View all connected servers in a grid with status indicators (Online/Offline)
- **Historical Data**: Interactive time-series charts showing resource usage trends
- **System Info**: Detailed hardware specifications (CPU model, OS, Uptime, etc.)
- **WebSocket Real-Time Updates**: Event-driven updates for instant feedback (no polling delay)

### 🔍 APM & Distributed Tracing
- **Auto-Instrumentation**: Zero-code-change instrumentation for Node.js applications
- **Distributed Traces**: End-to-end request tracing across services
- **Span Tracking**: Automatic capture of:
  - HTTP requests/responses
  - Database queries (MongoDB via Mongoose, PostgreSQL)
  - External API calls (Axios, native HTTP)
  - Custom business operations
- **Performance Analysis**: 
  - Trace breakdown (DB time vs. Code time vs. External calls)
  - Slowest spans identification
  - Error tracking and correlation
- **Service Discovery**: Automatic detection of Node.js services (systemd, Docker, standalone)
- **Trace Batching**: Efficient 5-second batching with configurable batch size (50 traces)
- **Data Retention**: 7-day automatic cleanup with TTL indexes

### 🐳 Docker Management
- **Container Visualization**: View all running and stopped containers with resource usage
- **Remote Control**: Start, Stop, Restart, Remove containers from the dashboard
- **Live Logs**: Stream real-time container logs with filtering
- **Interactive Terminal**: Execute commands inside containers via browser (supports `sh`/`bash`)
- **Image Management**: View and remove Docker images
- **Volume Management**: List and inspect Docker volumes
- **Bulk Actions**: Manage multiple containers simultaneously

### 📂 File System Explorer
- **Live File Browser**: Browse remote server file systems in real-time
- **Disk Analysis**: Comprehensive disk usage statistics
- **Smart Caching**: Bandwidth-optimized sync mechanism

### 🚨 Alerting & Notifications
- **Threshold Alerts**: CPU, Memory, Disk, and Network threshold monitoring
- **Container Alerts**: Notifications for stopped/exited containers
- **Email Integration**: Support for Outlook, Gmail, and Icewarp/SMTP
- **Multi-Recipient**: Configure multiple email recipients
- **Auto-Cleanup**: 1-hour automatic alert expiration
- **Alert Dashboard**: Centralized view with acknowledge/delete actions

### 🔐 Security & Architecture
- **Secure Communication**: Encrypted data transmission between agents and backend
- **JWT Authentication**: Token-based user authentication
- **Agent-Based Architecture**: Lightweight C++ agent with Node.js instrumentation
- **Fallback Mechanisms**: Graceful degradation for features (e.g., terminal fallback)

### 🎨 User Experience
- **Modern UI**: Dark mode with glassmorphism and smooth animations
- **Responsive Design**: Desktop and mobile optimized
- **Interactive Guides**: Built-in installation and setup wizards
- **Marketing Pages**: Professional landing, pricing, services, and documentation pages

## 🛠️ Tech Stack

### Frontend
- **React v19** with React Router
- **Styling**: TailwindCSS with custom design system
- **Charts**: Recharts for time-series visualization
- **Terminal**: Xterm.js for in-browser shell
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Node.js v22
- **Framework**: Express v5
- **Database**: MongoDB (Mongoose v9)
- **Real-time**: Socket.io for WebSocket communication
- **Authentication**: JWT with bcrypt
- **Scheduled Tasks**: node-cron for alert cleanup
- **Logging**: Custom logger with Winston

### Agent
- **Core**: C++ (Modern C++17) for system monitoring
- **Instrumentation**: Node.js auto-instrumentation (require-based injection)
- **System Info**: Native bindings for CPU, memory, disk metrics
- **Docker Integration**: Dockerode for container management
- **Communication**: Socket.io Client for backend connection

### Instrumentation (Node.js)
- **Context Management**: AsyncLocalStorage for trace context propagation
- **Interceptors**: Shimmer-based monkey patching for:
  - HTTP server/client
  - Axios
  - Mongoose/MongoDB
  - PostgreSQL
- **Trace Format**: Custom JSON format (migrating to OTLP)

## 📦 Installation & Setup

### Prerequisites
- **Node.js** v16 or higher
- **MongoDB** (Local or Atlas)
- **Docker** (for container management features)
- **C++ Compiler** (for building the agent, optional)

### 1. Backend Setup
```bash
cd BACKEND
npm install

# Create .env file
cp .env.example .env
# Configure: MONGO_URI, JWT_SECRET, PORT (default: 3000)

npm run dev
```
Backend starts on `http://localhost:3000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend starts on `http://localhost:5173`

### 3. Agent Setup (Target Server)
```bash
cd agent
npm install

# Configure .env
# Set: SERVER_URL (backend), AGENT_ID (optional), SERVICE_NAME (optional)

# For production build
npm run build
npm start

# For development
npm run dev
```

### 4. Test Application (Optional)
Run the instrumented test app to verify tracing:
```bash
cd test-app
npm install
npm run start:instrumented

# Generate test traffic
curl http://localhost:3001/api/users
curl http://localhost:3001/api/nested
```

## 🔑 Default Login Credentials

For local testing:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## 📝 Usage

### 1. Register/Login
Create an account or use default credentials

### 2. Connect a Server
- Navigate to Dashboard
- Follow the Installation Guide to deploy the agent
- Agent auto-registers and appears in "Your Servers" list

### 3. Monitor & Manage
- **Metrics**: Click server card for detailed CPU/Memory/Disk/Network charts
- **Docker**: Manage containers, view logs, open terminal
- **Files**: Browse server file system
- **Traces**: View distributed traces for instrumented services
- **Alerts**: Configure thresholds and email notifications

### 4. Enable APM for Node.js Apps

**Option 1: Manual Instrumentation**
```bash
cd your-nodejs-app

# Start with auto-instrumentation
NODE_OPTIONS='--require /path/to/agent/assets/instrumentation/nodejs/index.js' \
INSTRUMENT_NODEJS=true \
SERVICE_NAME=my-service \
SERVER_URL=http://localhost:3000 \
node app.js
```

**Option 2: Automatic Injection (Systemd Services)**
The agent automatically detects and instruments systemd Node.js services

**Option 3: Docker Injection**
Agent auto-injects instrumentation into Node.js Docker containers

## 🗺️ Roadmap

### ✅ Completed
- [x] Real-time server monitoring with WebSocket updates
- [x] Docker container management with live logs and terminal
- [x] File system explorer with disk analysis
- [x] Alert system with email notifications
- [x] Auto-instrumentation for Node.js applications
- [x] Distributed tracing with span tracking
- [x] Service discovery (systemd, Docker, standalone)
- [x] Frontend marketing pages (Landing, Pricing, Services, Docs)
- [x] Trace batching and storage with 7-day retention

### 🚧 In Progress (Next Sprint)
- [ ] **OTLP Compliance** ⭐ *High Priority*
  - Migrate from custom trace format to OpenTelemetry Protocol (OTLP)
  - Update instrumentation to send OTLP-compliant payloads
  - Add W3C Trace Context header propagation for cross-service tracing
  - Integrate with OTLP collector for ecosystem compatibility
  - **Goal**: Industry-standard observability format

- [ ] **Runtime Metrics Instrumentation**
  - Add CPU usage per request
  - Memory allocation tracking
  - Event loop lag monitoring
  - Active handles/requests metrics

- [ ] **Storage Optimization**
  - Evaluate ClickHouse for high-volume trace storage (>100k/day)
  - Implement hot/cold data strategy (MongoDB + ClickHouse)
  - Pre-compute aggregated metrics for faster dashboard queries

### 🔮 Future Enhancements
- [ ] **Multi-Language Support**: Python, Java, Go auto-instrumentation
- [ ] **Log Aggregation**: Centralized log management with correlation to traces
- [ ] **Custom Metrics SDK**: Business-specific metric instrumentation
- [ ] **SaaS Features**: Multi-tenancy, team collaboration, RBAC
- [ ] **Advanced Analytics**: ML-based anomaly detection, capacity planning
- [ ] **Mobile App**: iOS/Android monitoring dashboard
- [ ] **Kubernetes Integration**: K8s cluster monitoring and pod management
- [ ] **Synthetic Monitoring**: Uptime checks, API health monitoring

## 📚 Documentation

For detailed guides, see:
- [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) - Development setup and architecture
- [`APM_DEVELOPER_GUIDE.md`](./APM_DEVELOPER_GUIDE.md) - APM instrumentation details
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [`INSTALLATION.md`](./INSTALLATION.md) - Step-by-step installation
- [`SERVICE_LIFECYCLE.md`](./SERVICE_LIFECYCLE.md) - Service management documentation

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  - Dashboard  - Traces  - Docker  - Alerts  - Files    │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket + HTTP
┌────────────────────────▼────────────────────────────────┐
│               Backend (Node.js + Express)               │
│  - REST API  - Socket.io  - MongoDB  - JWT Auth        │
└──────┬──────────────────┬──────────────────────┬────────┘
       │                  │                      │
       │ WebSocket        │ Trace Ingestion      │ Metrics
       │                  │ /api/traces          │
┌──────▼──────┐   ┌──────▼──────────┐   ┌──────▼─────────┐
│   Agent     │   │ Instrumented    │   │  Agent (C++)   │
│   (C++)     │   │  Node.js App    │   │                │
│             │   │                 │   │  - CPU/Memory  │
│ - Metrics   │   │ - HTTP tracking │   │  - Docker API  │
│ - Docker    │   │ - DB queries    │   │  - Filesystem  │
│ - Files     │   │ - External APIs │   │                │
└─────────────┘   └─────────────────┘   └────────────────┘
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenTelemetry for observability standards
- Socket.io for real-time communication
- Recharts for data visualization
- Xterm.js for terminal emulation

---

**Built with ❤️ for modern DevOps teams**

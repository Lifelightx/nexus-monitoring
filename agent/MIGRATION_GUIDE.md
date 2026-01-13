# Node.js vs C++ Agent - Feature Comparison

## Folder Structure Explanation

### C++ Project Layout
```
agent/cpp/
├── include/nexus/          # Header files (.h) - DECLARATIONS
│   ├── collectors/         # Class declarations
│   ├── detectors/
│   ├── communication/
│   └── utils/
├── src/                    # Source files (.cpp) - IMPLEMENTATIONS
│   ├── collectors/         # Class implementations
│   ├── detectors/
│   ├── communication/
│   └── utils/
└── build/                  # Compiled binaries
```

**Why two folders?**
- **`include/`** = Headers (.h) - Defines interfaces (what classes/functions exist)
- **`src/`** = Source (.cpp) - Implements those interfaces (how they work)

This is standard C++ practice for clean separation of interface and implementation.

---

## Node.js Agent Components

### ✅ Implemented in C++

| Component | Node.js Location | C++ Location | Status |
|-----------|------------------|--------------|--------|
| **System Metrics** | `collectors/systemCollector.js` | `src/collectors/system_metrics.cpp` | ✅ Complete |
| **Docker Monitoring** | `collectors/dockerCollector.js` | `src/collectors/docker_monitor.cpp` | ✅ Complete |
| **Process Scanning** | `collectors/processCollector.js` | `src/collectors/process_scanner.cpp` | ✅ Complete |
| **Docker Commands** | `handlers/dockerHandler.js` | `src/handlers/docker_handler.cpp` | ✅ Complete |
| **Configuration** | `index.js` (dotenv) | `src/utils/config.cpp` | ✅ Complete |
| **Logging** | `console.log` | `src/utils/logger.cpp` (spdlog) | ✅ Complete |

### ⏳ To Be Implemented in C++

| Component | Node.js Location | Purpose | Priority |
|-----------|------------------|---------|----------|
| **WebSocket Communication** | `index.js` (Socket.io) | Bi-directional communication with backend | **HIGH** |
| **Service Detection** | `index.js` (service mapping) | Map processes to services | **HIGH** |
| **Instrumentation Orchestration** | `instrumentation/nodejs/` | Manage Node.js injector | **MEDIUM** |
| **Log Streaming** | `handlers/dockerHandler.js` | Real-time container logs | **MEDIUM** |
| **Interactive Terminal** | `handlers/dockerHandler.js` | PTY-based terminal | **LOW** |

---

## Docker Handler Analysis

**Location:** `agent/handlers/dockerHandler.js`

**Features:**

### ✅ Implemented in C++
1. **Container Control** - start, stop, restart, remove, create
2. **Docker Compose Deploy** - Deploy multi-container apps

### ⏳ To Be Implemented
3. **Log Streaming** - `docker logs -f` for real-time logs (needs async I/O)
4. **Interactive Terminal** - `docker exec -it` with PTY support (needs PTY library)

**Why Docker Handler IS in Agent:**

The agent runs on the **host machine with Docker**, while the backend may be on a **different machine**. For remote Docker management (Portainer-like functionality):

```
User (Frontend) → Backend (Remote) → Agent (Host with Docker) → Docker Daemon
```

The agent needs to execute Docker commands because:
- ✅ Agent has access to Docker socket
- ✅ Backend may be on different machine
- ✅ Enables remote Docker management
- ✅ Portainer-like functionality

---

## Migration Plan

### Phase 1-5: ✅ COMPLETE
- Core infrastructure
- System metrics
- Process scanning
- Docker monitoring

### Phase 6: Backend Communication (NEXT)
**Implement:**
- HTTP client (libcurl)
- WebSocket client (for real-time updates)
- Metrics batching and transmission
- Heartbeat mechanism

**Files to create:**
- `src/communication/http_client.cpp`
- `src/communication/websocket_client.cpp`
- `src/communication/metrics_sender.cpp`

### Phase 7: Service Detection
**Implement:**
- Service detector (map processes/containers to services)
- Service reporting to backend

**Files to create:**
- `src/detectors/service_detector.cpp`

### Phase 8: Instrumentation Orchestration
**Implement:**
- Instrumentation manager
- Node.js injector integration
- Process monitoring for auto-injection

**Files to create:**
- `src/orchestrator/instrumentation_manager.cpp`

---

## What Stays in Node.js

### Backend Components (Keep)
- `BACKEND/` - Entire backend stays in Node.js
- `frontend/` - Entire frontend stays in React
- `agent/handlers/dockerHandler.js` - Interactive Docker features

### Agent Components (Remove after C++ complete)
- `agent/index.js` - Main agent logic → **Replace with C++ agent**
- `agent/collectors/` - All collectors → **Replaced by C++ collectors**
- `agent/instrumentation/nodejs/` - **Keep** (used by C++ agent for injection)

---

## Final Architecture

```
┌─────────────────────────────────────────┐
│         C++ Core Agent                   │
│  - System metrics                        │
│  - Docker monitoring                     │
│  - Process scanning                      │
│  - Service detection                     │
│  - Backend communication                 │
│  - Instrumentation orchestration         │
└─────────────────────────────────────────┘
                 │
                 │ manages
                 ▼
┌─────────────────────────────────────────┐
│    Language-Specific Injectors          │
│  - agent/instrumentation/nodejs/        │
│  - agent/instrumentation/java/ (future) │
│  - agent/instrumentation/python/ (future)│
└─────────────────────────────────────────┘
                 │
                 │ reports to
                 ▼
┌─────────────────────────────────────────┐
│         Node.js Backend                  │
│  - API endpoints                         │
│  - WebSocket server                      │
│  - Docker handler (interactive features) │
│  - Database                              │
└─────────────────────────────────────────┘
                 │
                 │ serves
                 ▼
┌─────────────────────────────────────────┐
│         React Frontend                   │
│  - Dashboard                             │
│  - APM views                             │
│  - Docker management UI                  │
└─────────────────────────────────────────┘
```

---

## Summary

**C++ Agent Scope:**
- ✅ Metrics collection (system, Docker, processes)
- ✅ Service detection
- ⏳ Backend communication
- ⏳ Instrumentation orchestration

**NOT C++ Agent Scope:**
- ❌ Interactive Docker features (handled by backend)
- ❌ User commands (handled by backend)
- ❌ Frontend UI (handled by React)

**After C++ agent is complete:**
- Delete: `agent/index.js`, `agent/collectors/`
- Keep: `agent/instrumentation/nodejs/` (used by C++ agent)
- Keep: `agent/handlers/` (used by backend, not agent)

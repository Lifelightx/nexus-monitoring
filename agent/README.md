# Nexus C++ Agent

Production-grade system monitoring agent written in C++ for the Nexus Monitoring platform.

## Overview

The Nexus C++ Agent is a high-performance, low-overhead system monitoring agent that:
- Collects system metrics (CPU, memory, disk, network)
- Monitors Docker containers
- Detects and tracks services
- Orchestrates language-specific auto-instrumentation
- Communicates with the Nexus backend via HTTP/WebSocket

## Architecture

```
┌─────────────────────────────────────────┐
│         C++ Core Agent                   │
│  - System Metrics Collector              │
│  - Docker Monitor                        │
│  - Process Scanner                       │
│  - Service Detector                      │
│  - HTTP Client                           │
│  - Instrumentation Orchestrator          │
└─────────────────────────────────────────┘
                 │
                 │ manages
                 ▼
┌─────────────────────────────────────────┐
│    Language-Specific Injectors          │
│  - Node.js (instrumentation/nodejs/)    │
│  - Java (future)                        │
│  - Python (future)                      │
└─────────────────────────────────────────┘
```

## System Requirements

### Operating System
- Linux (Ubuntu 20.04+, Debian 10+, CentOS 8+)
- Kernel 4.15+

### Build Tools
- g++ 11.0+ or clang++ 12.0+
- CMake 3.22+
- pkg-config

### Runtime Dependencies
- libcurl 7.68+
- OpenSSL 1.1+

### Optional
- Docker (for container monitoring)

## Installation

### 1. Install Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libcurl4-openssl-dev \
    libssl-dev \
    nlohmann-json3-dev \
    libspdlog-dev
```

**CentOS/RHEL:**
```bash
sudo yum install -y \
    gcc-c++ \
    cmake \
    pkgconfig \
    libcurl-devel \
    openssl-devel \
    json-devel \
    spdlog-devel
```

### 2. Verify C++ Environment

```bash
# Check g++ version (should be 11.0+)
g++ --version

# Check CMake version (should be 3.22+)
cmake --version

# Check pkg-config
pkg-config --version
```

### 3. Build the Agent

```bash
cd agent/cpp
mkdir build && cd build
cmake ..
make -j$(nproc)
```

### 4. Install

```bash
sudo make install
```

This installs:
- Binary: `/opt/nexus-agent/bin/nexus-agent`
- Config: `/etc/nexus-agent/agent.conf`
- Logs: `/var/log/nexus-agent/`
- Systemd service: `/etc/systemd/system/nexus-agent.service`

### 5. Configure

Edit `/etc/nexus-agent/agent.conf`:

```ini
[agent]
name = my-server
backend_url = http://your-backend:3000
heartbeat_interval = 30

[metrics]
collection_interval = 5
batch_size = 10

[docker]
socket_path = /var/run/docker.sock
enabled = true

[instrumentation]
nodejs_enabled = true
nodejs_injector_path = /opt/nexus-agent/instrumentation/nodejs

[logging]
level = info
file = /var/log/nexus-agent/agent.log
```

### 6. Start the Agent

```bash
# Start service
sudo systemctl start nexus-agent

# Enable on boot
sudo systemctl enable nexus-agent

# Check status
sudo systemctl status nexus-agent

# View logs
sudo journalctl -u nexus-agent -f
```

## Development

### Project Structure

```
cpp/
├── CMakeLists.txt              # Build configuration
├── README.md                   # This file
├── src/                        # Source files
│   ├── main.cpp
│   ├── collectors/
│   │   ├── system_metrics.cpp
│   │   ├── docker_monitor.cpp
│   │   └── process_scanner.cpp
│   ├── detectors/
│   │   └── service_detector.cpp
│   ├── communication/
│   │   ├── http_client.cpp
│   │   └── websocket_client.cpp
│   ├── orchestrator/
│   │   └── instrumentation_manager.cpp
│   └── utils/
│       ├── logger.cpp
│       └── config.cpp
├── include/                    # Header files
│   └── nexus/
│       ├── collectors/
│       ├── detectors/
│       ├── communication/
│       └── orchestrator/
├── config/                     # Configuration files
│   └── agent.conf
└── tests/                      # Unit tests
    └── ...
```

### Building for Development

```bash
# Debug build
cd agent/cpp
mkdir build-debug && cd build-debug
cmake -DCMAKE_BUILD_TYPE=Debug ..
make -j$(nproc)

# Run
./nexus-agent --config ../config/agent.conf
```

### Running Tests

```bash
cd build
make test
```

### Code Style

- C++17 standard
- Google C++ Style Guide
- Use smart pointers (no raw `new`/`delete`)
- RAII for resource management
- Const-correctness

## Usage

### Command Line Options

```bash
nexus-agent [OPTIONS]

Options:
  -c, --config FILE     Configuration file (default: /etc/nexus-agent/agent.conf)
  -d, --daemon          Run as daemon
  -v, --verbose         Verbose logging
  -h, --help            Show help
  --version             Show version
```

### Examples

**Run with custom config:**
```bash
nexus-agent --config /path/to/agent.conf
```

**Run in foreground (for debugging):**
```bash
nexus-agent --verbose
```

**Check version:**
```bash
nexus-agent --version
```

## Features

### System Metrics Collection

Collects every 5 seconds:
- **CPU:** Per-core and total usage, load average
- **Memory:** Total, used, free, cached, swap
- **Disk:** I/O stats, usage per mount point
- **Network:** Bytes sent/received per interface

### Docker Monitoring

- List running containers
- Container stats (CPU, memory, network)
- Container lifecycle events
- Execute Docker commands (start, stop, restart)

### Process Scanning

- Detect all running processes
- Identify process type (Node.js, Java, Python, etc.)
- Extract metadata (PID, command, ports)
- Monitor process lifecycle

### Service Detection

- Identify services from processes
- Map processes to containers
- Detect service type and version
- Track service endpoints

### Auto-Instrumentation

- Detect instrumentable processes
- Inject Node.js instrumentation automatically
- Manage injector lifecycle
- Future: Java, Python support

## Performance

- **CPU Usage:** < 1% (idle), < 5% (active)
- **Memory Usage:** < 50MB
- **Startup Time:** < 1 second
- **Overhead:** Minimal impact on monitored applications

## Troubleshooting

### Agent won't start

**Check logs:**
```bash
sudo journalctl -u nexus-agent -n 50
```

**Common issues:**
- Missing dependencies: `ldd /opt/nexus-agent/bin/nexus-agent`
- Permission issues: Agent needs root for Docker socket access
- Config errors: Validate `/etc/nexus-agent/agent.conf`

### No metrics in backend

**Check connectivity:**
```bash
curl -v http://your-backend:3000/health
```

**Check agent logs:**
```bash
tail -f /var/log/nexus-agent/agent.log
```

### Docker monitoring not working

**Check Docker socket:**
```bash
ls -l /var/run/docker.sock
sudo docker ps
```

**Ensure agent has access:**
```bash
sudo usermod -aG docker nexus-agent
```

### High CPU usage

**Check collection interval:**
```ini
[metrics]
collection_interval = 10  # Increase from 5
```

**Reduce batch size:**
```ini
[metrics]
batch_size = 5  # Decrease from 10
```

## Uninstallation

```bash
# Stop service
sudo systemctl stop nexus-agent
sudo systemctl disable nexus-agent

# Remove files
sudo rm -rf /opt/nexus-agent
sudo rm /etc/systemd/system/nexus-agent.service
sudo rm -rf /etc/nexus-agent
sudo rm -rf /var/log/nexus-agent

# Reload systemd
sudo systemctl daemon-reload
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

See [LICENSE](../../LICENSE) for license information.

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/nexus-monitoring/issues
- Documentation: https://docs.nexus-monitoring.com

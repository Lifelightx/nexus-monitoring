# C++ Agent - Build Instructions

## Quick Start

```bash
cd agent/cpp

# Create build directory
mkdir build && cd build

# Configure with CMake
cmake ..

# Build
make -j$(nproc)

# Test
./nexus-agent --version
./nexus-agent --help
```

## Build Output

**Binary:** `build/nexus-agent`
**Size:** ~2MB (debug), ~500KB (release)

## Running the Agent

```bash
# Run with default config
./nexus-agent

# Run with custom config
./nexus-agent --config ../config/agent.conf

# Run in foreground (for debugging)
./nexus-agent --verbose
```

## Development Build

```bash
# Debug build (with symbols)
mkdir build-debug && cd build-debug
cmake -DCMAKE_BUILD_TYPE=Debug ..
make -j$(nproc)

# Release build (optimized)
mkdir build-release && cd build-release
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
```

## Clean Build

```bash
cd build
make clean
# or
rm -rf build && mkdir build && cd build && cmake .. && make
```

## Installation

```bash
cd build
sudo make install
```

This installs:
- `/opt/nexus-agent/bin/nexus-agent`
- `/etc/nexus-agent/agent.conf`
- `/var/log/nexus-agent/` (directory)

## Current Status

✅ **Phase 1 Complete:** Core Infrastructure
- [x] CMake build system
- [x] Logger (spdlog)
- [x] Configuration parser (INI format)
- [x] Main entry point with signal handling
- [x] Successful compilation

**Next:** Phase 2 - Implement metrics collectors

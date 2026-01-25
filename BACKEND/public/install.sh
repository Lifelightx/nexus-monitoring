#!/bin/bash

# Nexus Agent Installation Script (Linux)

set -e

SERVER_URL=$1
AGENT_TOKEN=$2
INSTALL_DIR="/opt/nexus-agent"
CONFIG_DIR="/etc/nexus-agent"
BINARY_NAME="nexus-agent" # Renamed to match build output usually, but serving as agent-linux

if [ -z "$SERVER_URL" ] || [ -z "$AGENT_TOKEN" ]; then
    echo "Usage: $0 <SERVER_URL> <AGENT_TOKEN>"
    exit 1
fi

echo "Installing Nexus Agent (Linux)..."
echo "Server: $SERVER_URL"

# 1. Setup Directories
echo "Setting up directories..."
sudo mkdir -p "$INSTALL_DIR/bin"
sudo mkdir -p "$CONFIG_DIR"
sudo mkdir -p "/var/log/nexus-agent"

# 2. Download Binary
echo "Downloading agent binary..."
# Note: The route serves 'agent-linux'
sudo curl -sL "$SERVER_URL/api/install/files/agent-linux" -o "$INSTALL_DIR/bin/$BINARY_NAME"
sudo chmod +x "$INSTALL_DIR/bin/$BINARY_NAME"

# 2.5 Download Agent Instrumentation (Bundled)
echo "Downloading bundled agent instrumentation..."
sudo curl -sL "$SERVER_URL/api/install/instrumentation" -o "$INSTALL_DIR/instrumentation.tar.gz"

# Extract directly to install dir
# Tarball contains 'instrumentation/...' so it will create $INSTALL_DIR/instrumentation
sudo tar xzf "$INSTALL_DIR/instrumentation.tar.gz" -C "$INSTALL_DIR"
sudo rm "$INSTALL_DIR/instrumentation.tar.gz"

# Ensure permissions
sudo chown -R root:root "$INSTALL_DIR/instrumentation"
sudo chmod -R 755 "$INSTALL_DIR/instrumentation"

# 3. Configure Agent (INI Format)
echo "Configuring agent..."
cat <<EOF | sudo tee "$CONFIG_DIR/agent.conf"
[agent]
name = $(hostname)
backend_url = $SERVER_URL
token = $AGENT_TOKEN
command_poll_ms = 500

[metrics]
collection_interval = 5

[docker]
enabled = true
socket_path = /var/run/docker.sock

[logging]
level = info
file = /var/log/nexus-agent/agent.log
EOF

# 4. Setup Systemd Service
echo "Setting up systemd service..."
cat <<EOF | sudo tee /etc/systemd/system/nexus-agent.service
[Unit]
Description=Nexus Monitoring Agent
After=network.target docker.service
Requires=network.target

[Service]
Type=simple
User=root
ExecStart=$INSTALL_DIR/bin/$BINARY_NAME --config $CONFIG_DIR/agent.conf
Restart=always
RestartSec=5
StandardOutput=append:/var/log/nexus-agent/agent.log
StandardError=append:/var/log/nexus-agent/agent.log

[Install]
WantedBy=multi-user.target
EOF

# 5. Start Service
# 5. Start Service
echo "Starting agent service..."
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl restart nexus-agent

# ---------------------------------------------------------
# 6. Install OpenTelemetry Collector (Host)
# ---------------------------------------------------------
echo "---------------------------------------------------------"
echo "Installing OpenTelemetry Collector..."
echo "---------------------------------------------------------"

OTEL_VERSION="0.93.0"
OTEL_ARCH="amd64" # Assuming amd64 for now, script is usually run on x86 servers
BINARY_URL="https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_linux_${OTEL_ARCH}.tar.gz"
OTEL_INSTALL_DIR="/opt/otel-collector"
OTEL_CONFIG_FILE="/etc/otel-collector/config.yaml"
OTEL_ENV_FILE="/etc/default/otel-collector"

sudo mkdir -p "$OTEL_INSTALL_DIR/bin"
sudo mkdir -p "/etc/otel-collector"

# Download Binary
echo "⬇️  Downloading otelcol-contrib v${OTEL_VERSION}..."
sudo curl -s -L -o /tmp/otelcol.tar.gz "$BINARY_URL"
sudo tar -xzf /tmp/otelcol.tar.gz -C "$OTEL_INSTALL_DIR/bin" otelcol-contrib
sudo rm /tmp/otelcol.tar.gz
sudo chmod +x "$OTEL_INSTALL_DIR/bin/otelcol-contrib"

# Download Config
echo "⬇️  Downloading collector config..."
sudo curl -sL "$SERVER_URL/api/install/config/otel-collector" -o "$OTEL_CONFIG_FILE"

# Setup Environment File
# Use provided env vars or defaults
CLICKHOUSE_HOST=${CLICKHOUSE_HOST:-"127.0.0.1"}
CLICKHOUSE_PORT=${CLICKHOUSE_NATIVE_PORT:-"30900"} # Use Native Port (TCP)
VM_HOST=${VM_HOST:-"127.0.0.1"}
VM_PORT=${VM_PORT:-"30428"}

echo "Configuring environment..."
cat <<EOF | sudo tee "$OTEL_ENV_FILE"
CLICKHOUSE_HOST=$CLICKHOUSE_HOST
CLICKHOUSE_PORT=$CLICKHOUSE_PORT
VM_HOST=$VM_HOST
VM_PORT=$VM_PORT
EOF

# Setup Service
echo "Setting up otel-collector service..."
cat <<EOF | sudo tee /etc/systemd/system/otel-collector.service
[Unit]
Description=OpenTelemetry Collector Contrib
After=network.target

[Service]
EnvironmentFile=$OTEL_ENV_FILE
ExecStart=$OTEL_INSTALL_DIR/bin/otelcol-contrib --config=$OTEL_CONFIG_FILE
Restart=always
User=root
# Adjust memory limit as needed
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Start Collector
echo "Starting otel-collector service..."
sudo systemctl daemon-reload
sudo systemctl enable otel-collector
sudo systemctl restart otel-collector

echo "✅ Nexus Agent AND OpenTelemetry Collector installed successfully!"

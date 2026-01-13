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
echo "Starting agent service..."
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl restart nexus-agent

echo "✅ Nexus Agent installed and started successfully!"

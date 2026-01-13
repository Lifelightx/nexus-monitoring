#!/bin/bash

# Nexus Agent Installation Script (MacOS)

set -e

SERVER_URL=$1
AGENT_TOKEN=$2
INSTALL_DIR="/usr/local/nexus-agent"
CONFIG_DIR="/usr/local/etc/nexus-agent"
LOG_DIR="/var/log/nexus-agent"
BINARY_NAME="nexus-agent"

if [ -z "$SERVER_URL" ] || [ -z "$AGENT_TOKEN" ]; then
    echo "Usage: $0 <SERVER_URL> <AGENT_TOKEN>"
    exit 1
fi

echo "Installing Nexus Agent (MacOS)..."
echo "Server: $SERVER_URL"

if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo"
  exit 1
fi

# 1. Setup Directories
echo "Setting up directories..."
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"

# 2. Download Binary
echo "Downloading agent binary..."
curl -sL "$SERVER_URL/api/install/files/agent-macos" -o "$INSTALL_DIR/bin/$BINARY_NAME"
chmod +x "$INSTALL_DIR/bin/$BINARY_NAME"

# 3. Configure Agent
echo "Configuring agent..."
cat <<EOF > "$CONFIG_DIR/agent.conf"
[agent]
name = sysProbe-$(hostname)
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
file = $LOG_DIR/agent.log
EOF

# 4. Setup Launchd Service
echo "Setting up Launchd service..."
PLIST_PATH="/Library/LaunchDaemons/com.nexus.agent.plist"

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nexus.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/bin/$BINARY_NAME</string>
        <string>--config</string>
        <string>$CONFIG_DIR/agent.conf</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/agent.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/agent.log</string>
</dict>
</plist>
EOF

# 5. Load Service
echo "Starting agent service..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load -w "$PLIST_PATH"

echo "✅ Nexus Agent installed and started successfully!"

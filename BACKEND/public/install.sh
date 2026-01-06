#!/bin/bash

# Nexus Agent Installation Script (Standalone Binary Version)

set -e

SERVER_URL=$1
AGENT_TOKEN=$2
INSTALL_DIR="/opt/nexus-agent"
BINARY_NAME="agent-linux"

if [ -z "$SERVER_URL" ] || [ -z "$AGENT_TOKEN" ]; then
    echo "Usage: $0 <SERVER_URL> <AGENT_TOKEN>"
    exit 1
fi

echo "Installing Nexus Agent (Standalone)..."
echo "Server: $SERVER_URL"

# ==========================================
# 1. SETUP DIRECTORY
# ==========================================
echo "Setting up directory..."
sudo mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# ==========================================
# 2. DOWNLOAD AGENT BINARY
# ==========================================
echo "Downloading agent binary..."
sudo curl -sL "$SERVER_URL/api/install/files/agent-linux" -o "$BINARY_NAME"
sudo chmod +x "$BINARY_NAME"

# ==========================================
# 3. CONFIGURE AGENT
# ==========================================
echo "Configuring agent..."
cat <<EOF | sudo tee .env
SERVER_URL=$SERVER_URL
AGENT_TOKEN=$AGENT_TOKEN
AGENT_NAME=$(hostname)
INTERVAL=5000
EOF

# ==========================================
# 4. SETUP SYSTEMD SERVICE
# ==========================================
echo "Setting up systemd service..."

cat <<EOF | sudo tee /etc/systemd/system/nexus-agent.service
[Unit]
Description=Nexus Monitor Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/$BINARY_NAME
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Check for Docker (Optional)
if command -v docker &> /dev/null; then
    echo "Docker found. Agent will monitor Docker containers."
    sudo sed -i 's/After=network.target/After=network.target docker.service\nRequires=docker.service/' /etc/systemd/system/nexus-agent.service
else
    echo "Docker NOT found. Agent will run in system-only mode."
fi

# ==========================================
# 5. START SERVICE
# ==========================================
echo "Starting agent service..."
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl restart nexus-agent

echo "✅ Nexus Agent installed and started successfully!"
echo "   Service binary: $INSTALL_DIR/$BINARY_NAME"

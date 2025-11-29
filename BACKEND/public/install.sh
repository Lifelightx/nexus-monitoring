#!/bin/bash

# Nexus Agent Installation Script

set -e

SERVER_URL=$1
AGENT_TOKEN=$2
INSTALL_DIR="/opt/nexus-agent"

if [ -z "$SERVER_URL" ] || [ -z "$AGENT_TOKEN" ]; then
    echo "Usage: $0 <SERVER_URL> <AGENT_TOKEN>"
    exit 1
fi

echo "Installing Nexus Agent..."
echo "Server: $SERVER_URL"

# 1. Install Dependencies (Node.js only)
echo "Installing dependencies..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y curl nodejs npm
elif command -v yum &> /dev/null; then
    sudo yum install -y curl nodejs npm
fi

# 2. Setup Directory
echo "Setting up directory..."
sudo mkdir -p $INSTALL_DIR/agent/collectors
cd $INSTALL_DIR/agent

# 3. Download Agent Files
echo "Downloading agent files..."
FILES="index.js package.json collectors/systemCollector.js collectors/dockerCollector.js collectors/agentCollector.js"

for FILE in $FILES; do
    echo "Downloading $FILE..."
    # Create directory if it doesn't exist (for nested files)
    DIR=$(dirname "$FILE")
    if [ "$DIR" != "." ]; then
        sudo mkdir -p "$DIR"
    fi
    
    sudo curl -sL "$SERVER_URL/api/install/files/$FILE" -o "$FILE"
done

# 4. Install Node Modules
echo "Installing node modules..."
sudo npm install

# 5. Configure Agent
echo "Configuring agent..."
cat <<EOF | sudo tee .env
SERVER_URL=$SERVER_URL
AGENT_TOKEN=$AGENT_TOKEN
AGENT_NAME=$(hostname)
INTERVAL=5000
EOF

# 6. Setup Systemd Service
echo "Setting up systemd service..."
cat <<EOF | sudo tee /etc/systemd/system/nexus-agent.service
[Unit]
Description=Nexus Monitor Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/agent
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 7. Check for Docker (Optional)
if command -v docker &> /dev/null; then
    echo "Docker found. Agent will monitor Docker containers."
    # Ensure service waits for Docker if present
    sudo sed -i 's/After=network.target/After=network.target docker.service\nRequires=docker.service/' /etc/systemd/system/nexus-agent.service
else
    echo "Docker NOT found. Agent will run in system-only mode."
fi

# 8. Start Service
echo "Starting agent service..."
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl restart nexus-agent

echo "Nexus Agent installed and started successfully!"

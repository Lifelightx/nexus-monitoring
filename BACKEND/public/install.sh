#!/bin/bash

# Nexus Agent Installation Script (Robust/Practical Version)

set -e

SERVER_URL=$1
AGENT_TOKEN=$2
INSTALL_DIR="/opt/nexus-agent"
NODE_BIN=""

if [ -z "$SERVER_URL" ] || [ -z "$AGENT_TOKEN" ]; then
    echo "Usage: $0 <SERVER_URL> <AGENT_TOKEN>"
    exit 1
fi

echo "Installing Nexus Agent..."
echo "Server: $SERVER_URL"

# ==========================================
# 1. ROBUST NODE.JS v22 DETECTION & INSTALL
# ==========================================

# Function to find any usable Node v22 binary (System or NVM)
find_node_v22() {
    # Method A: Check current path (what 'which node' sees)
    LOCAL_NODE=$(command -v node)
    if [ -n "$LOCAL_NODE" ]; then
        VER=$("$LOCAL_NODE" -v 2>/dev/null)
        if [[ "$VER" == v22* ]]; then
            echo "$LOCAL_NODE"
            return
        fi
    fi

    # Method B: Check NVM locations explicitly
    # This finds NVM nodes even if sudo environment hides them
    # Searches in /home/*/.nvm/versions/node/v22*/bin/node
    NVM_NODE=$(find /home -maxdepth 6 -path "*/.nvm/versions/node/v22*/bin/node" 2>/dev/null | sort -V | tail -n 1)
    if [ -n "$NVM_NODE" ]; then
        echo "$NVM_NODE"
        return
    fi
}

echo "Checking for existing Node.js v22..."
DETECTED_NODE=$(find_node_v22)

if [ -n "$DETECTED_NODE" ]; then
    echo "✅ Found existing Node.js v22 at: $DETECTED_NODE"
    echo "Skipping Node installation."
    NODE_BIN="$DETECTED_NODE"
else
    echo "⚠️ Node.js v22 not found. Proceeding with installation..."
    
    # Conflict Resolution: Remove known conflicting packages common in old setups
    if command -v apt-get &> /dev/null; then
        echo "Removing potential conflicting packages (libnode-dev, libnode72)..."
        sudo apt-get remove -y libnode-dev libnode72 2>/dev/null || true
        sudo apt-get autoremove -y 2>/dev/null || true
        
        echo "Installing Node.js v22 via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
        NODE_BIN=$(command -v node)
    elif command -v yum &> /dev/null; then
        echo "Installing Node.js v22 via NodeSource..."
        curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
        sudo yum install -y nodejs
        NODE_BIN=$(command -v node)
    else
        echo "❌ Error: Unsupported package manager. Please install Node.js v22 manually."
        exit 1
    fi
fi

if [ -z "$NODE_BIN" ]; then
    echo "❌ CRITICAL: Failed to determine Node binary path. Exiting."
    exit 1
fi

echo "Using Node binary for setup: $NODE_BIN"


# ==========================================
# 2. SETUP DIRECTORY & FILES
# ==========================================
echo "Setting up directory..."
sudo mkdir -p $INSTALL_DIR/agent/collectors
cd $INSTALL_DIR/agent

echo "Downloading agent files..."
FILES="index.js package.json collectors/systemCollector.js collectors/dockerCollector.js collectors/agentCollector.js handlers/dockerHandler.js"

for FILE in $FILES; do
    echo "Downloading $FILE..."
    # Create directory if it doesn't exist
    DIR=$(dirname "$FILE")
    if [ "$DIR" != "." ]; then
        sudo mkdir -p "$DIR"
    fi
    
    sudo curl -sL "$SERVER_URL/api/install/files/$FILE" -o "$FILE"
done


# ==========================================
# 3. INSTALL DEPENDENCIES (npm install)
# ==========================================
echo "Installing node modules..."

# Try to find npm relative to the node binary first
NODE_DIR=$(dirname "$NODE_BIN")
NPM_BIN="$NODE_DIR/npm"

if [ ! -x "$NPM_BIN" ]; then
    # Fallback to system npm
    NPM_BIN=$(command -v npm)
fi

if [ -x "$NPM_BIN" ]; then
    echo "Using npm at: $NPM_BIN"
    # Run npm install using the specific node binary implicitly or system
    sudo "$NPM_BIN" install
else
    echo "⚠️ Warning: npm not found at expected location. Trying standard 'npm install'..."
    sudo npm install
fi


# ==========================================
# 4. CONFIGURE AGENT
# ==========================================
echo "Configuring agent..."
cat <<EOF | sudo tee .env
SERVER_URL=$SERVER_URL
AGENT_TOKEN=$AGENT_TOKEN
AGENT_NAME=$(hostname)
INTERVAL=5000
EOF


# ==========================================
# 5. SETUP SYSTEMD SERVICE
# ==========================================
echo "Setting up systemd service..."

# Use the explicitly found NODE_BIN in the service file
cat <<EOF | sudo tee /etc/systemd/system/nexus-agent.service
[Unit]
Description=Nexus Monitor Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/agent
ExecStart=$NODE_BIN index.js
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
# 6. START SERVICE
# ==========================================
echo "Starting agent service..."
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl restart nexus-agent

echo "✅ Nexus Agent installed and started successfully!"
echo "   Node Version: $($NODE_BIN -v)"
echo "   Service Path: $NODE_BIN"

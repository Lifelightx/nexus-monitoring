# Nexus Monitoring Deployment Guide

This guide explains how to deploy the Nexus Monitoring application (Backend, Frontend, and MongoDB) to a single AWS EC2 instance using Docker Compose.

## Prerequisites
- An AWS Account.
- AWS CLI configured or access to AWS Console.
- `nexus-monitoring` codebase with built agent binaries (`agent/build`) and assets (`agent/assets`).

## Step 1: Launch AWS EC2 Instance

1.  **Launch Instance**: Go to AWS EC2 Console > Launch Instances.
2.  **OS**: Choose **Ubuntu Server 22.04 LTS** (recommended for ease of use).
3.  **Instance Type**: `t2.micro` or `t3.micro` (Free Tier eligible).
4.  **Key Pair**: Create or use existing key pair (e.g., `nexus-key.pem`) to SSH into the machine.
5.  **Security Group**:
    - Allow **SSH (22)** from your IP.
    - Allow **HTTP (80)** from Anywhere (0.0.0.0/0).
    - Allow **Custom TCP (3000)** from Anywhere (0.0.0.0/0) (for direct backend access/agents).

## Step 2: Prepare the Instance

SSH into your instance:
```bash
chmod 400 nexus-key.pem
ssh -i "nexus-key.pem" ubuntu@<EC2-PUBLIC-IP>
```

Install Docker and Docker Compose:
```bash
# Update packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key:
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
sudo docker compose version
```

## Step 3: Deployment

### Option A: Clone from Git (Recommended)
If your code is in a Git repository:
1.  Clone the repo: `git clone <your-repo-url> nexus-monitoring`
2.  `cd nexus-monitoring`
3.  Make sure build artifacts (`agent/build`, etc.) are present. If you don't commit build artifacts, you'll need to build them on the server or use Option B.

### Option B: Upload Files via SCP
If your code is local:
```bash
# From your local machine
# Compress the project first to speed up upload
tar --exclude='node_modules' --exclude='.git' -czf nexus-deploy.tar.gz .

# Upload to EC2
scp -i "nexus-key.pem" nexus-deploy.tar.gz ubuntu@<EC2-PUBLIC-IP>:~/

# On EC2
tar -xzf nexus-deploy.tar.gz -C nexus-monitoring
cd nexus-monitoring
```

## Step 4: Run the Application

Run Docker Compose using the production file:
```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

**Verify the deployment:**
1.  **Frontend**: Open `http://<EC2-PUBLIC-IP>` in your browser. You should see the login/dashboard.
2.  **Backend Status**: `http://<EC2-PUBLIC-IP>:3000` (if you have a root route) or check logs:
    ```bash
    sudo docker compose -f docker-compose.prod.yml logs -f nexus-backend
    ```
3.  **Agent Download**:
    - Binaries: `http://<EC2-PUBLIC-IP>:3000/api/install/files/agent-linux`
    - Instrumentation: `http://<EC2-PUBLIC-IP>:3000/api/install/instrumentation`

## Step 5: Connect Agents

When installing an agent on another machine, use the EC2 IP as the host:
- `SERVER_HOST`: `<EC2-PUBLIC-IP>`
- `SERVER_PORT`: `3000` (or `80` if using the Nginx proxy path, but agents typically default to direct port 3000).

```bash
# Example agent config
SERVER_URL=http://<EC2-PUBLIC-IP>:3000
```

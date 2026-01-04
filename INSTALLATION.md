# Nexus Monitoring Agent - Cross-Platform Installation Guide

## Platform Support

The Nexus Monitoring Agent **supports both Windows and Linux** platforms:

✅ **Linux** (Ubuntu, Debian, CentOS, RHEL, etc.)  
✅ **Windows** (Windows 10, Windows Server 2016+)

The agent automatically detects the operating system and uses platform-specific commands for:
- System metrics collection (CPU, Memory, Disk, Network)
- Security monitoring (failed logins, sudo usage)
- Docker container monitoring
- File system scanning

---

## Installation Methods

### 🐧 Linux Installation

#### Prerequisites
- Node.js v16+ (automatically installed by script if not present)
- `curl` or `wget`
- `sudo` access

#### Quick Install (Recommended)
```bash
# 1. Get your installation token from the dashboard
# 2. Run the installation script
curl -sL http://YOUR_SERVER:3000/api/install/script | sudo bash -s http://YOUR_SERVER:3000 YOUR_TOKEN
```

#### Manual Installation
```bash
# 1. Clone or download the agent
git clone https://github.com/your-org/nexus-agent.git
cd nexus-agent

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
SERVER_URL=http://YOUR_SERVER:3000
AGENT_TOKEN=YOUR_TOKEN
AGENT_NAME=$(hostname)
INTERVAL=5000
EOF

# 4. Start the agent
node index.js

# 5. (Optional) Set up as systemd service
sudo cp nexus-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl start nexus-agent
```

---

### 🪟 Windows Installation

#### Prerequisites
- Node.js v16+ ([Download](https://nodejs.org/))
- PowerShell (Administrator)

#### Quick Install (Recommended)
```powershell
# 1. Open PowerShell as Administrator
# 2. Get your installation token from the dashboard
# 3. Run the installation script

# Download and run the script
Invoke-WebRequest -Uri "http://YOUR_SERVER:3000/api/install/script/windows" -OutFile "$env:TEMP\install-nexus.ps1"
& "$env:TEMP\install-nexus.ps1" -ServerUrl "http://YOUR_SERVER:3000" -AgentToken "YOUR_TOKEN"
```

#### Manual Installation
```powershell
# 1. Download the agent files
git clone https://github.com/your-org/nexus-agent.git
cd nexus-agent

# 2. Install dependencies
npm install

# 3. Create .env file
@"
SERVER_URL=http://YOUR_SERVER:3000
AGENT_TOKEN=YOUR_TOKEN
AGENT_NAME=$env:COMPUTERNAME
INTERVAL=5000
"@ | Out-File -FilePath .env -Encoding UTF8

# 4. Start the agent
node index.js

# 5. (Optional) Install as Windows Service using NSSM
# Download NSSM from https://nssm.cc/download
nssm install NexusAgent "C:\Program Files\nodejs\node.exe" "C:\path\to\agent\index.js"
nssm set NexusAgent AppDirectory "C:\path\to\agent"
nssm start NexusAgent
```

---

## Platform-Specific Features

### Linux
- **Security Monitoring**: Failed login attempts (`lastb`), sudo usage (`auth.log`)
- **Disk Scanning**: Uses `find` command for efficient file scanning
- **Service Management**: Systemd integration
- **Docker**: Full Docker support via Unix socket

### Windows
- **Security Monitoring**: Failed login events (Event ID 4625)
- **Disk Scanning**: PowerShell `Get-ChildItem` for file scanning
- **Service Management**: Windows Service via NSSM
- **Docker**: Full Docker Desktop support

---

## Verification

### Check Agent Status

**Linux:**
```bash
# Check service status
sudo systemctl status nexus-agent

# View logs
sudo journalctl -u nexus-agent -f

# Check if agent is running
ps aux | grep node
```

**Windows:**
```powershell
# Check service status
Get-Service -Name NexusAgent

# View logs
Get-Content "C:\Program Files\nexus-agent\agent\logs\stdout.log" -Tail 50

# Check if agent is running
Get-Process -Name node
```

### Dashboard Verification
1. Open your Nexus dashboard
2. Navigate to "Servers" page
3. Your agent should appear within 5-10 seconds
4. Status should show as "Online" with a green indicator

---

## Troubleshooting

### Common Issues

#### Agent Not Appearing in Dashboard

**Check 1: Network Connectivity**
```bash
# Linux
curl http://YOUR_SERVER:3000/api/agents

# Windows
Invoke-WebRequest -Uri "http://YOUR_SERVER:3000/api/agents"
```

**Check 2: Token Validity**
- Ensure the `AGENT_TOKEN` in `.env` is correct
- Tokens expire after 30 days by default

**Check 3: Firewall**
- **Linux**: Check `iptables` or `ufw`
- **Windows**: Check Windows Firewall settings

#### High CPU Usage
- Reduce `INTERVAL` in `.env` (default: 5000ms)
- Disable disk scanning if not needed
- Check for Docker containers with high resource usage

#### Permission Errors (Linux)
```bash
# Ensure agent has Docker access
sudo usermod -aG docker $USER

# Restart agent
sudo systemctl restart nexus-agent
```

#### Service Won't Start (Windows)
```powershell
# Check NSSM logs
nssm status NexusAgent

# Manually test the agent
cd "C:\Program Files\nexus-agent\agent"
node index.js
```

---

## Uninstallation

### Linux
```bash
# Stop and disable service
sudo systemctl stop nexus-agent
sudo systemctl disable nexus-agent

# Remove service file
sudo rm /etc/systemd/system/nexus-agent.service
sudo systemctl daemon-reload

# Remove agent files
sudo rm -rf /opt/nexus-agent
```

### Windows
```powershell
# Stop and remove service
nssm stop NexusAgent
nssm remove NexusAgent confirm

# Remove agent files
Remove-Item -Path "C:\Program Files\nexus-agent" -Recurse -Force

# Remove NSSM (optional)
Remove-Item -Path "C:\nssm" -Recurse -Force
```

---

## Advanced Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_URL` | Backend server URL | Required |
| `AGENT_TOKEN` | Authentication token | Required |
| `AGENT_NAME` | Agent display name | Hostname |
| `INTERVAL` | Metrics collection interval (ms) | 5000 |

### Custom Agent Name
```bash
# Linux
echo "AGENT_NAME=production-server-01" >> .env

# Windows
Add-Content -Path .env -Value "AGENT_NAME=production-server-01"
```

### Adjust Collection Interval
```bash
# Collect metrics every 10 seconds instead of 5
echo "INTERVAL=10000" >> .env
```

---

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS for `SERVER_URL` in production
2. **Rotate Tokens**: Regenerate agent tokens periodically
3. **Firewall Rules**: Only allow outbound connections to your server
4. **Run as Service**: Use systemd (Linux) or Windows Service (Windows)
5. **Monitor Logs**: Regularly check agent logs for errors or warnings

---

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-org/nexus-monitoring/issues)
- Review the [Documentation](https://docs.nexus-monitoring.com)
- Contact support at support@nexus-monitoring.com

---

## Summary

✅ **Cross-platform support**: Works on both Linux and Windows  
✅ **Easy installation**: One-command install scripts for both platforms  
✅ **Automatic service setup**: Systemd (Linux) or Windows Service  
✅ **Real-time monitoring**: Instant updates via WebSocket  
✅ **Docker support**: Full container monitoring on both platforms  

The agent is production-ready and battle-tested on both operating systems!

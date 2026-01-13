<#
.SYNOPSIS
Nexus Agent Installation Script (Windows)
#>

param (
    [string]$ServerUrl,
    [string]$AgentToken
)

if (-not $ServerUrl -or -not $AgentToken) {
    Write-Host "Usage: .\install.ps1 -ServerUrl <URL> -AgentToken <TOKEN>" -ForegroundColor Red
    exit 1
}

$InstallDir = "C:\Program Files\NexusAgent"
$ConfigDir = "C:\ProgramData\NexusAgent"
$LogDir = "C:\ProgramData\NexusAgent\logs"
$BinaryPath = "$InstallDir\nexus-agent.exe"
$ConfigPath = "$ConfigDir\agent.conf"

Write-Host "Installing Nexus Agent (Windows)..." -ForegroundColor Cyan
Write-Host "Server: $ServerUrl"

# 1. Create Directories
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# 2. Download Binary
Write-Host "Downloading agent binary..."
try {
    Invoke-WebRequest -Uri "$ServerUrl/api/install/files/agent-windows.exe" -OutFile $BinaryPath
} catch {
    Write-Host "Failed to download agent binary: $_" -ForegroundColor Red
    exit 1
}

# 3. Configure Agent
Write-Host "Configuring agent..."
$Hostname = $env:COMPUTERNAME
$ConfigContent = @"
[agent]
name = sysProbe-$Hostname
backend_url = $ServerUrl
token = $AgentToken
command_poll_ms = 500

[metrics]
collection_interval = 5

[docker]
enabled = false
# socket_path is typically named pipe on Windows: //./pipe/docker_engine
socket_path = //./pipe/docker_engine

[logging]
level = info
file = $LogDir\agent.log
"@

Set-Content -Path $ConfigPath -Value $ConfigContent

# 4. Register Service
Write-Host "Registering service..."
$ServiceName = "NexusAgent"

# Stop if exists
if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
    # Start-Process usually needed for sc.exe delete if standard cmdlet fails, but let's try New-Service -Force logic or sc.
    # PowerShell New-Service doesn't support overwrite easily.
    sc.exe stop $ServiceName
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Create Service
# Note: BinPath must include arguments
$BinPathWithArgs = "`"$BinaryPath`" --config `"$ConfigPath`""
sc.exe create $ServiceName binPath= $BinPathWithArgs start= auto DisplayName= "Nexus Monitoring Agent"
sc.exe description $ServiceName "Monitoring agent for Nexus platform"

# 5. Start Service
Write-Host "Starting service..."
Start-Service $ServiceName

Write-Host "✅ Nexus Agent installed and started successfully!" -ForegroundColor Green

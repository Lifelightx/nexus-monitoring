# Nexus Agent Installation Script for Windows (Standalone Binary Version)
# Run this script in PowerShell as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentToken,
    
    [string]$InstallDir = "C:\Program Files\nexus-agent",
    [string]$AgentName = $env:COMPUTERNAME
)

Write-Host "Installing Nexus Agent (Standalone)..." -ForegroundColor Cyan
Write-Host "Server: $ServerUrl"
Write-Host "Agent Name: $AgentName"

# ==========================================
# 1. CREATE INSTALLATION DIRECTORY
# ==========================================
Write-Host "`nSetting up installation directory..." -ForegroundColor Yellow

if (Test-Path $InstallDir) {
    Write-Host "⚠️  Installation directory already exists. Removing old files..." -ForegroundColor Yellow
    Remove-Item -Path $InstallDir -Recurse -Force
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallDir\logs" -Force | Out-Null

# ==========================================
# 2. DOWNLOAD AGENT BINARY
# ==========================================
Write-Host "`nDownloading agent binary..." -ForegroundColor Yellow

$binaryName = "agent-win.exe"
$url = "$ServerUrl/api/install/files/agent-win.exe"
$destination = Join-Path $InstallDir $binaryName

try {
    Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
    Write-Host "✅ Agent binary downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download agent binary" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# ==========================================
# 3. CREATE CONFIGURATION FILE
# ==========================================
Write-Host "`nCreating configuration..." -ForegroundColor Yellow

$envContent = @"
SERVER_URL=$ServerUrl
AGENT_TOKEN=$AgentToken
AGENT_NAME=$AgentName
INTERVAL=5000
"@

$envContent | Out-File -FilePath "$InstallDir\.env" -Encoding UTF8
Write-Host "✅ Configuration created" -ForegroundColor Green

# ==========================================
# 4. CREATE WINDOWS SERVICE
# ==========================================
Write-Host "`nSetting up Windows Service..." -ForegroundColor Yellow

# Install NSSM (Non-Sucking Service Manager) if not already installed
$nssmPath = "C:\nssm\nssm.exe"

if (-not (Test-Path $nssmPath)) {
    Write-Host "  Installing NSSM (Service Manager)..." -ForegroundColor Gray
    
    $nssmZip = "$env:TEMP\nssm.zip"
    $nssmExtract = "$env:TEMP\nssm"
    
    try {
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $nssmZip -UseBasicParsing
        Expand-Archive -Path $nssmZip -DestinationPath $nssmExtract -Force
        
        New-Item -ItemType Directory -Path "C:\nssm" -Force | Out-Null
        Copy-Item -Path "$nssmExtract\nssm-2.24\win64\nssm.exe" -Destination $nssmPath -Force
        
        Remove-Item -Path $nssmZip -Force
        Remove-Item -Path $nssmExtract -Recurse -Force
        
        Write-Host "  ✅ NSSM installed" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed to install NSSM" -ForegroundColor Red
        Write-Host "  Please download manually from https://nssm.cc/download" -ForegroundColor Yellow
        exit 1
    }
}

# Remove existing service if it exists
$serviceName = "NexusAgent"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "  Removing existing service..." -ForegroundColor Gray
    & $nssmPath stop $serviceName
    & $nssmPath remove $serviceName confirm
}

# Install the service
Write-Host "  Creating Windows Service..." -ForegroundColor Gray

$appPath = "$InstallDir\$binaryName"

& $nssmPath install $serviceName $appPath
& $nssmPath set $serviceName AppDirectory "$InstallDir"
& $nssmPath set $serviceName DisplayName "Nexus Monitor Agent"
& $nssmPath set $serviceName Description "Nexus monitoring agent for system and Docker metrics"
& $nssmPath set $serviceName Start SERVICE_AUTO_START
& $nssmPath set $serviceName AppStdout "$InstallDir\logs\stdout.log"
& $nssmPath set $serviceName AppStderr "$InstallDir\logs\stderr.log"
& $nssmPath set $serviceName AppRotateFiles 1
& $nssmPath set $serviceName AppRotateBytes 1048576

Write-Host "✅ Windows Service created" -ForegroundColor Green

# ==========================================
# 5. START THE SERVICE
# ==========================================
Write-Host "`nStarting Nexus Agent service..." -ForegroundColor Yellow

try {
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 2
    
    $service = Get-Service -Name $serviceName
    if ($service.Status -eq "Running") {
        Write-Host "✅ Nexus Agent service started successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service status: $($service.Status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start service" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nYou can manually start the service with: Start-Service -Name $serviceName" -ForegroundColor Yellow
}

# ==========================================
# 6. FIREWALL CONFIGURATION (OPTIONAL)
# ==========================================
Write-Host "`nConfiguring Windows Firewall..." -ForegroundColor Yellow

try {
    $ruleName = "Nexus Agent Outbound"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName $ruleName `
                            -Direction Outbound `
                            -Program $appPath `
                            -Action Allow `
                            -Profile Any `
                            -Enabled True | Out-Null
        Write-Host "✅ Firewall rule created" -ForegroundColor Green
    } else {
        Write-Host "✅ Firewall rule already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not configure firewall. You may need to allow the binary manually." -ForegroundColor Yellow
}

# ==========================================
# 7. SUMMARY
# ==========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation Details:" -ForegroundColor White
Write-Host "  • Installation Directory: $InstallDir" -ForegroundColor Gray
Write-Host "  • Service Name: $serviceName" -ForegroundColor Gray
Write-Host "  • Agent Name: $AgentName" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor White
Write-Host "  • Check status:  Get-Service -Name $serviceName" -ForegroundColor Gray
Write-Host "  • Stop service:  Stop-Service -Name $serviceName" -ForegroundColor Gray
Write-Host "  • Start service: Start-Service -Name $serviceName" -ForegroundColor Gray
Write-Host "  • View logs:     Get-Content '$InstallDir\logs\stdout.log' -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "The agent should now appear in your Nexus dashboard!" -ForegroundColor Green
Write-Host ""

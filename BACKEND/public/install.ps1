# Nexus Agent Installation Script for Windows
# Run this script in PowerShell as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentToken,
    
    [string]$InstallDir = "C:\Program Files\nexus-agent",
    [string]$AgentName = $env:COMPUTERNAME
)

Write-Host "Installing Nexus Agent..." -ForegroundColor Cyan
Write-Host "Server: $ServerUrl"
Write-Host "Agent Name: $AgentName"

# ==========================================
# 1. CHECK FOR NODE.JS
# ==========================================
Write-Host "`nChecking for Node.js..." -ForegroundColor Yellow

$nodeVersion = $null
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -ge 16) {
            Write-Host "✅ Found Node.js $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "❌ Node.js version $nodeVersion is too old. Please install Node.js v16 or higher." -ForegroundColor Red
            Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
            exit 1
        }
    }
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js v16 or higher." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# ==========================================
# 2. CREATE INSTALLATION DIRECTORY
# ==========================================
Write-Host "`nSetting up installation directory..." -ForegroundColor Yellow

if (Test-Path $InstallDir) {
    Write-Host "⚠️  Installation directory already exists. Removing old files..." -ForegroundColor Yellow
    Remove-Item -Path $InstallDir -Recurse -Force
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallDir\agent" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallDir\agent\collectors" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallDir\agent\handlers" -Force | Out-Null

# ==========================================
# 3. DOWNLOAD AGENT FILES
# ==========================================
Write-Host "`nDownloading agent files..." -ForegroundColor Yellow

$files = @(
    "index.js",
    "package.json",
    "collectors/systemCollector.js",
    "collectors/dockerCollector.js",
    "collectors/agentCollector.js",
    "handlers/dockerHandler.js"
)

foreach ($file in $files) {
    Write-Host "  Downloading $file..." -ForegroundColor Gray
    $url = "$ServerUrl/api/install/files/$file"
    $destination = Join-Path "$InstallDir\agent" $file
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
    } catch {
        Write-Host "❌ Failed to download $file" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All files downloaded successfully" -ForegroundColor Green

# ==========================================
# 4. INSTALL DEPENDENCIES
# ==========================================
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow

Set-Location "$InstallDir\agent"

try {
    npm install --production
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# ==========================================
# 5. CREATE CONFIGURATION FILE
# ==========================================
Write-Host "`nCreating configuration..." -ForegroundColor Yellow

$envContent = @"
SERVER_URL=$ServerUrl
AGENT_TOKEN=$AgentToken
AGENT_NAME=$AgentName
INTERVAL=5000
"@

$envContent | Out-File -FilePath "$InstallDir\agent\.env" -Encoding UTF8
Write-Host "✅ Configuration created" -ForegroundColor Green

# ==========================================
# 6. CREATE WINDOWS SERVICE
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

$nodePath = (Get-Command node).Source
$appPath = "$InstallDir\agent\index.js"

& $nssmPath install $serviceName $nodePath $appPath
& $nssmPath set $serviceName AppDirectory "$InstallDir\agent"
& $nssmPath set $serviceName DisplayName "Nexus Monitor Agent"
& $nssmPath set $serviceName Description "Nexus monitoring agent for system and Docker metrics"
& $nssmPath set $serviceName Start SERVICE_AUTO_START
& $nssmPath set $serviceName AppStdout "$InstallDir\agent\logs\stdout.log"
& $nssmPath set $serviceName AppStderr "$InstallDir\agent\logs\stderr.log"
& $nssmPath set $serviceName AppRotateFiles 1
& $nssmPath set $serviceName AppRotateBytes 1048576

# Create logs directory
New-Item -ItemType Directory -Path "$InstallDir\agent\logs" -Force | Out-Null

Write-Host "✅ Windows Service created" -ForegroundColor Green

# ==========================================
# 7. START THE SERVICE
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
# 8. FIREWALL CONFIGURATION (OPTIONAL)
# ==========================================
Write-Host "`nConfiguring Windows Firewall..." -ForegroundColor Yellow

try {
    $ruleName = "Nexus Agent Outbound"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName $ruleName `
                            -Direction Outbound `
                            -Program $nodePath `
                            -Action Allow `
                            -Profile Any `
                            -Enabled True | Out-Null
        Write-Host "✅ Firewall rule created" -ForegroundColor Green
    } else {
        Write-Host "✅ Firewall rule already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not configure firewall. You may need to allow Node.js manually." -ForegroundColor Yellow
}

# ==========================================
# 9. SUMMARY
# ==========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation Details:" -ForegroundColor White
Write-Host "  • Installation Directory: $InstallDir" -ForegroundColor Gray
Write-Host "  • Service Name: $serviceName" -ForegroundColor Gray
Write-Host "  • Node.js Version: $nodeVersion" -ForegroundColor Gray
Write-Host "  • Agent Name: $AgentName" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor White
Write-Host "  • Check status:  Get-Service -Name $serviceName" -ForegroundColor Gray
Write-Host "  • Stop service:  Stop-Service -Name $serviceName" -ForegroundColor Gray
Write-Host "  • Start service: Start-Service -Name $serviceName" -ForegroundColor Gray
Write-Host "  • View logs:     Get-Content '$InstallDir\agent\logs\stdout.log' -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "The agent should now appear in your Nexus dashboard!" -ForegroundColor Green
Write-Host ""

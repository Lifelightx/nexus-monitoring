#!/bin/bash

# Configuration
OTEL_VERSION="0.93.0"
ARCH="amd64" # Detected x86_64
BINARY_URL="https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_linux_${ARCH}.tar.gz"
INSTALL_DIR="$(pwd)/bin"
CONFIG_FILE="$(pwd)/config/otel-collector-host.yaml"

# Create directories
mkdir -p "$INSTALL_DIR"

# Download
echo "⬇️  Downloading OpenTelemetry Collector Contrib v${OTEL_VERSION}..."
curl -L -o otelcol.tar.gz "$BINARY_URL"

# Extract
echo "📦 Extracting..."
tar -xzf otelcol.tar.gz -C "$INSTALL_DIR" otelcol-contrib

# Cleanup
rm otelcol.tar.gz

# Make executable
chmod +x "$INSTALL_DIR/otelcol-contrib"

echo "✅ Installation complete!"
echo ""
echo "🚀 To start the collector, run:"
echo "$INSTALL_DIR/otelcol-contrib --config=$CONFIG_FILE"
echo ""
echo "Creating a systemd service file example at agents/otel-collector.service"

# Create a sample systemd file
cat <<EOF > otel-collector.service
[Unit]
Description=OpenTelemetry Collector
After=network.target

[Service]
ExecStart=$INSTALL_DIR/otelcol-contrib --config=$CONFIG_FILE
Restart=always
User=$(whoami)
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

echo "To install as systemd service:"
echo "sudo mv otel-collector.service /etc/systemd/system/"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable --now otel-collector"

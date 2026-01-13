#!/bin/bash

# Test Socket.io connection flow

echo "=== Testing Socket.io Connection Flow ==="
echo ""

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWdlbnQiLCJpYXQiOjE3NjY2NzMwMTIsImV4cCI6MTc5ODIwOTAxMn0.L7OINPeKobcZ2IA0axPEYBFkXbw6drq7ssHAKQZO_-Q"
AUTH_JSON='{"token":"'$TOKEN'","agentName":"NexusAgent","os":"linux"}'
AUTH_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$AUTH_JSON'))")

echo "Step 1: Initial handshake with auth"
echo "URL: http://localhost:3000/socket.io/?EIO=4&transport=polling&auth=$AUTH_ENCODED"
echo ""

RESPONSE=$(curl -s "http://localhost:3000/socket.io/?EIO=4&transport=polling&auth=$AUTH_ENCODED")
echo "Response: $RESPONSE"
echo ""

# Extract session ID
SID=$(echo "$RESPONSE" | grep -oP '(?<="sid":")[^"]+')
echo "Session ID: $SID"
echo ""

if [ -z "$SID" ]; then
    echo "ERROR: Failed to get session ID"
    exit 1
fi

echo "Step 2: Send connect message (40)"
echo "URL: http://localhost:3000/socket.io/?EIO=4&transport=polling&sid=$SID"
echo "Data: 40"
echo ""

curl -s -X POST \
    -H "Content-Type: text/plain" \
    -d "40" \
    "http://localhost:3000/socket.io/?EIO=4&transport=polling&sid=$SID"

echo ""
echo ""

echo "Step 3: Poll for response"
echo "URL: http://localhost:3000/socket.io/?EIO=4&transport=polling&sid=$SID"
echo ""

POLL_RESPONSE=$(curl -s "http://localhost:3000/socket.io/?EIO=4&transport=polling&sid=$SID")
echo "Poll Response: $POLL_RESPONSE"
echo ""

echo "=== Test Complete ==="

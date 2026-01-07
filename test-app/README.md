# Test Application for APM

This is a simple Express.js application used to test the APM auto-instrumentation system.

## Setup

```bash
npm install
```

## Running

### Without Instrumentation
```bash
npm start
```

### With APM Instrumentation
```bash
npm run start:instrumented
```

Or manually:
```bash
NODE_OPTIONS='--require ../agent/instrumentation/nodejs/index.js' \
INSTRUMENT_NODEJS=true \
SERVICE_NAME=nodejs-3001 \
SERVER_URL=http://localhost:3000 \
node server.js
```

## Endpoints

- `GET /api/users` - Fetches users from MongoDB and external API
- `POST /api/users` - Creates a new user in MongoDB
- `GET /api/slow` - Slow endpoint with multiple DB queries
- `GET /api/error` - Returns 500 error for testing
- `GET /health` - Health check endpoint

## Testing Traces

```bash
# Generate traffic
curl http://localhost:3001/api/users
curl http://localhost:3001/health
curl http://localhost:3001/api/slow
curl http://localhost:3001/api/error

# Load test
for i in {1..100}; do
  curl -s http://localhost:3001/api/users > /dev/null
done
```

## Expected Traces

Each request should generate:
- 1 root HTTP span
- 1+ DB spans (MongoDB queries)
- 1+ External spans (HTTP calls to jsonplaceholder.typicode.com)

View traces in the APM dashboard at `http://localhost:5173`

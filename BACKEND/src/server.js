const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws'); // For plain WebSocket agent connections
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const agentHttpRoutes = require('./routes/agentHttpRoutes');
const dockerRoutes = require('./routes/dockerRoutes');
const traceRoutes = require('./routes/traceRoutes');
const socketHandler = require('./socket');
const logger = require('./utils/logger');
const { initializeSchedulers } = require('./services/schedulerService');
const { getKafkaProducer } = require('./services/kafkaProducer');
const otelQueryRoutes = require('./routes/otelQueryRoutes'); // Added OTel query routes import

const seedAdminUser = require('./utils/seeder');

dotenv.config();
connectDB().then(() => {
    seedAdminUser();
    // Initialize all schedulers (alert cleanup + metrics aggregation)
    initializeSchedulers();
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;
const host = process.env.SERVER_HOST || 'localhost';

// Store socket.io instance and agent socket mappings in app
const EventEmitter = require('events');
const eventBus = new EventEmitter();
// Increase max listeners to prevent memory leak warnings if many concurrent commands
eventBus.setMaxListeners(50);

app.set('io', io);
app.set('agentSockets', new Map());
app.set('eventBus', eventBus);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.get('/health', (_, res) => res.send('ok'))
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agent', agentHttpRoutes); // HTTP agent communication
app.use('/api/agents', dockerRoutes);
app.use('/api', traceRoutes); // Trace routes
app.use('/api/install', require('./routes/installRoutes'));
app.use('/api/agents', require('./routes/systemRoutes'));
app.use('/api/metrics', require('./routes/metricRoutes'));
app.use('/api/deploy', require('./routes/deployRoutes'));
app.use('/api', require('./routes/services')); // APM service routes
// OTLP Ingest routes (OpenTelemetry Protocol)
app.use('/api/otlp/v1', require('./routes/otlpRoutes'));
// IMPORTANT: Register settings routes BEFORE alert routes to prevent path conflicts
app.use('/api/alerts/settings', require('./routes/alertSettingsRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
// OpenTelemetry Query routes
app.use('/api/otel', otelQueryRoutes);
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/apm', require('./routes/apmRoutes')); // New APM routes (ClickHouse)

app.get('/', (req, res) => {
    res.json({ message: 'Nexus Monitor API is running', docs: '/api-docs' });
});

// Socket.io for frontend
socketHandler(io, app);

// Agent WebSocket disabled - using HTTP polling instead
// const setupAgentWebSocket = require('./websocket/agentWebSocket');
// setupAgentWebSocket(server, app);

server.listen(port, async () => {
    logger.info(`Server running at http://${host}:${port}`);
    logger.info(`Documentation available at http://${host}:${port}/api-docs`);

    // Initialize Kafka producer
    try {
        const kafkaProducer = getKafkaProducer();
        await kafkaProducer.connect();
        logger.info('✅ Kafka producer initialized');
    } catch (error) {
        logger.error('❌ Failed to initialize Kafka producer:', error.message);
        logger.warn('⚠️  OTLP ingest endpoints will attempt to reconnect on first use');
    }
});

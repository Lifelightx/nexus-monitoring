const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const dockerRoutes = require('./routes/dockerRoutes');
const traceRoutes = require('./routes/traceRoutes');
const socketHandler = require('./socket');
const logger = require('./utils/logger');
const { initializeSchedulers } = require('./services/schedulerService');

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
        origin: ["http://localhost:5173", "http://192.168.56.1:5173", "http://10.163.41.142:5173", "http://192.168.13.73:5173"],
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;
const host = process.env.SERVER_HOST || 'localhost';

// Store socket.io instance and agent socket mappings in app
app.set('io', io);
app.set('agentSockets', new Map());

// Middleware
app.use(cors({
    origin: ["http://localhost:5173", "http://192.168.56.1:5173", "http://10.163.41.142:5173", "http://192.168.13.73:5173"],
    credentials: true
}));
app.use(express.json());

// Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agents', dockerRoutes);
app.use('/api', traceRoutes); // Trace routes
app.use('/api/install', require('./routes/installRoutes'));
app.use('/api/agents', require('./routes/systemRoutes'));
app.use('/api/metrics', require('./routes/metricRoutes'));
app.use('/api/deploy', require('./routes/deployRoutes'));
app.use('/api', require('./routes/services')); // APM service routes
// IMPORTANT: Register settings routes BEFORE alert routes to prevent path conflicts
app.use('/api/alerts/settings', require('./routes/alertSettingsRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));

app.get('/', (req, res) => {
    res.json({ message: 'Nexus Monitor API is running', docs: '/api-docs' });
});

// Socket.io
socketHandler(io, app);

server.listen(port, () => {
    logger.info(`Server running at http://${host}:${port}`);
    logger.info(`Documentation available at http://${host}:${port}/api-docs`);
});

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
const socketHandler = require('./socket');
const logger = require('./utils/logger');

const seedAdminUser = require('./utils/seeder');

dotenv.config();
connectDB().then(() => {
    seedAdminUser();
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

// Store socket.io instance and agent socket mappings in app
app.set('io', io);
app.set('agentSockets', new Map());

// Middleware
app.use(cors());
app.use(express.json());

// Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agents', dockerRoutes);
app.use('/api/install', require('./routes/installRoutes'));
app.use('/api/agents', require('./routes/systemRoutes'));

app.get('/', (req, res) => {
    res.json({ message: 'Nexus Monitor API is running', docs: '/api-docs' });
});

// Socket.io
socketHandler(io, app);

server.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
    logger.info(`Documentation available at http://localhost:${port}/api-docs`);
});

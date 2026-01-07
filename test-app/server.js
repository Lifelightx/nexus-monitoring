const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/test-apm', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.log('⚠️  MongoDB not available, some endpoints will fail');
});

// Simple User schema
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

/**
 * GET /api/users - Fetch users (DB + external API)
 */
app.get('/api/users', async (req, res) => {
    try {
        // MongoDB query
        const users = await User.find().limit(10);

        // External API call
        const response = await axios.get('https://jsonplaceholder.typicode.com/users');

        res.json({
            local: users,
            external: response.data.slice(0, 5)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/users - Create user (DB insert)
 */
app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/slow - Slow endpoint (multiple DB queries)
 */
app.get('/api/slow', async (req, res) => {
    try {
        // Multiple DB queries
        const users = await User.find();
        const count = await User.countDocuments();

        // Slow external call
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts');

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        res.json({
            users: users.length,
            count,
            posts: response.data.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/error - Error endpoint
 */
app.get('/api/error', (req, res) => {
    res.status(500).json({ error: 'Intentional error for testing' });
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Test API Server running on http://localhost:${PORT}\n`);
    console.log('📊 Endpoints:');
    console.log('   GET  /api/users  - Fetch users (DB + external API)');
    console.log('   POST /api/users  - Create user (DB insert)');
    console.log('   GET  /api/slow   - Slow endpoint (multiple DB queries)');
    console.log('   GET  /api/error  - Error endpoint (for testing error traces)');
    console.log('   GET  /health     - Health check\n');

    if (process.env.INSTRUMENT_NODEJS === 'true') {
        console.log('✅ APM Instrumentation ENABLED');
        console.log(`   Service Name: ${process.env.SERVICE_NAME || 'unknown'}`);
        console.log(`   Backend URL: ${process.env.SERVER_URL || 'http://localhost:3000'}\n`);
    } else {
        console.log('⚠️  APM Instrumentation DISABLED\n');
    }
});

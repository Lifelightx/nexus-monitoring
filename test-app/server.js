const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/test-apm';
mongoose.connect(MONGO_URI, {
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
 * GET /api/nested - Nested calls (DB → External → DB)
 */
app.get('/api/nested', async (req, res) => {
    try {
        // First DB query
        const users = await User.find().limit(5);

        // External API call
        const posts = await axios.get('https://jsonplaceholder.typicode.com/posts?_limit=3');

        // Second DB query based on external data
        const count = await User.countDocuments();

        // Another external call
        const comments = await axios.get('https://jsonplaceholder.typicode.com/comments?_limit=2');

        res.json({
            users: users.length,
            posts: posts.data.length,
            count,
            comments: comments.data.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/parallel - Parallel requests
 */
app.get('/api/parallel', async (req, res) => {
    try {
        // Execute multiple operations in parallel
        const [users, posts, todos] = await Promise.all([
            User.find().limit(5),
            axios.get('https://jsonplaceholder.typicode.com/posts?_limit=3'),
            axios.get('https://jsonplaceholder.typicode.com/todos?_limit=3')
        ]);

        res.json({
            users: users.length,
            posts: posts.data.length,
            todos: todos.data.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/db-heavy - Database-heavy endpoint
 */
app.get('/api/db-heavy', async (req, res) => {
    try {
        // Multiple sequential DB operations
        const users = await User.find();
        const count = await User.countDocuments();
        const recent = await User.find().sort({ createdAt: -1 }).limit(5);

        // Aggregate query
        const stats = await User.aggregate([
            { $group: { _id: null, total: { $sum: 1 } } }
        ]);

        res.json({
            total: users.length,
            count,
            recent: recent.length,
            stats: stats[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/external-heavy - External API-heavy endpoint
 */
app.get('/api/external-heavy', async (req, res) => {
    try {
        // Multiple external API calls
        const users = await axios.get('https://jsonplaceholder.typicode.com/users?_limit=5');
        const posts = await axios.get('https://jsonplaceholder.typicode.com/posts?_limit=10');
        const albums = await axios.get('https://jsonplaceholder.typicode.com/albums?_limit=5');
        const photos = await axios.get('https://jsonplaceholder.typicode.com/photos?_limit=5');

        res.json({
            users: users.data.length,
            posts: posts.data.length,
            albums: albums.data.length,
            photos: photos.data.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/cpu-intensive - CPU-intensive operation
 */
app.get('/api/cpu-intensive', async (req, res) => {
    try {
        // Simulate CPU-intensive work
        const start = Date.now();
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.sqrt(i);
        }
        const cpuTime = Date.now() - start;

        // Small DB query
        const count = await User.countDocuments();

        res.json({
            result: Math.floor(result),
            cpuTime,
            dbCount: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bulk-insert - Bulk database insert
 */
app.post('/api/bulk-insert', async (req, res) => {
    try {
        const users = [];
        for (let i = 0; i < 10; i++) {
            users.push({
                name: `Test User ${i}`,
                email: `test${i}@example.com`
            });
        }

        const result = await User.insertMany(users);
        res.status(201).json({ inserted: result.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/mixed - Mixed operations (realistic scenario)
 */
app.get('/api/mixed', async (req, res) => {
    try {
        // Fetch from DB
        const users = await User.find().limit(3);

        // External API call
        const posts = await axios.get('https://jsonplaceholder.typicode.com/posts?_limit=2');

        // Some CPU work
        let hash = 0;
        for (let i = 0; i < 100000; i++) {
            hash = (hash + i) % 1000000;
        }

        // Another DB query
        const count = await User.countDocuments();

        res.json({
            users: users.length,
            posts: posts.data.length,
            hash,
            count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/timeout - Simulated timeout
 */
app.get('/api/timeout', async (req, res) => {
    try {
        // Simulate a very slow operation
        await new Promise(resolve => setTimeout(resolve, 3000));
        res.json({ message: 'Completed after 3 seconds' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/exception - Throws exception
 */
app.get('/api/exception', async (req, res, next) => {
    try {
        // Intentionally throw an error
        throw new Error('Intentional exception for testing error tracking');
    } catch (error) {
        // Pass to error handler middleware
        next(error);
    }
});

/**
 * DELETE /api/users/:id - Delete user
 */
app.delete('/api/users/:id', async (req, res) => {
    try {
        const result = await User.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted', user: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/users/:id - Update user
 */
app.put('/api/users/:id', async (req, res) => {
    try {
        const result = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * Error handling middleware
 * Must be defined AFTER all routes
 */
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);

    // Send error response
    res.status(500).json({
        error: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Test API Server running on http://localhost:${PORT}\n`);
    console.log('📊 Endpoints:');
    console.log('   GET    /api/users          - Fetch users (DB + external API)');
    console.log('   POST   /api/users          - Create user (DB insert)');
    console.log('   PUT    /api/users/:id      - Update user');
    console.log('   DELETE /api/users/:id      - Delete user');
    console.log('   GET    /api/slow           - Slow endpoint (multiple DB queries)');
    console.log('   GET    /api/nested         - Nested calls (DB → External → DB)');
    console.log('   GET    /api/parallel       - Parallel requests (Promise.all)');
    console.log('   GET    /api/db-heavy       - Database-heavy operations');
    console.log('   GET    /api/external-heavy - External API-heavy operations');
    console.log('   GET    /api/cpu-intensive  - CPU-intensive operations');
    console.log('   GET    /api/mixed          - Mixed operations (realistic)');
    console.log('   POST   /api/bulk-insert    - Bulk database insert');
    console.log('   GET    /api/timeout        - Simulated timeout (3s)');
    console.log('   GET    /api/error          - Error endpoint (500)');
    console.log('   GET    /api/exception      - Throws exception');
    console.log('   GET    /health             - Health check\n');

    if (process.env.INSTRUMENT_NODEJS === 'true') {
        console.log('✅ APM Instrumentation ENABLED');
        console.log(`   Service Name: ${process.env.SERVICE_NAME || 'unknown'}`);
        console.log(`   Backend URL: ${process.env.SERVER_URL || 'http://localhost:3000'}\n`);
    } else {
        console.log('⚠️  APM Instrumentation DISABLED\n');
    }
});

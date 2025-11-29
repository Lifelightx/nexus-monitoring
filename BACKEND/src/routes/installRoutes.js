const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');

// Generate a new installation token
router.get('/token', (req, res) => {
    // In a real app, you might want to associate this with a specific user or expiry
    // For now, we create a long-lived token for the agent
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign({ role: 'agent' }, secret, { expiresIn: '30d' });

    res.json({ token });
});

// Serve the install script
router.get('/script', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/install.sh'));
});

// Serve agent files
router.get(/^\/files\/(.*)/, (req, res) => {
    const filename = req.params[0];
    const allowedFiles = [
        'index.js',
        'package.json',
        'collectors/systemCollector.js',
        'collectors/dockerCollector.js',
        'collectors/agentCollector.js'
    ];

    // Basic security check to prevent directory traversal
    if (!allowedFiles.includes(filename) && !allowedFiles.some(f => filename.endsWith(f))) {
        return res.status(403).send('Forbidden');
    }

    const agentDir = path.join(__dirname, '../../../agent');
    res.sendFile(path.join(agentDir, filename));
});

module.exports = router;

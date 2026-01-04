const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');

// Generate a new installation token
/**
 * @swagger
 * /api/install/token:
 *   get:
 *     summary: Generate a new installation token
 *     tags: [Install]
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: The installation token
 */
router.get('/token', (req, res) => {
    // In a real app, you might want to associate this with a specific user or expiry
    // For now, we create a long-lived token for the agent
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign({ role: 'agent' }, secret, { expiresIn: '30d' });

    res.json({ token });
});

// Serve the install script
/**
 * @swagger
 * /api/install/script:
 *   get:
 *     summary: Get the installation script
 *     tags: [Install]
 *     responses:
 *       200:
 *         description: The installation script
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/script', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/install.sh'));
});

// Serve agent files
/**
 * @swagger
 * /api/install/files/{filename}:
 *   get:
 *     summary: Download agent files
 *     tags: [Install]
 *     parameters:
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the file to download
 *     responses:
 *       200:
 *         description: The file content
 *       403:
 *         description: Forbidden - File not allowed
 *       404:
 *         description: File not found
 */
router.get(/^\/files\/(.*)/, (req, res) => {
    const filename = req.params[0];
    const allowedFiles = [
        'index.js',
        'package.json',
        'collectors/systemCollector.js',
        'collectors/dockerCollector.js',
        'collectors/agentCollector.js',
        'handlers/dockerHandler.js'
    ];

    // Basic security check to prevent directory traversal
    if (!allowedFiles.includes(filename) && !allowedFiles.some(f => filename.endsWith(f))) {
        return res.status(403).send('Forbidden');
    }

    const agentDir = path.join(__dirname, '../../../agent');
    res.sendFile(path.join(agentDir, filename));
});

module.exports = router;

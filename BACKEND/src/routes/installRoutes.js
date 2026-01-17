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
    const expiresIn = process.env.AGENT_TOKEN_EXPIRY || '30d';
    const token = jwt.sign({ role: 'agent' }, secret, { expiresIn });

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

// Serve the Windows PowerShell install script
/**
 * @swagger
 * /api/install/script/windows:
 *   get:
 *     summary: Get the Windows PowerShell installation script
 *     tags: [Install]
 *     responses:
 *       200:
 *         description: The Windows PowerShell installation script
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/script/windows', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/install.ps1'));
});

// Serve the MacOS install script
/**
 * @swagger
 * /api/install/script/macos:
 *   get:
 *     summary: Get the MacOS installation script
 *     tags: [Install]
 *     responses:
 *       200:
 *         description: The MacOS installation script
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/script/macos', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/install_mac.sh'));
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
    const binaries = ['agent-linux', 'agent-windows.exe', 'agent-macos'];

    // Map requested filenames to actual build artifacts if needed
    // Default C++ build output is 'nexus-agent'
    const binaryMap = {
        'agent-linux': 'nexus-agent',
        'agent-macos': 'nexus-agent',
        'agent-windows.exe': 'nexus-agent.exe'
    };

    if (binaries.includes(filename)) {
        // Use configured dist dir or fallback to C++ build directory
        const distDir = process.env.AGENT_DIST_DIR
            ? path.resolve(process.env.AGENT_DIST_DIR)
            : path.join(__dirname, '../../../agent/build');

        // Try mapped filename first (nexus-agent), then requested filename (agent-linux)
        const mappedName = binaryMap[filename] || filename;
        const mappedPath = path.join(distDir, mappedName);

        // Check if mapped file exists, otherwise fallback to requested name
        const fs = require('fs');
        if (fs.existsSync(mappedPath)) {
            return res.sendFile(mappedPath);
        } else {
            return res.sendFile(path.join(distDir, filename));
        }
    }

    // Only binaries are allowed
    return res.status(403).send('Forbidden');
});

// Serve bundled instrumentation
/**
 * @swagger
 * /api/install/instrumentation:
 *   get:
 *     summary: Download agent instrumentation (bundled)
 *     tags: [Install]
 *     responses:
 *       200:
 *         description: The instrumentation tarball
 *         content:
 *           application/gzip:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/instrumentation', (req, res) => {
    const { spawn } = require('child_process');
    const assetDir = process.env.AGENT_ASSET_DIR
        ? path.resolve(process.env.AGENT_ASSET_DIR)
        : path.join(__dirname, '../../../agent/assets');

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="instrumentation.tar.gz"');

    // Create tarball on the fly
    // Include node_modules (bundled dependencies)
    const tar = spawn('tar', [
        'czf', '-',
        '-C', assetDir,
        'instrumentation'
    ]);

    tar.stdout.pipe(res);

    tar.stderr.on('data', (data) => {
        console.error(`tar error: ${data}`);
    });
});


module.exports = router;

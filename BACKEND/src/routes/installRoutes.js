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
    const binaries = ['agent-linux', 'agent-win.exe'];

    // Serve binaries from dist folder
    if (binaries.includes(filename)) {
        const distDir = path.join(__dirname, '../../../agent/dist');
        return res.sendFile(path.join(distDir, filename));
    }

    // Only binaries are allowed
    return res.status(403).send('Forbidden');
});

module.exports = router;

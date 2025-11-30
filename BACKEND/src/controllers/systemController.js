const { v4: uuidv4 } = require('uuid');
const DiskScan = require('../models/DiskScan');
const { encrypt, decrypt } = require('../utils/encryption');

// Agent pushes disk scan data (Background Sync)
exports.updateDiskScan = async (req, res) => {
    const { id } = req.params; // Agent ID
    const { path, files } = req.body;

    if (!path || !files) {
        return res.status(400).json({ message: 'Path and files are required' });
    }

    try {
        const encryptedFiles = encrypt(files);

        await DiskScan.findOneAndUpdate(
            { agentId: id, path },
            {
                files: encryptedFiles,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Disk scan updated' });
    } catch (error) {
        console.error('Error updating disk scan:', error);
        res.status(500).json({ message: 'Failed to update disk scan' });
    }
};

// Frontend gets disk scan data (Background Sync Data)
exports.getDiskScan = async (req, res) => {
    const { id } = req.params; // Agent ID
    const { path } = req.query;

    if (!path) {
        return res.status(400).json({ message: 'Path is required' });
    }

    try {
        const scan = await DiskScan.findOne({ agentId: id, path });

        if (!scan) {
            console.log(`No scan found for agent ${id} path ${path}`);
            return res.json({ success: true, files: [] }); // Return empty if no scan yet
        }

        console.log(`Found scan for agent ${id} path ${path}, encrypted length: ${scan.files.length}`);
        const files = decrypt(scan.files);
        console.log(`Decrypted files count: ${files ? files.length : 'null'}`);

        if (!files) {
            console.error('Decryption returned null');
        }

        res.json({ success: true, files, lastUpdated: scan.lastUpdated });
    } catch (error) {
        console.error('Error getting disk scan:', error);
        res.status(500).json({ message: error.message });
    }
};

// List files in a directory (Live via Socket)
exports.listFiles = async (req, res) => {
    const { id } = req.params;
    const { path } = req.query;

    if (!path) {
        return res.status(400).json({ message: 'Path is required' });
    }

    const agentSockets = req.app.get('agentSockets');
    // agentSockets is Map<AgentName, SocketID>

    let socketId = agentSockets.get(id);

    if (!socketId) {
        return res.status(404).json({ message: 'Agent not connected' });
    }

    const io = req.app.get('io');
    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
        return res.status(404).json({ message: 'Agent socket not found' });
    }

    const requestId = uuidv4();

    // Set up a one-time listener for the result
    const resultPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Scan timed out'));
        }, 10000); // 10s timeout

        const listener = (data) => {
            if (data.requestId === requestId) {
                cleanup();
                resolve(data);
            }
        };

        const cleanup = () => {
            clearTimeout(timeout);
            socket.off('system:fs:list:result', listener);
        };

        socket.on('system:fs:list:result', listener);
    });

    // Emit the command
    socket.emit('system:fs:list', { path, requestId });

    try {
        const result = await resultPromise;
        if (result.success) {
            res.json({ success: true, files: result.files });
        } else {
            res.status(500).json({ message: result.error || 'List failed' });
        }
    } catch (error) {
        res.status(504).json({ message: error.message });
    }
};

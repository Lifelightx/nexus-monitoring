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
// List files in a directory (Live via Socket or Queue)
exports.listFiles = async (req, res) => {
    const { id } = req.params;
    const { path } = req.query;

    if (!path) {
        return res.status(400).json({ message: 'Path is required' });
    }

    const agentSockets = req.app.get('agentSockets');
    const socketId = agentSockets ? agentSockets.get(id) : null;
    const io = req.app.get('io');
    const socket = (io && socketId) ? io.sockets.sockets.get(socketId) : null;

    const requestId = uuidv4();

    // SOCKET.IO PATH
    if (socket) {
        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Scan timed out'));
            }, 10000);

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

        socket.emit('system:fs:list', { path, requestId });

        try {
            const result = await resultPromise;
            if (result.success) {
                return res.json({ success: true, files: result.files });
            } else {
                return res.status(500).json({ message: result.error || 'List failed' });
            }
        } catch (error) {
            return res.status(504).json({ message: error.message });
        }
    }

    // COMMAND QUEUE PATH (Fallback for C++ Agent / Polling)
    try {
        const CommandQueue = require('../models/CommandQueue');
        const EventEmitter = require('events');
        const eventBus = req.app.get('eventBus') || new EventEmitter();
        req.app.set('eventBus', eventBus); // Ensure bus exists

        // Create command
        await CommandQueue.create({
            agent: id,             // Fixed field name
            type: 'file',          // Fixed type
            action: 'list',        // Fixed action
            params: { path, requestId },
            status: 'pending'
        });

        // Wait for result
        const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Agent did not respond in time (Polling latency?)'));
            }, 15000); // 15s timeout for polling

            const listener = (data) => {
                if (data.requestId === requestId) {
                    cleanup();
                    resolve(data);
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                eventBus.removeListener('command:result', listener);
            };

            eventBus.on('command:result', listener);
        });

        const result = await resultPromise;
        if (result.success) {
            return res.json({ success: true, files: result.files });
        } else {
            return res.status(500).json({ message: result.error || 'List failed' });
        }

    } catch (error) {
        console.error('File list error:', error);
        return res.status(500).json({ message: error.message || 'Failed to queue command' });
    }
};

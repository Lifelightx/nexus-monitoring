const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/agents/{id}/system/disk-scan:
 *   post:
 *     summary: Update disk scan data (Agent only)
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *               files:
 *                 type: array
 *   get:
 *     summary: Get disk scan data
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files
 */
router.post('/:id/system/disk-scan', protect, systemController.updateDiskScan);
router.get('/:id/system/disk-scan', protect, systemController.getDiskScan);

/**
 * @swagger
 * /api/agents/{id}/system/files:
 *   get:
 *     summary: List files in a directory (Live)
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files in the directory
 */
router.get('/:id/system/files', protect, systemController.listFiles);

module.exports = router;

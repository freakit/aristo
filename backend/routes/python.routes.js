// backend/routes/python.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const pythonSTTController = require("../controllers/python-stt.controller");

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Python
 *   description: Python AI Server Integration
 */

/**
 * @swagger
 * /api/python/stt:
 *   post:
 *     tags: [Python]
 *     summary: Speech to Text via Python Backend
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Transcription result
 */
router.post(
  "/stt",
  upload.single("audio"),
  pythonSTTController.transcribeAudio,
);

/**
 * @swagger
 * /api/python/health:
 *   get:
 *     tags: [Python]
 *     summary: Python AI Server Health Check
 *     responses:
 *       200:
 *         description: Server is healthy
 *       503:
 *         description: Server is unhealthy
 */
router.get("/health", pythonSTTController.health);

module.exports = router;

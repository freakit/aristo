const express = require("express");
const router = express.Router();
const multer = require("multer");
const pythonSTTController = require("../controllers/python-stt.controller");
const aiProxyController = require("../controllers/ai-proxy.controller");
const logger = require("../config/logger");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
router.post("/stt", upload.single("audio"), pythonSTTController.transcribeAudio);

/**
 * @swagger
 * /api/python/session/start:
 *   post:
 *     tags: [Python]
 *     summary: Start AI Session
 */
router.post("/session/start", aiProxyController.startSession);

/**
 * @swagger
 * /api/python/session/answer:
 *   post:
 *     tags: [Python]
 *     summary: Submit Answer to AI Session
 */
router.post("/session/answer", aiProxyController.submitAnswer);

/**
 * @swagger
 * /api/python/session/resume:
 *   post:
 *     tags: [Python]
 *     summary: Resume AI Session
 */
router.post("/session/resume", aiProxyController.resumeSession);

/**
 * @swagger
 * /api/python/session/end:
 *   post:
 *     tags: [Python]
 *     summary: End AI Session
 */
router.post("/session/end", aiProxyController.endSession);

/**
 * @swagger
 * /api/python/health:
 *   get:
 *     tags: [Python]
 *     summary: Check Python Server Health
 */
router.get("/health", pythonSTTController.health);

module.exports = router;

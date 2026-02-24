// backend/routes/openai.routes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const openaiController = require("../controllers/openai.controller");
const logger = require("../config/logger");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Async Handler Helper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Error Middleware for OpenAI routes
router.use((err, req, res, next) => {
  logger.error({ method: req.method, path: req.path, err }, "OpenAI API Error");
  res.status(err.status || 500).json({
    error: err.message || "서버 내부 오류가 발생했습니다.",
    retryable: err.status >= 500 || err.status === 429,
  });
});

/**
 * @swagger
 * /api/openai/tts:
 *   post:
 *     tags: [OpenAI]
 *     summary: 텍스트를 음성으로 변환 (TTS)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               voice:
 *                 type: string
 *     responses:
 *       200:
 *         description: 음성 데이터 (binary)
 */
router.post("/tts", asyncHandler(openaiController.tts));

/**
 * @swagger
 * /api/openai/stt:
 *   post:
 *     tags: [OpenAI]
 *     summary: 음성을 텍스트로 변환 (STT)
 *     requestBody:
 *       required: true
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
 *         description: 변환된 텍스트
 */
router.post("/stt", upload.single("audio"), asyncHandler(openaiController.stt));

/**
 * @swagger
 * /api/openai/health:
 *   get:
 *     tags: [OpenAI]
 *     summary: OpenAI 서비스 상태 확인
 *     responses:
 *       200:
 *         description: 서비스 상태
 */
router.get("/health", openaiController.health);

module.exports = router;

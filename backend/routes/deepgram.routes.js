// backend/routes/deepgram.routes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const deepgramController = require("../controllers/deepgram.controller");
const logger = require("../config/logger");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @swagger
 * /api/deepgram/key:
 *   get:
 *     tags: [Deepgram]
 *     summary: Deepgram API 키 조회
 *     responses:
 *       200:
 *         description: API 키
 */
router.get("/key", (req, res) => deepgramController.getKey(req, res));

/**
 * @swagger
 * /api/deepgram/health:
 *   get:
 *     tags: [Deepgram]
 *     summary: Deepgram 서비스 상태 확인
 */
router.get("/health", (req, res) => deepgramController.health(req, res));

/**
 * @swagger
 * /api/deepgram/stt:
 *   post:
 *     tags: [Deepgram]
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
router.post("/stt", upload.single("audio"), (req, res) =>
  deepgramController.transcribeAudio(req, res),
);

// Error handler
router.use((err, req, res, next) => {
  logger.error(
    { method: req.method, path: req.path, err },
    "Deepgram API Error",
  );
  res.status(err.status || 500).json({
    error: err.message || "서버 내부 오류가 발생했습니다.",
    retryable: true,
  });
});

module.exports = router;

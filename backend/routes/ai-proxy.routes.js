// routes/ai-proxy.js

const express = require("express");
const router = express.Router();
const aiProxyController = require("../controllers/ai-proxy.controller");

/**
 * @swagger
 * /api/ai-proxy/ask:
 *   post:
 *     tags: [AI Proxy]
 *     summary: AI에게 메시지 전송
 *     description: 시험 세션 내에서 AI와 대화. START_SESSION, END_SESSION, CONTINUE_SESSION 등 특수 메시지 지원.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, userInput]
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: 시험 세션 ID
 *               userInput:
 *                 type: string
 *                 description: 사용자 입력 또는 START_SESSION/END_SESSION/CONTINUE_SESSION
 *               studentInfo:
 *                 type: object
 *                 description: 학생 정보 (세션 시작 시)
 *               examInfo:
 *                 type: object
 *                 description: 시험 정보 (세션 시작 시)
 *               attachments:
 *                 type: array
 *                 description: 첨부파일 (세션 시작 시)
 *     responses:
 *       200:
 *         description: AI 응답
 */
router.post("/ask", aiProxyController.ask);

/**
 * @swagger
 * /api/ai-proxy/disconnect:
 *   post:
 *     tags: [AI Proxy]
 *     summary: AI 세션 연결 해제
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId]
 *             properties:
 *               sessionId:
 *                 type: string
 */
router.post("/disconnect", aiProxyController.disconnect);

module.exports = router;

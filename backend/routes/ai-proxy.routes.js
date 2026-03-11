// routes/ai-proxy.js

const express = require("express");
const router = express.Router();
const aiProxyController = require("../controllers/ai-proxy.controller");

/**
 * @swagger
 * /api/ai-proxy/ask:
 *   post:
 *     tags: [AI Proxy]
 *     summary: Send message to AI
 *     description: Chat with AI within an exam session. Supports special messages like START_SESSION, END_SESSION, CONTINUE_SESSION.
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
 *                 description: Exam session ID
 *               userInput:
 *                 type: string
 *                 description: User input or START_SESSION/END_SESSION/CONTINUE_SESSION
 *               studentInfo:
 *                 type: object
 *                 description: Student info (at session start)
 *               examInfo:
 *                 type: object
 *                 description: Exam info (at session start)
 *               attachments:
 *                 type: array
 *                 description: Attachments (at session start)
 *     responses:
 *       200:
 *         description: AI response
 */
router.post("/ask", aiProxyController.ask);

/**
 * @swagger
 * /api/ai-proxy/disconnect:
 *   post:
 *     tags: [AI Proxy]
 *     summary: Disconnect AI session
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

// backend/routes/tutor.routes.js
const express = require("express");
const router = express.Router();
const tutorController = require("../controllers/tutor.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Tutor
 *   description: AI Tutor Mode (explanation → Socratic guide)
 */

/**
 * @swagger
 * /api/tutor/start:
 *   post:
 *     tags: [Tutor]
 *     summary: Start tutor session
 *     description: AI explains the topic and returns the first comprehension question.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topic]
 *             properties:
 *               topic:
 *                 type: string
 *                 description: Topic to learn
 *               vectorDocIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Firestore IDs of RAG documents to reference
 *               sessionId:
 *                 type: string
 *                 description: Firestore session ID (optional)
 */
router.post("/start", verifyFirebaseToken, tutorController.startTutor);

/**
 * @swagger
 * /api/tutor/reply:
 *   post:
 *     tags: [Tutor]
 *     summary: Submit student answer
 *     description: Analyzes the answer and returns feedback + supplement + next question.
 *     security:
 *       - bearerAuth: []
 */
router.post("/reply", verifyFirebaseToken, tutorController.submitReply);

/**
 * @swagger
 * /api/tutor/end:
 *   post:
 *     tags: [Tutor]
 *     summary: End tutor session
 *     description: Ends the session and returns a learning summary.
 *     security:
 *       - bearerAuth: []
 */
router.post("/end", verifyFirebaseToken, tutorController.endTutor);

/**
 * @swagger
 * /api/tutor/session/{sessionId}:
 *   get:
 *     tags: [Tutor]
 *     summary: Get session status
 *     security:
 *       - bearerAuth: []
 */
router.get("/session/:sessionId", verifyFirebaseToken, tutorController.getSession);

module.exports = router;

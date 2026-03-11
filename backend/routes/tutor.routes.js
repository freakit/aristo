// backend/routes/tutor.routes.js
const express = require("express");
const router = express.Router();
const tutorController = require("../controllers/tutor.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Tutor
 *   description: AI 튜터 모드 (설명 → 소크라틱 가이드)
 */

/**
 * @swagger
 * /api/tutor/start:
 *   post:
 *     tags: [Tutor]
 *     summary: 튜터 세션 시작
 *     description: AI가 주제를 설명하고 첫 이해 확인 질문을 반환합니다.
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
 *                 description: 학습할 주제
 *               vectorDocIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 참조할 RAG 문서 Firestore IDs
 *               sessionId:
 *                 type: string
 *                 description: Firestore 세션 ID (선택)
 */
router.post("/start", verifyFirebaseToken, tutorController.startTutor);

/**
 * @swagger
 * /api/tutor/reply:
 *   post:
 *     tags: [Tutor]
 *     summary: 학생 답변 제출
 *     description: 답변을 분석하여 피드백 + 보충 설명 + 다음 질문을 반환합니다.
 *     security:
 *       - bearerAuth: []
 */
router.post("/reply", verifyFirebaseToken, tutorController.submitReply);

/**
 * @swagger
 * /api/tutor/end:
 *   post:
 *     tags: [Tutor]
 *     summary: 튜터 세션 종료
 *     description: 세션을 종료하고 학습 요약을 반환합니다.
 *     security:
 *       - bearerAuth: []
 */
router.post("/end", verifyFirebaseToken, tutorController.endTutor);

/**
 * @swagger
 * /api/tutor/session/{sessionId}:
 *   get:
 *     tags: [Tutor]
 *     summary: 세션 상태 조회
 *     security:
 *       - bearerAuth: []
 */
router.get("/session/:sessionId", verifyFirebaseToken, tutorController.getSession);

module.exports = router;

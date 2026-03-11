// backend/routes/sessions.routes.js
const express = require("express");
const router = express.Router();
const sessionsController = require("../controllers/sessions.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

// 모든 sessions 라우트는 Firebase 인증 필요
router.use(verifyFirebaseToken);

// POST /api/sessions — 새 세션 생성
router.post("/", sessionsController.createSession);

// GET /api/sessions — 내 세션 목록
router.get("/", sessionsController.getSessions);

// GET /api/sessions/:sessionId — 세션 + 메시지 조회
router.get("/:sessionId", sessionsController.getSession);

// PATCH /api/sessions/:sessionId/end — 세션 종료
router.patch("/:sessionId/end", sessionsController.endSession);

// DELETE /api/sessions/:sessionId — 세션 삭제
router.delete("/:sessionId", sessionsController.deleteSession);

module.exports = router;

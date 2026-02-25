// backend/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

// POST /api/auth/register — Firebase 로그인 후 Firestore 프로필 등록
router.post("/register", verifyFirebaseToken, authController.register);

// GET /api/auth/me — 내 프로필 조회
router.get("/me", verifyFirebaseToken, authController.me);

module.exports = router;

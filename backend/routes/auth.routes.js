// backend/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

// POST /api/auth/register — Register Firestore profile after Firebase login
router.post("/register", verifyFirebaseToken, authController.register);

// GET /api/auth/me — Get my profile
router.get("/me", verifyFirebaseToken, authController.me);

module.exports = router;

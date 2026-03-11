// backend/routes/sessions.routes.js
const express = require("express");
const router = express.Router();
const sessionsController = require("../controllers/sessions.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

// All sessions routes require Firebase authentication
router.use(verifyFirebaseToken);

// POST /api/sessions — Create new session
router.post("/", sessionsController.createSession);

// GET /api/sessions — Get my session list
router.get("/", sessionsController.getSessions);

// GET /api/sessions/:sessionId — Get session + messages
router.get("/:sessionId", sessionsController.getSession);

// PATCH /api/sessions/:sessionId/end — End session
router.patch("/:sessionId/end", sessionsController.endSession);

// DELETE /api/sessions/:sessionId — Delete session
router.delete("/:sessionId", sessionsController.deleteSession);

module.exports = router;

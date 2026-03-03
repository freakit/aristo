// backend/routes/index.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const pythonSTTController = require("../controllers/python-stt.controller");

const authRoutes = require("./auth.routes");
const ragRoutes = require("./rag.routes");
const aiProxyRoutes = require("./ai-proxy.routes");
const pythonRoutes = require("./python.routes");
const sessionsRoutes = require("./sessions.routes");
const tutorRoutes = require("./tutor.routes");

// STT Route
router.post(
  "/stt/transcribe",
  upload.single("audio"),
  pythonSTTController.transcribeAudio,
);

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/rag", ragRoutes);
router.use("/ai-proxy", aiProxyRoutes);
router.use("/python", pythonRoutes);
router.use("/sessions", sessionsRoutes);
router.use("/tutor", tutorRoutes);

module.exports = router;

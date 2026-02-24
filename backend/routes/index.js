// backend/routes/index.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const logger = require("../config/logger");

const pythonSTTController = require("../controllers/python-stt.controller");
const aiProxyController = require("../controllers/ai-proxy.controller");
const deepgramController = require("../controllers/deepgram.controller");
const examController = require("../controllers/exam.controller");

// ✅ 기존 라우터들
const authRoutes = require("./auth.routes");
const studentRoutes = require("./student.routes");
const examRoutes = require("./exam.routes");
const treeRoutes = require("./tree.routes");
const fileRoutes = require("./file.routes");
const openaiRoutes = require("./openai.routes");
const aiProxyRoutes = require("./ai-proxy.routes");
const azureRoutes = require("./azure.routes");
const deepgramRoutes = require("./deepgram.routes");
const answerChangeRoutes = require("./answer-change.routes");
const ragRoutes = require("./rag.routes");
const pythonRoutes = require("./python.routes");

// ✅ NEW: /api/question/* 프록시 라우트 추가
router.post("/question/start", aiProxyController.startSession);
router.post("/question/answer", aiProxyController.submitAnswer);
router.post("/question/continue", aiProxyController.resumeSession);
router.post("/question/end", aiProxyController.endSession);

// ✅ NEW: STT Route
router.post(
  "/stt/transcribe",
  upload.single("audio"),
  pythonSTTController.transcribeAudio,
);

// 세션 관리 API
router.get(
  "/exams/session/:examStudentId",
  (req, res, next) => {
    logger.info(
      { examStudentId: req.params.examStudentId },
      "Session info requested",
    );
    next();
  },
  examController.getSessionInfoByExamStudentId,
);

// 기존 라우터 연결
router.use("/auth", authRoutes);
router.use("/students", studentRoutes);
router.use("/exams", examRoutes);
router.use("/trees", treeRoutes);
router.use("/files", fileRoutes);
router.use("/openai", openaiRoutes);
router.use("/ai-proxy", aiProxyRoutes);
router.use("/azure", azureRoutes);
router.use("/deepgram", deepgramRoutes);
router.use("/answer-changes", answerChangeRoutes);
router.use("/rag", ragRoutes);
router.use("/python", pythonRoutes);

module.exports = router;

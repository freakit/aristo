// backend/routes/rag.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const ragController = require("../controllers/rag.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

const upload = multer({ storage: multer.memoryStorage() });

// PDF 업로드
router.post(
  "/upload",
  verifyFirebaseToken,
  upload.single("file"),
  ragController.uploadPdf,
);

// SSE 로그 스트리밍
router.get("/upload-logs/:key", verifyFirebaseToken, ragController.streamLogs);

// 소스 목록 조회
router.get("/sources", verifyFirebaseToken, ragController.getSources);

// 소스 삭제 (docId 기반)
router.delete(
  "/sources/:docId",
  verifyFirebaseToken,
  ragController.deleteSource,
);

module.exports = router;

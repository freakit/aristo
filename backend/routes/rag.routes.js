// backend/routes/rag.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const ragController = require("../controllers/rag.controller");
const { verifyFirebaseToken } = require("../middleware/auth.middleware");

const upload = multer({ storage: multer.memoryStorage() });

// Upload PDF
router.post(
  "/upload",
  verifyFirebaseToken,
  upload.single("file"),
  ragController.uploadPdf,
);

// SSE log streaming
router.get("/upload-logs/:key", verifyFirebaseToken, ragController.streamLogs);

// Get source list
router.get("/sources", verifyFirebaseToken, ragController.getSources);

// Delete source (by docId)
router.delete(
  "/sources/:docId",
  verifyFirebaseToken,
  ragController.deleteSource,
);

module.exports = router;

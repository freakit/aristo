// backend/controllers/rag.controller.js
const logger = require("../config/logger");
const ragService = require("../services/rag.service");

module.exports = {
  // POST /api/rag/upload
  uploadPdf: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const result = await ragService.uploadPdf({
        uid: req.uid,
        file: req.file,
        options: req.body,
      });
      res.status(201).json(result);
    } catch (error) {
      logger.error({ err: error }, "RAG Upload Error");
      res
        .status(error.response?.status || error.statusCode || 500)
        .json(error.response?.data || { error: "Upload failed" });
    }
  },

  // GET /api/rag/upload-logs/:key (SSE)
  streamLogs: async (req, res) => {
    const { key } = req.params;
    if (!key) return res.status(400).json({ error: "Key is required" });

    try {
      await ragService.streamLogs(key, req, res);
    } catch (error) {
      logger.error({ err: error, key }, "RAG Log Stream Error");
      if (!res.headersSent) res.status(500).json({ error: "Stream failed" });
    }
  },

  // GET /api/rag/sources
  getSources: async (req, res) => {
    try {
      const sources = await ragService.getSources(req.uid);
      res.json(sources);
    } catch (error) {
      logger.error({ err: error }, "RAG Get Sources Error");
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  },

  // DELETE /api/rag/sources/:docId
  deleteSource: async (req, res) => {
    try {
      const { docId } = req.params;
      if (!docId) return res.status(400).json({ error: "docId is required" });
      await ragService.deleteSource(docId, req.uid);
      res.json({ message: "삭제 완료" });
    } catch (error) {
      logger.error({ err: error }, "RAG Delete Source Error");
      res
        .status(error.response?.status || error.statusCode || 500)
        .json(error.response?.data || { error: "Delete failed" });
    }
  },
};

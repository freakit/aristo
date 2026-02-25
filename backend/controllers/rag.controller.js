// backend/controllers/rag.controller.js
const axios = require("axios");
const FormData = require("form-data");
const logger = require("../config/logger");
const vectordbRepository = require("../repositories/vectordb.repository");

const PYTHON_API_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

module.exports = {
  // POST /api/rag/upload
  uploadPdf: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const uid = req.uid; // Firebase auth 미들웨어에서 주입

      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append("uid", uid);

      if (req.body.window_size)
        formData.append("window_size", req.body.window_size);
      if (req.body.overlap_tokens)
        formData.append("overlap_tokens", req.body.overlap_tokens);
      if (req.body.max_tokens)
        formData.append("max_tokens", req.body.max_tokens);
      if (req.body.strategy) formData.append("strategy", req.body.strategy);

      const response = await axios.post(
        `${PYTHON_API_URL}/api/rag/upload`,
        formData,
        { headers: { ...formData.getHeaders() } },
      );

      const { key, uploaded_at, source } = response.data;

      let savedDoc = null;
      if (key) {
        savedDoc = await vectordbRepository.createVector({
          uid,
          source: source || req.file.originalname,
          key,
          uploaded_at: uploaded_at || new Date().toISOString(),
        });
        logger.info({ key }, "Metadata saved to Firestore");
      }

      res.status(201).json({ ...response.data, docId: savedDoc?.docId });
    } catch (error) {
      logger.error({ err: error }, "RAG Upload Error");
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "Upload failed" });
    }
  },

  // GET /api/rag/upload-logs/:key (SSE)
  streamLogs: async (req, res) => {
    const { key } = req.params;
    if (!key) return res.status(400).json({ error: "Key is required" });

    try {
      const response = await axios({
        method: "get",
        url: `${PYTHON_API_URL}/api/rag/upload-logs/${key}`,
        responseType: "stream",
        timeout: 0,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      response.data.pipe(res);
      req.on("close", () => response.data.destroy());
    } catch (error) {
      logger.error({ err: error, key }, "RAG Log Stream Error");
      if (!res.headersSent) res.status(500).json({ error: "Stream failed" });
    }
  },

  // GET /api/rag/sources
  getSources: async (req, res) => {
    try {
      const uid = req.uid;
      const rows = await vectordbRepository.getVectorsByUid(uid);

      const sourcesWithCount = await Promise.all(
        rows.map(async (row) => {
          try {
            const countResponse = await axios.get(
              `${PYTHON_API_URL}/api/rag/chunk-count`,
              { params: { key: row.key } },
            );
            return { ...row, count: countResponse.data.count || 0 };
          } catch {
            return { ...row, count: 0 };
          }
        }),
      );

      res.json(sourcesWithCount);
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

      // Firestore에서 key 조회 후 Python 서버에도 삭제 요청
      const snap = await require("../config/firebase")
        .db.collection("vectordb")
        .doc(docId)
        .get();

      if (!snap.exists) return res.status(404).json({ error: "Not found" });

      const { key, uid } = snap.data();

      // 본인 자료만 삭제 가능
      if (uid !== req.uid) return res.status(403).json({ error: "Forbidden" });

      // Python 서버에서 벡터 삭제
      await axios.delete(`${PYTHON_API_URL}/api/rag/sources`, {
        params: { key },
      });

      // Firestore에서 삭제
      await vectordbRepository.deleteVectorByDocId(docId);

      res.json({ message: "삭제 완료" });
    } catch (error) {
      logger.error({ err: error }, "RAG Delete Source Error");
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "Delete failed" });
    }
  },
};

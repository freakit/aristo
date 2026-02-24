const axios = require("axios");
const FormData = require("form-data");
const logger = require("../config/logger");
const vectordbRepository = require("../repositories/vectordb.repository");

const PYTHON_API_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

module.exports = {
  // Proxy PDF Upload (DB 저장 추가: Python에서 key 받아서 저장)
  uploadPdf: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      
      // uid도 FormData에 추가 (Python 서버에서 사용)
      formData.append("uid", uid);
      
      if (req.body.window_size)
        formData.append("window_size", req.body.window_size);
      if (req.body.overlap_tokens)
        formData.append("overlap_tokens", req.body.overlap_tokens);
      if (req.body.max_tokens)
        formData.append("max_tokens", req.body.max_tokens);
      if (req.body.strategy)
        formData.append("strategy", req.body.strategy);

      // Python 서버로 업로드 요청
      const response = await axios.post(
        `${PYTHON_API_URL}/api/rag/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );

      const { key, uploaded_at, source } = response.data;

      // Python 서버에서 처리 시작된 파일 메타데이터 DB 저장
      if (key) {
        await vectordbRepository.createVector({
          uid,
          source: source || req.file.originalname,
          key,
          uploaded_at: uploaded_at || new Date().toISOString(),
        });
        logger.info({ key }, "Metadata saved to DB");
      }

      // 결과 반환
      res.json(response.data);
    } catch (error) {
      logger.error({ err: error }, "RAG Upload Proxy Error");
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "Upload failed" });
    }
  },

  // Proxy SSE Logs
  streamLogs: async (req, res) => {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({ error: "Key is required" });
    }
    
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

      req.on("close", () => {
        response.data.destroy();
      });
    } catch (error) {
      logger.error({ err: error, key }, "RAG Log Stream Error");
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream failed" });
      }
    }
  },

  // Get Sources from MySQL (청크 수 포함)
  getSources: async (req, res) => {
    try {
      const { uid } = req.query;

      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const rows = await vectordbRepository.getVectorsByUid(uid);
      
      // Python 서버에서 각 key별 청크 수 조회
      const sourcesWithCount = await Promise.all(
        rows.map(async (row) => {
          try {
            const countResponse = await axios.get(
              `${PYTHON_API_URL}/api/rag/chunk-count`,
              { params: { key: row.key } }
            );
            return {
              ...row,
              count: countResponse.data.count || 0,
            };
          } catch (error) {
            logger.error({ err: error, key: row.key }, "Failed to get chunk count");
            return {
              ...row,
              count: 0,
            };
          }
        })
      );
      
      res.json(sourcesWithCount);
    } catch (error) {
      logger.error({ err: error }, "RAG Get Sources Error");
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  },

  // Proxy Delete Source (삭제 후 DB에서도 제거)
  deleteSource: async (req, res) => {
    try {
      const { key } = req.query;
      
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }
      
      // 1. Python 서버에서 벡터 DB 삭제
      const response = await axios.delete(`${PYTHON_API_URL}/api/rag/sources`, {
        params: { key },
      });
      
      // 2. MySQL에서도 삭제
      await vectordbRepository.deleteVectorByKey(key);
      
      res.json(response.data);
    } catch (error) {
      logger.error({ err: error }, "RAG Delete Source Error");
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "Delete failed" });
    }
  },
};

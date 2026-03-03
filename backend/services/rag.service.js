// backend/services/rag.service.js
const axios = require("axios");
const FormData = require("form-data");
const logger = require("../config/logger");
const vectordbRepository = require("../repositories/vectordb.repository");

const PYTHON_API_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

class RagService {
  // PDF 업로드 → Python 서버 전달 → Firestore 메타데이터 저장
  async uploadPdf({ uid, file, options = {} }) {
    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    formData.append("uid", uid);
    if (options.window_size)
      formData.append("window_size", options.window_size);
    if (options.overlap_tokens)
      formData.append("overlap_tokens", options.overlap_tokens);
    if (options.max_tokens) formData.append("max_tokens", options.max_tokens);
    if (options.strategy) formData.append("strategy", options.strategy);

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
        source: source || file.originalname,
        key,
        uploaded_at: uploaded_at || new Date().toISOString(),
      });
      logger.info({ key }, "Metadata saved to Firestore");
    }

    return { ...response.data, docId: savedDoc?.docId };
  }

  // SSE 로그 스트리밍 — res에 직접 pipe하는 특성상 서비스에서 처리
  async streamLogs(key, req, res) {
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
  }

  // 소스 목록 조회 + chunk count 병렬 조회
  async getSources(uid) {
    const rows = await vectordbRepository.getVectorsByUid(uid);
    return Promise.all(
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
  }

  // 소스 삭제 — 권한 확인 + Python 삭제 + Firestore 삭제
  async deleteSource(docId, uid) {
    const snap = await vectordbRepository.getVectorDocById(docId);
    if (!snap) {
      const err = new Error("Not found");
      err.statusCode = 404;
      throw err;
    }
    if (snap.uid !== uid) {
      const err = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    await axios.delete(`${PYTHON_API_URL}/api/rag/sources`, {
      params: { key: snap.key },
    });
    await vectordbRepository.deleteVectorByDocId(docId);
  }
}

module.exports = new RagService();

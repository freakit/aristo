// backend/services/tutor.service.js
// Python FastAPI /api/tutor/* 를 Node.js 백엔드에서 프록시하는 서비스
const axios = require("axios");
const logger = require("../config/logger");

const PYTHON_API_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

class TutorService {
  /**
   * 튜터 세션 시작
   * Python: POST /api/tutor/start
   * @param {string} topic - 학습 주제
   * @param {string[]|null} ragKeys - RAG 벡터 키 목록
   */
  async startSession({ topic, ragKeys = null }) {
    const response = await axios.post(`${PYTHON_API_URL}/api/tutor/start`, {
      topic,
      rag_keys: ragKeys,
    });
    logger.info({ topic }, "Tutor session started");
    return response.data;
  }

  /**
   * 학생 답변 제출
   * Python: POST /api/tutor/reply
   * @param {string} sessionId - Python 서버 세션 ID
   * @param {string} answer - 학생 답변
   */
  async submitReply({ sessionId, answer }) {
    const response = await axios.post(`${PYTHON_API_URL}/api/tutor/reply`, {
      session_id: sessionId,
      answer,
    });
    return response.data;
  }

  /**
   * 세션 종료 + 학습 요약
   * Python: POST /api/tutor/end
   * @param {string} sessionId
   */
  async endSession({ sessionId }) {
    const response = await axios.post(`${PYTHON_API_URL}/api/tutor/end`, {
      session_id: sessionId,
    });
    logger.info({ sessionId }, "Tutor session ended");
    return response.data;
  }

  /**
   * 세션 상태 조회
   * Python: GET /api/tutor/session/:id
   */
  async getSession(sessionId) {
    const response = await axios.get(
      `${PYTHON_API_URL}/api/tutor/session/${sessionId}`,
    );
    return response.data;
  }
}

module.exports = new TutorService();

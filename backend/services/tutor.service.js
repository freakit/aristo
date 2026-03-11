// backend/services/tutor.service.js
// Service that proxies Python FastAPI /api/tutor/* from Node.js backend
const axios = require("axios");
const logger = require("../config/logger");

const PYTHON_API_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

class TutorService {
  /**
   * Start tutor session
   * Python: POST /api/tutor/start
   * @param {string} topic - Learning topic
   * @param {string[]|null} ragKeys - RAG vector key list
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
   * Submit student answer
   * Python: POST /api/tutor/reply
   * @param {string} sessionId - Python server session ID
   * @param {string} answer - Student answer
   */
  async submitReply({ sessionId, answer }) {
    const response = await axios.post(`${PYTHON_API_URL}/api/tutor/reply`, {
      session_id: sessionId,
      answer,
    });
    return response.data;
  }

  /**
   * End session + learning summary
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
   * Get session status
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

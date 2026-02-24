const axios = require("axios");
const FormData = require("form-data");
const logger = require("../config/logger");

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

module.exports = {
  startSession: async (
    studentInfo,
    examInfo,
    attachments = [],
    vectorKeys = [],
  ) => {
    try {
      logger.info({ studentInfo, examInfo }, "Starting AI session");

      const response = await axios.post(`${AI_SERVER_URL}/api/question/start`, {
        student_info: studentInfo,
        exam_info: examInfo,
        attachments: attachments,
        rag_keys: vectorKeys, // ✅ keys -> rag_keys (Python API 스펙에 맞춤)
      });

      logger.info(
        { sessionId: response.data.session_id },
        "AI session started",
      );
      return response.data;
    } catch (error) {
      logger.error({ err: error }, "Failed to start AI session");
      throw error;
    }
  },

  submitAnswer: async (sessionId, userInput) => {
    try {
      const response = await axios.post(
        `${AI_SERVER_URL}/api/question/answer`,
        {
          session_id: sessionId,
          user_input: userInput,
        },
      );

      return response.data;
    } catch (error) {
      logger.error({ err: error, sessionId }, "Failed to submit answer");
      throw error;
    }
  },

  resumeSession: async (
    studentInfo,
    examInfo,
    attachments = [],
    vectorKeys = [],
  ) => {
    try {
      logger.info({ studentInfo, examInfo }, "Resuming AI session");

      const response = await axios.post(
        `${AI_SERVER_URL}/api/question/continue`,
        {
          student_info: studentInfo,
          exam_info: examInfo,
          attachments: attachments,
          rag_keys: vectorKeys, // ✅ keys -> rag_keys
        },
      );

      logger.info(
        { sessionId: response.data.session_id },
        "AI session resumed",
      );
      return response.data;
    } catch (error) {
      logger.error({ err: error }, "Failed to resume AI session");
      throw error;
    }
  },

  endSession: async (sessionId) => {
    try {
      logger.info({ sessionId }, "Ending AI session");

      const response = await axios.post(
        `${AI_SERVER_URL}/api/question/end`,
        null,
        {
          params: { session_id: sessionId },
        },
      );

      logger.info({ sessionId }, "AI session ended");
      return response.data;
    } catch (error) {
      logger.error({ err: error, sessionId }, "Failed to end AI session");
      throw error;
    }
  },

  transcribeAudio: async (audioBuffer, filename) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBuffer, {
        filename: filename,
        contentType: "audio/webm",
      });

      const response = await axios.post(
        `${AI_SERVER_URL}/api/stt/transcribe`,
        formData,
        {
          headers: formData.getHeaders(),
        },
      );

      return response.data;
    } catch (error) {
      logger.error({ err: error, filename }, "Failed to transcribe audio");
      throw error;
    }
  },

  getHealth: async () => {
    try {
      const response = await axios.get(`${AI_SERVER_URL}/api/health`, {
        timeout: 2000,
      });
      return response.data;
    } catch (error) {
      logger.error({ err: error }, "Python server health check failed");
      throw error;
    }
  },
};

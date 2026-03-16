// backend/controllers/tutor.controller.js
const tutorService = require("../services/tutor.service");
const vectordbRepository = require("../repositories/vectordb.repository");
const logger = require("../config/logger");

/**
 * POST /api/tutor/start
 * Body: { sessionId (Firestore), vectorDocIds? }
 * sessionId = Firestore session ID (created in AimPage)
 * vectorDocIds = RAG document IDs to reference
 */
exports.startTutor = async (req, res) => {
  try {
    const { sessionId, topic, vectorDocIds } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "topic is required" });
    }

    // Get RAG key list from vectorDocIds
    let ragKeys = null;
    if (vectorDocIds && vectorDocIds.length > 0) {
      ragKeys = await vectordbRepository.getKeysByDocIds(vectorDocIds);
    }

    const result = await tutorService.startSession({ topic, ragKeys });

    // Include Python session ID in response
    res.status(201).json({
      firestoreSessionId: sessionId || null,
      ...result,
    });
  } catch (error) {
    logger.error({ err: error }, "Tutor start error");
    const status = error.response?.status || error.statusCode || 500;
    res.status(status).json(error.response?.data || { error: "Failed to start tutor" });
  }
};

/**
 * POST /api/tutor/reply
 * Body: { session_id (Python), answer }
 */
exports.submitReply = async (req, res) => {
  try {
    const { session_id, answer } = req.body;

    if (!session_id || !answer) {
      return res.status(400).json({ error: "session_id and answer are required" });
    }

    const result = await tutorService.submitReply({ sessionId: session_id, answer });
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Tutor reply error");
    const status = error.response?.status || error.statusCode || 500;
    res.status(status).json(error.response?.data || { error: "Failed to process reply" });
  }
};

/**
 * POST /api/tutor/end
 * Body: { session_id (Python) }
 */
exports.endTutor = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    const result = await tutorService.endSession({ sessionId: session_id });
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Tutor end error");
    const status = error.response?.status || error.statusCode || 500;
    res.status(status).json(error.response?.data || { error: "Failed to end session" });
  }
};

/**
 * GET /api/tutor/session/:sessionId
 */
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await tutorService.getSession(sessionId);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Tutor get session error");
    const status = error.response?.status || 404;
    res.status(status).json({ error: "Session not found." });
  }
};

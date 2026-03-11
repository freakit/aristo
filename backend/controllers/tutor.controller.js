// backend/controllers/tutor.controller.js
const tutorService = require("../services/tutor.service");
const vectordbRepository = require("../repositories/vectordb.repository");
const logger = require("../config/logger");

/**
 * POST /api/tutor/start
 * Body: { sessionId (Firestore), vectorDocIds? }
 * sessionId = Firestore 세션 ID (AimPage에서 생성한 것)
 * vectorDocIds = 참조할 RAG 문서 IDs
 */
exports.startTutor = async (req, res) => {
  try {
    const { sessionId, topic, vectorDocIds } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "topic 필수" });
    }

    // vectorDocIds로 RAG key 목록 획득
    let ragKeys = null;
    if (vectorDocIds && vectorDocIds.length > 0) {
      ragKeys = await vectordbRepository.getKeysByDocIds(vectorDocIds);
    }

    const result = await tutorService.startSession({ topic, ragKeys });

    // Python 세션 ID를 응답에 포함
    res.status(201).json({
      firestoreSessionId: sessionId || null,
      ...result,
    });
  } catch (error) {
    logger.error({ err: error }, "Tutor start error");
    const status = error.response?.status || error.statusCode || 500;
    res.status(status).json(error.response?.data || { error: "튜터 시작 실패" });
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
      return res.status(400).json({ error: "session_id, answer 필수" });
    }

    const result = await tutorService.submitReply({ sessionId: session_id, answer });
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Tutor reply error");
    const status = error.response?.status || error.statusCode || 500;
    res.status(status).json(error.response?.data || { error: "답변 처리 실패" });
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
      return res.status(400).json({ error: "session_id 필수" });
    }

    const result = await tutorService.endSession({ sessionId: session_id });
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Tutor end error");
    const status = error.response?.status || error.statusCode || 500;
    res.status(status).json(error.response?.data || { error: "세션 종료 실패" });
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
    res.status(status).json({ error: "세션을 찾을 수 없습니다." });
  }
};

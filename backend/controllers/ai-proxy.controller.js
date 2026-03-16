// backend/controllers/ai-proxy.controller.js
// Legacy HTTP-based Python AI proxy — will be replaced by WebSocket (/ws/tutor)
// Currently kept for Python server integration testing
const pythonApiService = require("../services/python-api.service");
const sessionsService = require("../services/sessions.service");
const vectordbRepository = require("../repositories/vectordb.repository");
const logger = require("../config/logger");

// POST /api/ai-proxy/ask
// Send message in tutoring session (sessionId + userInput)
exports.ask = async (req, res) => {
  const { sessionId, userInput } = req.body;

  if (!sessionId || !userInput) {
    return res.status(400).json({ error: "sessionId and userInput are required" });
  }

  try {
    // Retrieve session + verify ownership via sessionsService (includes messages)
    const sessionWithMessages = await sessionsService.getSession(
      sessionId,
      req.uid,
    );

    // Get RAG key list from vectorDocIds
    const vectorKeys = await vectordbRepository.getKeysByDocIds(
      sessionWithMessages.vectorDocIds,
    );

    // Send request to Python AI server
    const result = await pythonApiService.submitAnswer(
      sessionId,
      userInput,
      vectorKeys,
    );

    // Save message to Firestore (use repository directly for pure data ops)
    // Message save is a pure data operation, so repository is accessed directly
    const sessionsRepository = require("../repositories/sessions.repository");
    const turn = sessionWithMessages.messages.length + 1;
    await sessionsRepository.addMessage(sessionId, {
      role: "user",
      content: userInput,
      turn,
    });
    if (result.response) {
      await sessionsRepository.addMessage(sessionId, {
        role: "assistant",
        content: result.response,
        turn: turn + 1,
      });
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "AI proxy ask error");
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || "AI request failed" });
  }
};

// POST /api/ai-proxy/disconnect
exports.disconnect = async (req, res) => {
  const { sessionId } = req.body;
  try {
    if (sessionId) await pythonApiService.endSession(sessionId);
    res.json({ message: "Disconnected successfully" });
  } catch (error) {
    logger.error({ err: error }, "AI proxy disconnect error");
    res.status(500).json({ error: "Failed to disconnect" });
  }
};

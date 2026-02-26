// backend/controllers/ai-proxy.controller.js
// 기존 HTTP 방식의 Python AI 프록시 — WebSocket(/ws/tutor)으로 전환 예정
// 현재는 Python 서버와의 연동 테스트용으로 유지
const pythonApiService = require("../services/python-api.service");
const sessionsService = require("../services/sessions.service");
const vectordbRepository = require("../repositories/vectordb.repository");
const logger = require("../config/logger");

// POST /api/ai-proxy/ask
// 튜터링 세션에서 메시지 전송 (sessionId + userInput)
exports.ask = async (req, res) => {
  const { sessionId, userInput } = req.body;

  if (!sessionId || !userInput) {
    return res.status(400).json({ error: "sessionId, userInput 필수" });
  }

  try {
    // sessionsService를 통해 세션 조회 + 권한 확인 (messages 포함)
    const sessionWithMessages = await sessionsService.getSession(
      sessionId,
      req.uid,
    );

    // vectorDocIds로 RAG key 목록 획득
    const vectorKeys = await vectordbRepository.getKeysByDocIds(
      sessionWithMessages.vectorDocIds,
    );

    // Python AI 서버에 요청
    const result = await pythonApiService.submitAnswer(
      sessionId,
      userInput,
      vectorKeys,
    );

    // Firestore에 메시지 저장 (sessionsRepository 직접 접근 대신 서비스를 통해)
    // 메시지 저장은 순수 데이터 조작이므로 repository 직접 사용
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
    res.status(statusCode).json({ error: error.message || "AI 요청 실패" });
  }
};

// POST /api/ai-proxy/disconnect
exports.disconnect = async (req, res) => {
  const { sessionId } = req.body;
  try {
    if (sessionId) await pythonApiService.endSession(sessionId);
    res.json({ message: "연결 해제 완료" });
  } catch (error) {
    logger.error({ err: error }, "AI proxy disconnect error");
    res.status(500).json({ error: "연결 해제 실패" });
  }
};

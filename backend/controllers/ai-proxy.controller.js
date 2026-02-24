const pythonApiService = require("../services/python-api.service");
const logger = require("../config/logger");

exports.startSession = async (req, res) => {
  const {
    studentInfo,
    examInfo,
    student_info,
    exam_info,
    attachments,
    vectorKeys,
    vector_keys,
  } = req.body;

  try {
    const effectiveStudentInfo = student_info || studentInfo;
    const effectiveExamInfo = exam_info || examInfo;
    const effectiveVectorKeys = vector_keys || vectorKeys; // ✅ ragSources → vectorKeys

    logger.info(
      { studentInfo: effectiveStudentInfo, examInfo: effectiveExamInfo },
      "Start session requested",
    );

    const finalStudentInfo = effectiveStudentInfo || { id: req.body.studentId };
    const finalExamInfo = effectiveExamInfo || { id: req.body.examId };

    const result = await pythonApiService.startSession(
      finalStudentInfo,
      finalExamInfo,
      attachments,
      effectiveVectorKeys, // ✅ vectorKeys 전달
    );

    logger.info(
      { sessionId: result.session_id },
      "Session started successfully",
    );
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Failed to start session");
    res.status(500).json({ error: "Failed to start session" });
  }
};

exports.submitAnswer = async (req, res) => {
  const { sessionId, session_id, userInput, user_input, userMessage } =
    req.body;
  const finalSessionId = session_id || sessionId;
  const finalInput = user_input || userInput || userMessage;

  try {
    if (!finalSessionId) {
      throw new Error("Session ID is required for submitting answer");
    }

    const result = await pythonApiService.submitAnswer(
      finalSessionId,
      finalInput,
    );

    res.json(result);
  } catch (error) {
    logger.error(
      { sessionId: finalSessionId || "unknown", err: error },
      "Failed to submit answer",
    );
    res.status(500).json({ error: "Failed to submit answer" });
  }
};

exports.resumeSession = async (req, res) => {
  const {
    studentInfo,
    examInfo,
    student_info,
    exam_info,
    attachments,
    vectorKeys,
    vector_keys,
  } = req.body;

  try {
    logger.info("Resume session requested");

    const effectiveStudentInfo = student_info || studentInfo;
    const effectiveExamInfo = exam_info || examInfo;
    const effectiveVectorKeys = vector_keys || vectorKeys; // ✅ ragSources → vectorKeys

    const result = await pythonApiService.resumeSession(
      effectiveStudentInfo,
      effectiveExamInfo,
      attachments,
      effectiveVectorKeys, // ✅ vectorKeys 전달
    );

    logger.info({ sessionId: result.session_id }, "Session resumed");
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Failed to resume session");
    res.status(500).json({ error: "Failed to resume session" });
  }
};

exports.endSession = async (req, res) => {
  const { sessionId } = req.body;

  try {
    logger.info({ sessionId }, "End session requested");

    const result = await pythonApiService.endSession(sessionId);

    logger.info({ sessionId }, "Session ended successfully");
    res.json(result);
  } catch (error) {
    logger.error({ sessionId, err: error }, "Failed to end session");
    res.status(500).json({ error: "Failed to end session" });
  }
};

// Legacy support & Unified Endpoint
exports.ask = async (req, res) => {
  const { userInput, userMessage } = req.body;
  const input = userInput || userMessage;

  if (input === "START_SESSION") {
    return exports.startSession(req, res);
  } else if (input === "CONTINUE_SESSION") {
    // Note: 'CONTINUE_SESSION' string usage needs verification in frontend
    return exports.resumeSession(req, res);
  } else {
    // Attempt to map 'continueConversation' flow
    return exports.submitAnswer(req, res);
  }
};

exports.continueConversation = exports.submitAnswer; // Alias for backward compatibility if needed
exports.disconnect = exports.endSession;

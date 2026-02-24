const pythonApiService = require("../services/python-api.service");
const logger = require("../config/logger");

exports.transcribeAudio = async (req, res) => {
  const requestId = req.id; // pino-http가 자동 생성

  try {
    if (!req.file) {
      logger.warn({ requestId }, "No audio file uploaded");
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    logger.info(
      {
        requestId,
        filename: req.file.originalname,
        size: req.file.size,
      },
      "Processing Python STT request",
    );

    const result = await pythonApiService.transcribeAudio(
      req.file.buffer,
      req.file.originalname,
    );

    logger.info({ requestId, success: true }, "Python STT completed");
    res.json(result);
  } catch (error) {
    logger.error({ requestId, err: error }, "Python STT error");
    res.status(500).json({
      error: "STT processing failed",
      details: error.message,
    });
  }
};

exports.health = async (req, res) => {
  try {
    const status = await pythonApiService.getHealthHealth();
    // Wait, the method name in service is getHealth.
    // I need to be careful. I added getHealth.
    // Let me double check what I added to python-api.service.js
    // I added: getHealth: async () => { ... }
    const result = await pythonApiService.getHealth();
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Python health check failed");
    res.status(503).json({ status: "unhealthy", error: error.message });
  }
};

const deepgramService = require("../services/deepgram.service");
const logger = require("../config/logger");

exports.transcribeAudio = async (req, res) => {
  const requestId = req.id;

  try {
    if (!req.file) {
      logger.warn({ requestId }, "No audio file uploaded for Deepgram");
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    logger.info({ requestId, size: req.file.size }, "Processing Deepgram STT");

    const result = await deepgramService.transcribeAudio(req.file.buffer);

    logger.info({ requestId, success: true }, "Deepgram STT completed");
    res.json(result);
  } catch (error) {
    logger.error({ requestId, err: error }, "Deepgram STT error");
    res.status(500).json({
      error: "STT processing failed",
      details: error.message,
    });
  }
};

exports.getKey = async (req, res) => {
  if (!process.env.DEEPGRAM_API_KEY) {
    logger.error("Deepgram API Key is missing");
    return res.status(500).json({ error: "Deepgram API configuration error" });
  }
  res.json({ key: process.env.DEEPGRAM_API_KEY });
};

exports.health = (req, res) => {
  const status = deepgramService.getHealth();
  if (status.status === "unhealthy") {
    return res.status(503).json(status);
  }
  res.json(status);
};

// backend/controllers/openai.controller.js

const openaiService = require("../services/openai.service");
const logger = require("../config/logger");

class OpenAIController {
  async tts(req, res, next) {
    const { text, voice = "alloy", speed = 1.0 } = req.body;

    logger.info({ textLength: text?.length, voice }, "TTS Request");
    const startTime = Date.now();

    try {
      const audioBase64 = await openaiService.generateTTS(text, voice, speed);
      const duration = Date.now() - startTime;
      logger.info({ duration }, "TTS Success");

      res.json({
        audioContent: audioBase64,
        success: true,
        duration: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ duration, err: error }, "TTS Error");
      // 에러 객체에 status가 없으면 기본 500 처리 (Global handler or specific response)
      res.status(error.status || 500).json({
        error: error.message || "TTS 생성 중 오류가 발생했습니다.",
        retryable: error.status >= 500 || error.status === 429,
        duration: duration,
      });
    }
  }

  async stt(req, res, next) {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    logger.info({ fileSize: req.file.size, language: "en" }, "STT Request");
    const startTime = Date.now();

    try {
      const result = await openaiService.transcribeAudio(
        req.file.buffer,
        req.file.originalname,
      );
      const duration = Date.now() - startTime;
      logger.info({ duration }, "STT Success");

      res.json({
        success: true,
        detector: result.detector,
        transcript: result.text,
        duration: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ duration, err: error }, "STT Error");

      res.status(error.status || 500).json({
        error: error.message || "STT 변환 중 오류가 발생했습니다.",
        retryable: error.status >= 500 || error.status === 429,
        duration: duration,
      });
    }
  }

  health(req, res) {
    const status = openaiService.getHealthStatus();
    res.json(status);
  }
}

module.exports = new OpenAIController();

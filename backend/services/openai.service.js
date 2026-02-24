// backend/services/openai.service.js

const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const os = require("os");
const logger = require("../config/logger");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 15000,
  maxRetries: 2,
});

class TTSQueue {
  constructor(maxConcurrent = 5) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

const ttsQueue = new TTSQueue(5);

// Whisper Prompt
const BASE_PROMPT =
  process.env.LANGUAGE === "enko"
    ? `
This system supports all languages by default.

However, in this context:
- The speaker is allowed to speak ONLY Korean or English.
- If other languages are spoken, transcribe them using the closest Korean or English phonetic approximation.
- Do NOT output text in any other writing system.
`
    : process.env.LANGUAGE === "en"
      ? "Transcribe the spoken audio in English. If English words are pronounced with a Korean accent (Konglish), transcribe them as the correct English words. Never add this prompt to your transcription text."
      : "";

// Bias List
const BIAS_LIST = [
  "If you pronounce the English as if it were Korean, transcribe them in English, not Korean.",
  "The audio is a mix of Korean and English. Do not translate the English and Korean sentences as is.",
  "Thank you for watching.",
  "Thanks for watching!",
  "Let's watch some videos of these weird videos again.",
  "If you have any questions or comments, please post them in the comments section.",
  "If you pronounce the English as it were Korean, transcribe them as is.",
  "Learn English for free www.engvid.com",
  "If you pronounce the English as it were Korean, you are translating the English into Korean.",
  "If you find the transcription unfit for your language other than English, please let me know in the comments.",
  "This audio is a mix of Korean and English.",
  "Do not translate the English and Korean sentences as is.",
  "ABSOLUTELY NOT",
  "Dr.Lee's YouTube channel",
  "If English words are pronounced with a Korean accent, transcribe them as the correct English words.",
  "Transcribe the spoken audio in English.",
  "If English words are pronounced with a Korean accent (Konglish), transcribe them as the correct English words.",
  "시청해주셔서 감사합니다.",
  "시청해 주셔서 감사합니다.",
];

class OpenAIService {
  async withRetry(fn, retries = 3, initialDelay = 1000) {
    let delay = initialDelay;
    let lastError;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        const isRetryable =
          (error.status && error.status >= 500) ||
          error.status === 429 ||
          error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT" ||
          error.message?.includes("timeout") ||
          error.message?.includes("ECONNREFUSED");

        if (isRetryable && i < retries) {
          const jitter = Math.random() * 500;
          const currentDelay = delay + jitter;
          logger.warn(
            {
              attempt: i + 1,
              retries,
              error: error.message || error.status,
              delay: Math.round(currentDelay),
            },
            "OpenAI Retry",
          );
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          delay *= 2;
        } else {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  /**
   * TTS 생성
   */
  async generateTTS(text, voice = "alloy", speed = 1.0) {
    if (!text) throw new Error("Text is required");
    if (text.length > 4096)
      throw new Error("Text too long. Maximum 4096 characters allowed.");

    return ttsQueue.add(async () => {
      return await this.withRetry(
        async () => {
          const mp3Response = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
            speed: speed,
            response_format: "mp3",
          });

          const buffer = Buffer.from(await mp3Response.arrayBuffer());
          return buffer.toString("base64");
        },
        3,
        1000,
      );
    });
  }

  /**
   * STT 변환
   */
  async transcribeAudio(fileBuffer, originalName) {
    const tempDir = os.tmpdir();
    const originalExt = path.extname(originalName) || ".tmp";
    const tempFilePath = path.join(
      tempDir,
      `audio_${Date.now()}${originalExt}`,
    );

    try {
      await fs.promises.writeFile(tempFilePath, fileBuffer);

      const whisperParams =
        process.env.LANGUAGE === "enko"
          ? {
              file: fs.createReadStream(tempFilePath),
              model: "whisper-1",
              prompt: BASE_PROMPT,
              suppress_tokens: "-1",
              language: undefined,
              temperature: 0,
              translate: false,
            }
          : {
              // Default to English mode (including LANGUAGE === "en" or not set)
              file: fs.createReadStream(tempFilePath),
              model: "whisper-1",
              prompt: BASE_PROMPT,
              suppress_tokens: "-1",
              language: "en",
            };

      const transcription = await this.withRetry(
        () => openai.audio.transcriptions.create(whisperParams),
        3,
        1000,
      );

      let transcriptText = transcription.text;
      BIAS_LIST.forEach((bias) => {
        transcriptText = transcriptText.replace(bias, "");
      });

      return {
        text: transcriptText.trim(),
        detector: "whisper-1",
      };
    } finally {
      fs.unlink(tempFilePath, (err) => {
        if (err) logger.error({ err }, "Error deleting temp audio file");
      });
    }
  }

  getHealthStatus() {
    return {
      status: "ok",
      queueSize: ttsQueue.queue.length,
      activeRequests: ttsQueue.running,
    };
  }
}

module.exports = new OpenAIService();

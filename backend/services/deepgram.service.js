const logger = require("../config/logger");
const { createClient } = require("@deepgram/sdk");
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

module.exports = {
  transcribeAudio: async (audioBuffer) => {
    try {
      const { result, error } =
        await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
          model: "nova-2",
          smart_format: true,
          language: "ko",
          punctuate: true,
        });

      if (error) throw error;

      // Extract transcript from v3 response structure
      const transcript = result.results.channels[0].alternatives[0].transcript;

      return { text: transcript };
    } catch (error) {
      logger.error({ err: error }, "Deepgram STT failed");
      throw error;
    }
  },

  getHealth: () => {
    if (!process.env.DEEPGRAM_API_KEY) {
      return { status: "unhealthy", error: "Missing DEEPGRAM_API_KEY" };
    }
    return { status: "healthy", service: "deepgram" };
  },
};

// src/common/services/speech/index.ts

export { SpeechServiceController } from "./SpeechServiceController";
export type { ISpeechService, STTMode } from "./BaseSpeechService";
export { OpenAISpeechService } from "./OpenAISpeechService";
export { VADOpenAISpeechService } from "./VADOpenAISpeechService";
export { DeepgramSpeechService } from "./DeepgramSpeechService";
export { VADDeepgramSpeechService } from "./VADDeepgramSpeechService";

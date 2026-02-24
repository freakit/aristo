// src/services/speech/BaseSpeechService.ts
// 공통 타입 및 인터페이스 정의

import { AIAttachment, Exam, Student } from "@/common/types";

// === STT Mode Types ===
export type STTMode =
  | "openai"
  | "vad_openai"
  | "deepgram"
  | "vad_deepgram"
  | "python"
  | "vad_python";

// === Callback Types ===
export type MessageCallback = (message: string, isUser: boolean) => void;
export type TranscriptCallback = (transcript: string, isFinal: boolean) => void;
export type ErrorCallback = (error: string) => void;
export type ConnectionStatusCallback = (
  status: "connecting" | "connected" | "disconnected" | "error"
) => void;
export type SessionFinishCallback = () => void;
export type TTSStatusCallback = (isPlaying: boolean) => void;
export type VADStatusCallback = (isListening: boolean) => void;
export type TTSPreparingCallback = (isPreparing: boolean) => void;
export type STTProcessingStartCallback = () => void;
export type STTProcessingEndCallback = () => void;
export type VoiceResponseCallback = (
  transcript: string,
  audioBlob: Blob | null
) => void;
export type SessionRecoveryCallback = () => void;

// === Speech Service Interface ===
export interface ISpeechService {
  readonly sttMode: STTMode;

  // === Lifecycle ===
  connect(
    exam: Exam,
    student: Student,
    examStudentId?: number | string | null,
    sectionId?: number | string | null,
    ragSources?: string[]
  ): Promise<void>;
  disconnect(): void;
  requestFirstQuestion(opts?: { attachments?: AIAttachment[] }): Promise<void>;
  sendEndSignal(): Promise<void>;
  endCurrentSection(): Promise<void>;

  // === Recording Control ===
  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;

  // === TTS ===
  speakWithTTS(text: string, isSessionEndingMessage?: boolean): Promise<void>;
  skipTTS(): void;
  getTTSElapsedSeconds(): number;
  isActuallyPlaying(): boolean;

  // === VAD Control ===
  pauseVADExternal(): void;

  // === Answer Submission ===
  submitAnswer(transcript: string): Promise<void>;

  // === Session End Message ===
  setSessionEndMessage(message: string): void;

  // === Callback Registrations ===
  onMessage(callback: MessageCallback): void;
  onTranscript(callback: TranscriptCallback): void;
  onError(callback: ErrorCallback): void;
  onConnectionStatus(callback: ConnectionStatusCallback): void;
  onSessionFinish(callback: SessionFinishCallback): void;
  onTTSStatus(callback: TTSStatusCallback): void;
  onVADStatus(callback: VADStatusCallback): void;
  onTTSPreparing(callback: TTSPreparingCallback): void;
  onSTTProcessingStart(callback: STTProcessingStartCallback): void;
  onSTTProcessingEnd(callback: STTProcessingEndCallback): void;
  onVoiceResponse(callback: VoiceResponseCallback): void;
  onSessionRecovery(callback: SessionRecoveryCallback): void;
}

// === VAD Options (for client-side VAD) ===
export const vadOptions = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.3,
  redemptionFrames: 40,
  frameSamples: 1536,
  preSpeechPadFrames: 2,
  minSpeechFrames: 5,
};

// === Default Session End Message ===
export const DEFAULT_SESSION_END_MESSAGE =
  "The exam has ended. Please stop the recording immediately, upload and save the video, then click the 'End Exam' button. Good work.";

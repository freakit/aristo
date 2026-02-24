// src/services/speech/DeepgramSpeechService.ts
// 버튼 제어 + Deepgram Nova-3 STT (파일 기반)

import { sendAnswerToAI } from "@/common/services/student/sendAnswerToAI";
import apiClient from "../apiClient";
import { AIAttachment, Exam, Student } from "@/common/types";
import {
  ISpeechService,
  STTMode,
  MessageCallback,
  TranscriptCallback,
  ErrorCallback,
  ConnectionStatusCallback,
  SessionFinishCallback,
  TTSStatusCallback,
  VADStatusCallback,
  TTSPreparingCallback,
  STTProcessingStartCallback,
  STTProcessingEndCallback,
  VoiceResponseCallback,
  SessionRecoveryCallback,
  DEFAULT_SESSION_END_MESSAGE,
} from "./BaseSpeechService";

export class DeepgramSpeechService implements ISpeechService {
  public readonly sttMode: STTMode = "deepgram";

  private isConnected = false;
  private isTestFinished = false;
  private isTTSSpeaking = false;
  private isTTSPreparing = false;
  private isProcessingRequest = false;

  private onMessageCallback: MessageCallback = () => {};
  private onTranscriptCallback: TranscriptCallback = () => {};
  private onErrorCallback: ErrorCallback = () => {};
  private onConnectionStatusCallback: ConnectionStatusCallback = () => {};
  private onSessionFinishCallback: SessionFinishCallback = () => {};
  private onTTSStatusCallback: TTSStatusCallback = () => {};
  private onVADStatusCallback: VADStatusCallback = () => {};
  private onTTSPreparingCallback: TTSPreparingCallback = () => {};
  private onSTTProcessingStartCallback: STTProcessingStartCallback = () => {};
  private onSTTProcessingEndCallback: STTProcessingEndCallback = () => {};
  private onVoiceResponseCallback: VoiceResponseCallback | null = null;
  private onSessionRecoveryCallback: SessionRecoveryCallback = () => {};

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioStream: MediaStream | null = null;

  private isFirstQuestionRequested = false;
  private currentExam: Exam | null = null;
  private currentStudent: Student | null = null;
  private currentExamStudentId: number | string | null = null;
  private currentSectionId: number | string | null = null;
  private currentSessionId: string | null = null;

  private isSessionEnding = false;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private initialAttachments: AIAttachment[] | null = null;
  private isTTSActuallyPlaying = false;
  private ttsStartTime: number | null = null;

  private sessionRetryAttempted = false;
  private sessionEndMessage: string = DEFAULT_SESSION_END_MESSAGE;

  constructor() {
    if ("speechSynthesis" in window) {
      this.speechSynthesis = window.speechSynthesis;
      console.log(`🎤 Deepgram Speech Service Initialized (Mode: deepgram)`);
    } else {
      console.warn("⚠️ Web Speech API not supported in this browser");
    }
  }

  // === Callback Registrations ===
  public onMessage(callback: MessageCallback) {
    this.onMessageCallback = callback;
  }
  public onTranscript(callback: TranscriptCallback) {
    this.onTranscriptCallback = callback;
  }
  public onError(callback: ErrorCallback) {
    this.onErrorCallback = callback;
  }
  public onConnectionStatus(callback: ConnectionStatusCallback) {
    this.onConnectionStatusCallback = callback;
  }
  public onSessionFinish(callback: SessionFinishCallback) {
    this.onSessionFinishCallback = callback;
  }
  public onTTSStatus(callback: TTSStatusCallback) {
    this.onTTSStatusCallback = callback;
  }
  public onVADStatus(callback: VADStatusCallback) {
    this.onVADStatusCallback = callback;
  }
  public onTTSPreparing(callback: TTSPreparingCallback) {
    this.onTTSPreparingCallback = callback;
  }
  public onSTTProcessingStart(callback: STTProcessingStartCallback) {
    this.onSTTProcessingStartCallback = callback;
  }
  public onSTTProcessingEnd(callback: STTProcessingEndCallback) {
    this.onSTTProcessingEndCallback = callback;
  }
  public onVoiceResponse(callback: VoiceResponseCallback) {
    this.onVoiceResponseCallback = callback;
  }
  public onSessionRecovery(callback: SessionRecoveryCallback) {
    this.onSessionRecoveryCallback = callback;
  }

  // === Public Methods ===
  public pauseVADExternal(): void {
    // Button mode - no VAD to pause
  }

  public async submitAnswer(transcript: string) {
    await this.getNextAIQuestion(transcript);
  }

  public getTTSElapsedSeconds(): number {
    if (!this.isTTSActuallyPlaying || !this.ttsStartTime) {
      return 0;
    }
    return Math.floor((Date.now() - this.ttsStartTime) / 1000);
  }

  public isActuallyPlaying(): boolean {
    return this.isTTSActuallyPlaying;
  }

  public skipTTS(): void {
    console.log("⏭️ Skipping TTS");
    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.isTTSSpeaking = false;
      this.isTTSActuallyPlaying = false;
      this.isTTSPreparing = false;
      this.ttsStartTime = null;
      this.onTTSStatusCallback(false);
      this.onTTSPreparingCallback(false);
      console.log("✅ TTS skipped successfully");
    }
  }

  public setSessionEndMessage(message: string) {
    this.sessionEndMessage = message;
  }

  public async connect(
    exam: Exam,
    student: Student,
    examStudentId?: number | string | null,
    sectionId?: number | string | null,
  ): Promise<void> {
    this.forceDisconnect();

    this.isFirstQuestionRequested = false;
    this.isConnected = false;
    this.isTestFinished = false;

    this.currentExam = exam;
    this.currentStudent = student;
    this.currentExamStudentId = examStudentId ?? null;
    this.currentSectionId = sectionId ?? null;
    this.currentSessionId = null;

    this.updateConnectionStatus("connecting");

    try {
      // Button mode: no special initialization needed
      this.isConnected = true;
      this.updateConnectionStatus("connected");
    } catch (error) {
      this.handleError("speechService.errors.connectionFailed", error);
      this.disconnect();
    }
  }

  public async requestFirstQuestion(opts?: {
    attachments?: AIAttachment[];
  }): Promise<void> {
    console.log("🎯 requestFirstQuestion called");
    if (!this.isConnected) {
      console.warn("⚠️ Cannot request first question - service not connected");
      return;
    }
    if (this.isFirstQuestionRequested) {
      console.log("⚠️ First question already requested - SKIPPING");
      return;
    }
    this.isFirstQuestionRequested = true;
    this.initialAttachments = opts?.attachments ?? null;
    await this.getNextAIQuestion("START_SESSION");
  }

  public async endCurrentSection(): Promise<void> {
    console.log("🛑 endCurrentSection called");
    if (this.isConnected) {
      await this.submitAnswer("END_SESSION");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    this.disconnect();
  }

  public async sendEndSignal(): Promise<void> {
    console.log("⏳ Timer expired, finalizing session");
    await this.finalizeSession();
  }

  public async startRecording(): Promise<void> {
    if (!this.isConnected) {
      return this.handleError("speechService.errors.notConnected");
    }
    await this.startManualRecording();
  }

  public async stopRecording(): Promise<void> {
    await this.stopManualRecording();
  }

  public disconnect(): void {
    this.forceDisconnect();
    this.updateConnectionStatus("disconnected");
    console.log("🔌 Deepgram Speech Service Disconnected");
  }

  // === Private Methods ===
  private forceDisconnect(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.mediaRecorder = null;

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.currentUtterance && this.speechSynthesis) {
      try {
        this.speechSynthesis.cancel();
      } catch (e) {}
      this.currentUtterance = null;
    }

    if (this.isSessionEnding) {
      this.onSessionFinishCallback();
    }

    this.currentExam = null;
    this.currentStudent = null;
    this.isConnected = false;
    this.isTTSSpeaking = false;
    this.isTTSActuallyPlaying = false;
    this.isFirstQuestionRequested = false;
    this.audioChunks = [];
    this.isSessionEnding = false;
    this.isTestFinished = false;
    this.isProcessingRequest = false;
    this.ttsStartTime = null;
    this.currentSessionId = null;
  }

  private async startManualRecording() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.onSTTProcessingStartCallback();
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        try {
          // Use Deepgram STT instead of OpenAI
          const sttResponse = await apiClient.speechToTextDeepgram(audioBlob);
          this.onSTTProcessingEndCallback();

          if (sttResponse.success && sttResponse.data?.transcript) {
            this.handleTranscriptResult(
              sttResponse.data.transcript,
              true,
              audioBlob,
            );
          } else {
            this.handleError(
              "speechService.errors.sttFailed",
              sttResponse.error,
            );
          }
        } catch (error) {
          this.onSTTProcessingEndCallback();
          this.handleError("speechService.errors.sttFailed", error);
        }
      };

      this.mediaRecorder.start();
      this.onVADStatusCallback(true); // Indicate recording state
      console.log("🎤 Manual recording started (Deepgram STT)");
    } catch (error) {
      this.handleError("speechService.errors.micAccessFailed", error);
    }
  }

  private async stopManualRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.onVADStatusCallback(false);
      console.log("🎤 Manual recording stopped");
    }

    // Stop audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
  }

  private handleTranscriptResult = (
    transcript: string,
    isFinal: boolean,
    audioBlob: Blob | null = null,
  ) => {
    if (this.isTTSSpeaking || this.isTTSPreparing || this.isProcessingRequest) {
      console.log(`🚫 Ignoring STT result: "${transcript}"`);
      return;
    }

    this.onTranscriptCallback(transcript, isFinal);

    if (isFinal) {
      const trimmedTranscript = transcript.trim();
      if (trimmedTranscript.length > 0) {
        // Always use review modal for all modes
        if (this.onVoiceResponseCallback) {
          this.onVoiceResponseCallback(trimmedTranscript, audioBlob);
        } else {
          this.getNextAIQuestion(trimmedTranscript);
        }
      }
    }
  };

  private getCurrentSectionContent(): string {
    if (!this.currentExam?.sections) return "";

    // sectionId가 지정되어 있으면 매칭되는 섹션의 content 반환
    if (this.currentSectionId) {
      const section = this.currentExam.sections.find(
        (s: any) => String(s.id) === String(this.currentSectionId)
      );
      if (section?.content) return section.content;
    }

    // fallback: 첫 번째 섹션
    return this.currentExam.sections[0]?.content || "";
  }

  private isSessionLostError(error: any): boolean {
    const errorMessage = error?.message || error?.error || String(error || "");
    return (
      errorMessage.includes("Session not initialized") ||
      errorMessage.includes("Session not found") ||
      errorMessage.includes("not connected") ||
      errorMessage.includes("409")
    );
  }

  private async getNextAIQuestion(transcript: string) {
    console.log("📝 getNextAIQuestion called with:", transcript);
    this.isProcessingRequest = true;

    try {
      if (transcript !== "START_SESSION") {
        this.onTranscriptCallback(transcript, true);
      }

      const studentInfo = this.currentStudent
        ? {
            school: this.currentStudent.school || "",
            registrationNumber: this.currentStudent.registrationNumber,
            name: this.currentStudent.name || "",
            examStudentId: this.currentExamStudentId,
          }
        : undefined;

      const examInfo = this.currentExam
        ? {
            name: this.currentExam.name,
            content: this.getCurrentSectionContent(),
            chapter: this.currentExam.chapter || 1,
            sectionId: this.currentSectionId,
          }
        : undefined;

      if (this.isTestFinished && transcript !== "START_SESSION") {
        console.log("⚠️ Session already finished, ignoring transcript");
        return;
      }

      let response = await sendAnswerToAI(
        transcript,
        studentInfo,
        examInfo,
        transcript === "START_SESSION"
          ? (this.initialAttachments ?? undefined)
          : undefined,
        undefined,
        this.currentSessionId ?? undefined
      );

      if (transcript === "START_SESSION") {
        this.initialAttachments = null;
        this.sessionRetryAttempted = false;
      }

      console.log("📥 Server response received:", response);

      if (response.success && response.data) {
        if (response.data.sessionId) {
            this.currentSessionId = response.data.sessionId;
        }

        if (response.data.type === "finish") {
          await this.finalizeSession();
          return;
        }

        if (response.data.nextQuestion) {
          if (this.isTestFinished) {
            this.onMessageCallback("", false);
            return;
          }
          const nextQuestion = response.data.nextQuestion;
          this.onMessageCallback(nextQuestion, false);
          await this.speakWithTTS(nextQuestion);
        }
      } else {
        // Session recovery logic
        if (
          this.isSessionLostError(response) &&
          !this.sessionRetryAttempted &&
          transcript !== "START_SESSION"
        ) {
          console.warn("⚠️ Session lost. Attempting auto-recovery...");
          this.sessionRetryAttempted = true;
          this.onSessionRecoveryCallback();

          const restartResponse = await sendAnswerToAI(
            "CONTINUE_SESSION",
            studentInfo,
            examInfo,
            undefined,
            transcript,
            this.currentSessionId ?? undefined
          );

          if (restartResponse.success && restartResponse.data) {
            if (restartResponse.data.sessionId) {
                this.currentSessionId = restartResponse.data.sessionId;
            }
            console.log("✅ Session auto-recovered");
            if (restartResponse.data.type === "finish") {
              await this.finalizeSession();
              return;
            }
            const nextQ = restartResponse.data.nextQuestion;
            if (nextQ) {
              this.onMessageCallback(nextQ, false);
              await this.speakWithTTS(nextQ);
              return;
            }
          }
        }

        this.handleError(
          response.error || "speechService.errors.noNextQuestion",
        );
        this.onMessageCallback("", false);
      }
    } catch (error: any) {
      if (
        this.isSessionLostError(error) &&
        !this.sessionRetryAttempted &&
        transcript !== "START_SESSION"
      ) {
        console.warn("⚠️ Session lost in catch. Attempting recovery...");
        this.sessionRetryAttempted = true;
        this.onSessionRecoveryCallback();

        try {
          const studentInfo = this.currentStudent
            ? {
                school: this.currentStudent.school || "",
                registrationNumber: this.currentStudent.registrationNumber,
                name: this.currentStudent.name || "",
                examStudentId: this.currentExamStudentId,
              }
            : undefined;

          const examInfo = this.currentExam
            ? {
                name: this.currentExam.name,
                content: this.getCurrentSectionContent(),
                chapter: this.currentExam.chapter || 1,
                sectionId: this.currentSectionId,
              }
            : undefined;

          const restartResponse = await sendAnswerToAI(
            "CONTINUE_SESSION",
            studentInfo,
            examInfo,
            undefined,
            transcript,
            this.currentSessionId ?? undefined
          );

          if (restartResponse.success && restartResponse.data) {
            if (restartResponse.data.sessionId) {
                this.currentSessionId = restartResponse.data.sessionId;
            }
            if (restartResponse.data.type === "finish") {
              await this.finalizeSession();
              return;
            }
            const nextQ = restartResponse.data.nextQuestion;
            if (nextQ) {
              this.onMessageCallback(nextQ, false);
              await this.speakWithTTS(nextQ);
              return;
            }
          }
        } catch (recoveryError) {
          console.error("❌ Session recovery failed:", recoveryError);
        }
      }

      this.handleError("speechService.errors.requestNextQuestionFailed", error);
      this.onMessageCallback("", false);
      this.onSTTProcessingEndCallback();
    } finally {
      this.isProcessingRequest = false;
    }
  }

  private async finalizeSession() {
    if (this.isSessionEnding) {
      console.log("⚠️ duplicate finalizeSession call ignored");
      return;
    }
    console.log("🏁 Finalizing session");
    this.isTestFinished = true;
    this.isSessionEnding = true;

    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.isTTSSpeaking = false;
      this.isTTSActuallyPlaying = false;
      this.ttsStartTime = null;
      this.onTTSStatusCallback(false);
    }

    await this.speakWithTTS(this.sessionEndMessage, true);
  }

  public async speakWithTTS(
    text: string,
    isSessionEndingMessage: boolean = false,
  ) {
    console.log("🔊 speakWithTTS called");

    if (!this.speechSynthesis) {
      console.warn("⚠️ Web Speech API not available");
      if (isSessionEndingMessage && this.isSessionEnding) {
        this.onSessionFinishCallback();
        this.isSessionEnding = false;
      }
      return;
    }

    try {
      this.speechSynthesis.cancel();

      this.isTTSPreparing = true;
      this.onTTSPreparingCallback(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.isTTSPreparing = false;
      this.onTTSPreparingCallback(false);

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      const voices = this.speechSynthesis.getVoices();
      const googleVoice =
        voices.find((voice) => voice.name.includes("Google US English")) ||
        voices.find((voice) => voice.lang.startsWith("en"));
      if (googleVoice) {
        utterance.voice = googleVoice;
      }
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      this.isTTSSpeaking = true;
      this.onTTSStatusCallback(true);

      utterance.onstart = () => {
        this.isTTSActuallyPlaying = true;
        this.ttsStartTime = Date.now();
      };

      utterance.onend = () => {
        this.isTTSSpeaking = false;
        this.isTTSActuallyPlaying = false;
        this.currentUtterance = null;
        this.ttsStartTime = null;
        this.onTTSStatusCallback(false);

        if (isSessionEndingMessage && this.isSessionEnding) {
          this.onSessionFinishCallback();
          this.isSessionEnding = false;
        }
      };

      utterance.onerror = () => {
        this.isTTSSpeaking = false;
        this.isTTSActuallyPlaying = false;
        this.currentUtterance = null;
        this.ttsStartTime = null;
        this.onTTSStatusCallback(false);

        if (isSessionEndingMessage && this.isSessionEnding) {
          this.onSessionFinishCallback();
          this.isSessionEnding = false;
        }
      };

      this.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("❌ TTS failed:", error);
      this.isTTSPreparing = false;
      this.onTTSPreparingCallback(false);
      this.isTTSSpeaking = false;
      this.isTTSActuallyPlaying = false;
      this.onTTSStatusCallback(false);

      if (isSessionEndingMessage && this.isSessionEnding) {
        this.onSessionFinishCallback();
        this.isSessionEnding = false;
      }
    }
  }

  private handleError(key: string, error?: any) {
    const errorMessage =
      error instanceof Error ? error.message : String(error || "");
    console.error(`[Deepgram SpeechService Error] ${key}`, errorMessage);
    this.onErrorCallback(key);
  }

  private updateConnectionStatus(
    status: "connecting" | "connected" | "disconnected" | "error",
  ) {
    this.onConnectionStatusCallback(status);
  }
}

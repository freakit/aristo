// src/services/speech/VADDeepgramSpeechService.ts
// VAD 자동 감지 (@ricky0123/vad-web) + Deepgram Nova-3 STT (파일 기반)

import { sendAnswerToAI } from "@/common/services/student/sendAnswerToAI";
import apiClient from "@/common/services/apiClient";
import { AIAttachment, Exam, Student } from "@/common/types";
import * as vad from "@ricky0123/vad-web";
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
  vadOptions,
  DEFAULT_SESSION_END_MESSAGE,
} from "./BaseSpeechService";

export class VADDeepgramSpeechService implements ISpeechService {
  public readonly sttMode: STTMode = "vad_deepgram";

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

  // VAD (same as VADOpenAISpeechService)
  private vadInstance: vad.MicVAD | null = null;
  private isVADRecording = false;
  private isVADForciblyStopped = false;

  // Audio
  private audioStream: MediaStream | null = null;
  private recorderStream: MediaStream | null = null;
  private vadMediaRecorder: MediaRecorder | null = null;
  private vadAudioChunks: Blob[] = [];

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

  private isWaitingForFinalResponse = false;
  private finalSpeechProcessedResolve: (() => void) | null = null;

  private sessionRetryAttempted = false;
  private sessionEndMessage: string = DEFAULT_SESSION_END_MESSAGE;

  constructor() {
    if ("speechSynthesis" in window) {
      this.speechSynthesis = window.speechSynthesis;
      console.log(
        `🎤 VAD Deepgram Speech Service Initialized (Mode: vad_deepgram)`,
      );
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
    console.log("🔇 pauseVADExternal called");
    this.pauseVAD();
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
      if (!this.isTestFinished) {
        this.resumeVAD();
      }
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
      await this.initializeClientVAD();
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

    // DEBUG: Check currentExam state
    console.log("🔍 [DEBUG] requestFirstQuestion - currentExam:", {
        available: !!this.currentExam,
        id: this.currentExam?.id,
        sectionsLen: this.currentExam?.sections?.length,
        currentSectionId: this.currentSectionId
    });

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
    console.log("⏳ Timer expired, handling timeout scenario");
    this.isWaitingForFinalResponse = true;

    if (this.vadInstance) {
      const finalProcessingPromise = new Promise<void>((resolve) => {
        this.finalSpeechProcessedResolve = resolve;
      });

      if (
        this.vadMediaRecorder &&
        this.vadMediaRecorder.state === "recording"
      ) {
        console.log("🎤 Timer expired. Forcing VAD MediaRecorder to stop.");
        this.vadMediaRecorder.stop();
      } else if (this.isProcessingRequest) {
        console.log("🎤 STT/AI is processing. Waiting for completion...");
      } else {
        console.log("🎤 System is idle. Finalizing immediately.");
        this.pauseVAD();
        this.finalSpeechProcessedResolve = null;
        await this.finalizeSession();
        return;
      }

      try {
        console.log("⏱️ Waiting for final STT/processing...");
        await Promise.race([
          finalProcessingPromise,
          new Promise((resolve) => setTimeout(resolve, 15000)),
        ]);
      } catch (error) {
        console.error("Error during final speech capture:", error);
      } finally {
        this.finalSpeechProcessedResolve = null;
      }
    }

    await this.finalizeSession();
  }

  public async startRecording(): Promise<void> {
    // VAD mode - recording is automatic
  }

  public async stopRecording(): Promise<void> {
    // VAD mode - recording is automatic
  }

  public disconnect(): void {
    this.forceDisconnect();
    this.updateConnectionStatus("disconnected");
    console.log("🔌 VAD Deepgram Speech Service Disconnected");
  }

  // === Private Methods ===
  private forceDisconnect(): void {
    if (this.vadInstance) {
      try {
        this.vadInstance.destroy();
      } catch (e) {}
      this.vadInstance = null;
    }

    if (this.vadMediaRecorder && this.vadMediaRecorder.state === "recording") {
      try {
        this.vadMediaRecorder.stop();
      } catch (e) {}
    }
    this.vadMediaRecorder = null;
    this.vadAudioChunks = [];

    if (this.recorderStream) {
      try {
        this.recorderStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.recorderStream = null;
    }

    this.audioStream = null;

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
    this.isVADRecording = false;
    this.isVADForciblyStopped = false;
    this.isTTSSpeaking = false;
    this.isTTSActuallyPlaying = false;
    this.isFirstQuestionRequested = false;
    this.isSessionEnding = false;
    this.isWaitingForFinalResponse = false;
    this.isTestFinished = false;
    this.isProcessingRequest = false;
    this.ttsStartTime = null;
    this.currentSessionId = null;
  }

  private pauseVAD(): void {
    if (this.vadInstance) {
      try {
        this.vadInstance.pause();
        console.log("🔇 VAD Listener Paused");

        if (
          this.vadMediaRecorder &&
          this.vadMediaRecorder.state === "recording"
        ) {
          console.log("🛑 Forcefully stopping VAD MediaRecorder");
          this.isVADForciblyStopped = true;
          this.vadMediaRecorder.stop();
        }
      } catch (e) {
        console.error("Error pausing VAD:", e);
      }
    }
  }

  private resumeVAD(): void {
    if (!this.isTestFinished && this.vadInstance) {
      try {
        if (this.isWaitingForFinalResponse) {
          console.log("🏁 Timer expired, not resuming VAD. Finalizing.");
          this.finalizeSession();
          return;
        }

        if (this.isVADRecording) {
          console.log("⚠️ Resetting VAD recording state before resuming");
          this.isVADRecording = false;
          this.onVADStatusCallback(false);
        }
        this.isProcessingRequest = false;
        this.isVADForciblyStopped = false;
        this.vadInstance.start();
        console.log("🔊 VAD Resumed");
      } catch (e) {
        console.error("Error resuming VAD:", e);
      }
    }
  }

  private async initializeClientVAD() {
    try {
      console.log("🔧 Initializing VAD for Deepgram...");

      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      this.recorderStream = this.audioStream.clone();

      this.vadInstance = await vad.MicVAD.new({
        ...vadOptions,
        stream: this.audioStream,
        onSpeechStart: () => {
          console.log("VAD: Speech started");
          this.isVADRecording = true;
          this.onVADStatusCallback(true);

          if (
            this.vadMediaRecorder &&
            this.vadMediaRecorder.state !== "recording"
          ) {
            this.vadAudioChunks = [];
            try {
              this.vadMediaRecorder.start(1000);
              console.log("🎤 VAD MediaRecorder started");
            } catch (e) {
              console.error("❌ VAD MediaRecorder start failed:", e);
              this.handleError("speechService.errors.vadInitFailed", e);
            }
          }
        },

        onSpeechEnd: () => {
          console.log("VAD: Speech ended");
          this.onVADStatusCallback(false);

          if (!this.isVADRecording) return;
          this.isVADRecording = false;

          if (this.vadInstance) {
            this.vadInstance.pause();
            console.log("🔇 VAD paused after speech end");
          }

          if (
            this.vadMediaRecorder &&
            this.vadMediaRecorder.state === "recording"
          ) {
            this.vadMediaRecorder.stop();
            console.log("🎤 VAD MediaRecorder stopped");
          }
        },
      } as any);

      this.vadMediaRecorder = new MediaRecorder(this.recorderStream);
      this.vadMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.vadAudioChunks.push(event.data);
        }
      };

      this.vadMediaRecorder.onstop = async () => {
        if (this.isVADForciblyStopped) {
          console.log("🚫 VAD Recording was forcefully stopped, discarding.");
          this.vadAudioChunks = [];
          this.isVADForciblyStopped = false;
          return;
        }

        console.log(
          "🎤 VAD Recording stopped, processing audio with Deepgram...",
        );
        this.onSTTProcessingStartCallback();

        const audioBlob = new Blob(this.vadAudioChunks, { type: "audio/webm" });
        this.vadAudioChunks = [];

        try {
          // Use Deepgram STT instead of OpenAI
          const sttResponse = await apiClient.speechToTextDeepgram(audioBlob);
          this.onSTTProcessingEndCallback();

          if (sttResponse.success) {
            if (sttResponse.data?.transcript) {
              console.log(
                "✅ Deepgram STT Result:",
                sttResponse.data.transcript,
              );
              this.handleTranscriptResult(
                sttResponse.data.transcript,
                true,
                audioBlob,
              );
            } else {
              console.log("⚠️ STT returned empty transcript");
              await this.speakWithTTS("Please Say again.");
            }
          } else {
            console.warn("❌ STT Failed:", sttResponse.error);
            this.handleError(
              "speechService.errors.sttFailed",
              sttResponse.error,
            );
            this.resumeVAD();
          }
        } catch (error) {
          console.error("❌ STT Error:", error);
          this.onSTTProcessingEndCallback();
          this.handleError("speechService.errors.sttFailed", error);
          this.resumeVAD();
        }
      };

      console.log(
        "✅ VAD Initialized for Deepgram (Waiting for resumeVAD to start)",
      );
    } catch (error) {
      console.error("❌ VAD Initialization failed:", error);
      this.handleError("speechService.errors.vadInitFailed", error);
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
        if (this.onVoiceResponseCallback) {
          this.onVoiceResponseCallback(trimmedTranscript, audioBlob);
        } else {
          this.getNextAIQuestion(trimmedTranscript);
        }
      } else if (trimmedTranscript.length > 0) {
        console.log(`Transmission cancelled: "${trimmedTranscript}"`);
        this.resumeVAD();
      }
    }
  };

  private isSessionLostError(error: any): boolean {
    const errorMessage = error?.message || error?.error || String(error || "");
    return (
      errorMessage.includes("Session not initialized") ||
      errorMessage.includes("Session not found") ||
      errorMessage.includes("not connected") ||
      errorMessage.includes("409")
    );
  }

  private getCurrentSectionContent(): string {
    if (!this.currentExam?.sections) {
        console.warn("⚠️ [DEBUG] getCurrentSectionContent: No sections found!", this.currentExam);
        return "";
    }

    // sectionId가 지정되어 있으면 매칭되는 섹션의 content 반환
    if (this.currentSectionId) {
      const section = this.currentExam.sections.find(
        (s: any) => String(s.id) === String(this.currentSectionId)
      );
      if (section?.content) {
          console.log("✅ [DEBUG] Found section content:", section.content.substring(0, 20) + "...");
          return section.content;
      }
      console.warn(`⚠️ [DEBUG] Section ${this.currentSectionId} not found or has no content`, section);
    }

    // fallback: 첫 번째 섹션
    const fallback = this.currentExam.sections[0]?.content || "";
    console.log("ℹ️ [DEBUG] Using fallback content:", fallback.substring(0, 20) + "...");
    return fallback;
  }

  private async getNextAIQuestion(transcript: string) {
    console.log("📝 getNextAIQuestion called with:", transcript);
    this.isProcessingRequest = true;
    this.pauseVAD();

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
        console.log("⚠️ Session already finished, ignoring");
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

      if (this.isWaitingForFinalResponse) {
        console.log("✅ Final response received after timeout");
        if (response.success && response.data?.nextQuestion) {
          this.onMessageCallback(response.data.nextQuestion, false);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (this.finalSpeechProcessedResolve) {
          this.finalSpeechProcessedResolve();
        }
        await this.finalizeSession();
        return;
      }

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
        } else {
          this.resumeVAD();
        }
      } else {
        if (
          this.isSessionLostError(response) &&
          !this.sessionRetryAttempted &&
          transcript !== "START_SESSION"
        ) {
          console.warn("⚠️ Session lost. Attempting recovery...");
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
        this.resumeVAD();
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
      this.resumeVAD();
    }
  }

  private async finalizeSession() {
    if (this.isSessionEnding) {
      return;
    }
    console.log("🏁 Finalizing session");
    this.isTestFinished = true;
    this.isSessionEnding = true;
    this.isWaitingForFinalResponse = false;

    this.pauseVAD();

    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.isTTSSpeaking = false;
      this.isTTSActuallyPlaying = false;
      this.ttsStartTime = null;
      this.onTTSStatusCallback(false);
    }

    if (this.vadInstance) {
      try {
        this.vadInstance.destroy();
        this.vadInstance = null;
        console.log("🔇 VAD destroyed");
      } catch (e) {}
    }

    if (this.vadMediaRecorder) {
      if (this.vadMediaRecorder.state === "recording") {
        this.vadMediaRecorder.stop();
      }
      this.vadMediaRecorder = null;
      this.vadAudioChunks = [];
    }

    if (this.recorderStream) {
      try {
        this.recorderStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.recorderStream = null;
    }

    this.audioStream = null;

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
      } else if (!this.isTestFinished) {
        this.resumeVAD();
      }
      return;
    }

    try {
      this.pauseVAD();
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
        } else if (!this.isTestFinished) {
          this.resumeVAD();
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
        } else if (!this.isTestFinished) {
          this.resumeVAD();
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
      } else if (!this.isTestFinished) {
        this.resumeVAD();
      }
    }
  }

  private handleError(key: string, error?: any) {
    const errorMessage =
      error instanceof Error ? error.message : String(error || "");
    console.error(`[VAD Deepgram SpeechService Error] ${key}`, errorMessage);
    this.onErrorCallback(key);
  }

  private updateConnectionStatus(
    status: "connecting" | "connected" | "disconnected" | "error",
  ) {
    this.onConnectionStatusCallback(status);
  }
}

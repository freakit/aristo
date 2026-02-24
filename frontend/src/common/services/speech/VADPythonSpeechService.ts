import { sendAnswerToAI } from "@/common/services/student/sendAnswerToAI";
import { AIAttachment, Exam, Student } from "@/common/types";
import * as vad from "@ricky0123/vad-web";
import apiClient from "@/common/services/apiClient";
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

export class VADPythonSpeechService implements ISpeechService {
  public readonly sttMode: STTMode = "vad_python";

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

  // VAD
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
        `🎤 VAD Python Speech Service Initialized (Mode: vad_python)`,
      );
    } else {
      console.warn("⚠️ Web Speech API not supported in this browser");
    }
  }

  // === Callback Registrations ===
  public onMessage(callback: MessageCallback) { this.onMessageCallback = callback; }
  public onTranscript(callback: TranscriptCallback) { this.onTranscriptCallback = callback; }
  public onError(callback: ErrorCallback) { this.onErrorCallback = callback; }
  public onConnectionStatus(callback: ConnectionStatusCallback) { this.onConnectionStatusCallback = callback; }
  public onSessionFinish(callback: SessionFinishCallback) { this.onSessionFinishCallback = callback; }
  public onTTSStatus(callback: TTSStatusCallback) { this.onTTSStatusCallback = callback; }
  public onVADStatus(callback: VADStatusCallback) { this.onVADStatusCallback = callback; }
  public onTTSPreparing(callback: TTSPreparingCallback) { this.onTTSPreparingCallback = callback; }
  public onSTTProcessingStart(callback: STTProcessingStartCallback) { this.onSTTProcessingStartCallback = callback; }
  public onSTTProcessingEnd(callback: STTProcessingEndCallback) { this.onSTTProcessingEndCallback = callback; }
  public onVoiceResponse(callback: VoiceResponseCallback) { this.onVoiceResponseCallback = callback; }
  public onSessionRecovery(callback: SessionRecoveryCallback) { this.onSessionRecoveryCallback = callback; }

  // === Public Methods ===
  public pauseVADExternal(): void {
    console.log("🔇 pauseVADExternal called");
    this.pauseVAD();
  }

  public async submitAnswer(transcript: string) {
    await this.getNextAIQuestion(transcript);
  }

  public getTTSElapsedSeconds(): number {
    if (!this.isTTSActuallyPlaying || !this.ttsStartTime) return 0;
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
    if (!this.isConnected) return;
    if (this.isFirstQuestionRequested) return;
    
    this.isFirstQuestionRequested = true;
    this.initialAttachments = opts?.attachments ?? null;
    await this.getNextAIQuestion("START_SESSION");
  }

  public async endCurrentSection(): Promise<void> {
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
        if (this.vadMediaRecorder && this.vadMediaRecorder.state === 'recording') {
            this.vadMediaRecorder.stop();
        } else if (this.isProcessingRequest) {
             // Wait
        } else {
             this.pauseVAD();
             await this.finalizeSession();
             return;
        }

        try {
            await new Promise<void>(resolve => {
                this.finalSpeechProcessedResolve = resolve;
                setTimeout(resolve, 15000);
            });
        } catch(e) { console.error(e); }
        this.finalSpeechProcessedResolve = null;
    }
    await this.finalizeSession();
  }

  public async startRecording(): Promise<void> { /* VAD mode automatic */ }
  public async stopRecording(): Promise<void> { /* VAD mode automatic */ }

  public disconnect(): void {
    this.forceDisconnect();
    this.updateConnectionStatus("disconnected");
    console.log("🔌 VAD Python Speech Service Disconnected");
  }

  // === Private Methods ===
  private forceDisconnect(): void {
    if (this.vadInstance) {
      try { this.vadInstance.destroy(); } catch (e) {}
      this.vadInstance = null;
    }
    if (this.vadMediaRecorder && this.vadMediaRecorder.state === "recording") {
      try { this.vadMediaRecorder.stop(); } catch (e) {}
    }
    this.vadMediaRecorder = null;
    this.vadAudioChunks = [];
    if (this.recorderStream) {
      try { this.recorderStream.getTracks().forEach((track) => track.stop()); } catch (e) {}
      this.recorderStream = null;
    }
    this.audioStream = null;
    if (this.currentUtterance && this.speechSynthesis) {
      try { this.speechSynthesis.cancel(); } catch (e) {}
      this.currentUtterance = null;
    }
    if (this.isSessionEnding) {
      this.onSessionFinishCallback();
    }
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
        if (this.vadMediaRecorder && this.vadMediaRecorder.state === "recording") {
          this.isVADForciblyStopped = true;
          this.vadMediaRecorder.stop();
        }
      } catch (e) { console.error(e); }
    }
  }

  private resumeVAD(): void {
    if (!this.isTestFinished && this.vadInstance) {
      try {
        if (this.isWaitingForFinalResponse) {
          this.finalizeSession();
          return;
        }
        if (this.isVADRecording) {
            this.isVADRecording = false;
            this.onVADStatusCallback(false);
        }
        this.isProcessingRequest = false;
        this.isVADForciblyStopped = false;
        this.vadInstance.start();
        console.log("🔊 VAD Resumed");
      } catch (e) { console.error(e); }
    }
  }

  private async initializeClientVAD() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recorderStream = this.audioStream.clone();

      this.vadInstance = await vad.MicVAD.new({
        ...vadOptions,
        stream: this.audioStream,
        onSpeechStart: () => {
          this.isVADRecording = true;
          this.onVADStatusCallback(true);
          if (this.vadMediaRecorder && this.vadMediaRecorder.state !== "recording") {
            this.vadAudioChunks = [];
            try { this.vadMediaRecorder.start(1000); } catch (e) { this.handleError("speechService.errors.vadInitFailed", e); }
          }
        },
        onSpeechEnd: () => {
          this.onVADStatusCallback(false);
          if (!this.isVADRecording) return;
          this.isVADRecording = false;
          if (this.vadInstance) this.vadInstance.pause();
          if (this.vadMediaRecorder && this.vadMediaRecorder.state === "recording") {
            this.vadMediaRecorder.stop();
          }
        },
      } as any);

      this.vadMediaRecorder = new MediaRecorder(this.recorderStream);
      this.vadMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.vadAudioChunks.push(event.data);
      };

      this.vadMediaRecorder.onstop = async () => {
        if (this.isVADForciblyStopped) {
            this.vadAudioChunks = [];
            this.isVADForciblyStopped = false;
            return;
        }
        this.onSTTProcessingStartCallback();
        const audioBlob = new Blob(this.vadAudioChunks, { type: "audio/webm" });
        this.vadAudioChunks = [];

        try {
            // Python STT call
            const transcript = await this.sendToPythonSTT(audioBlob);
            this.onSTTProcessingEndCallback();
            
            if (transcript) {
                this.handleTranscriptResult(transcript, true, audioBlob);
            } else {
                await this.speakWithTTS("Please Say again.");
            }
        } catch (error) {
            this.onSTTProcessingEndCallback();
            this.handleError("speechService.errors.sttFailed", error);
            this.resumeVAD();
        }
      };
    } catch (error) {
      this.handleError("speechService.errors.vadInitFailed", error);
    }
  }

  private async sendToPythonSTT(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    // apiClient에서 baseUrl 가져오기
    const baseUrl = apiClient.getBaseUrl();  // ← 추가
    const response = await fetch(`${baseUrl}/api/python/stt`, { method: 'POST', body: formData });  // ← 수정
    
    if (!response.ok) throw new Error(`Python STT Error: ${response.statusText}`);
    const data = await response.json();
    return data.text || "";
  }

  private handleTranscriptResult = (transcript: string, isFinal: boolean, audioBlob: Blob | null) => {
      if (this.isTTSSpeaking || this.isTTSPreparing || this.isProcessingRequest) return;
      this.onTranscriptCallback(transcript, isFinal);
      if (isFinal) {
          const trimmed = transcript.trim();
          if (trimmed.length > 0) {
              if (this.onVoiceResponseCallback) {
                  this.onVoiceResponseCallback(trimmed, audioBlob);
              } else {
                  this.getNextAIQuestion(trimmed);
              }
          } else {
              this.resumeVAD();
          }
      }
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

  private async getNextAIQuestion(transcript: string) {
    this.isProcessingRequest = true;
    this.pauseVAD();
    try {
        if (transcript !== 'START_SESSION') this.onTranscriptCallback(transcript, true);
        
        const studentInfo = this.currentStudent ? {
            school: this.currentStudent.school || '',
            registrationNumber: this.currentStudent.registrationNumber,
            name: this.currentStudent.name || '',
            examStudentId: this.currentExamStudentId,
        } : undefined;

        const examInfo = this.currentExam ? {
            name: this.currentExam.name,
            content: this.getCurrentSectionContent(),
            chapter: this.currentExam.chapter || 1,
            sectionId: this.currentSectionId
        } : undefined;

        if (this.isTestFinished && transcript !== 'START_SESSION') return;

        const response = await sendAnswerToAI(
            transcript, studentInfo, examInfo, 
            transcript === 'START_SESSION' ? (this.initialAttachments ?? undefined) : undefined,
            undefined,
            this.currentSessionId ?? undefined
        );

        if (transcript === 'START_SESSION') {
            this.initialAttachments = null;
            this.sessionRetryAttempted = false;
        }

        if (this.isWaitingForFinalResponse) {
             if (response.success && response.data?.nextQuestion) {
                 this.onMessageCallback(response.data.nextQuestion, false);
                 await new Promise(resolve => setTimeout(resolve, 500));
             }
             if (this.finalSpeechProcessedResolve) this.finalSpeechProcessedResolve();
             await this.finalizeSession();
             return;
        }

        if (response.success && response.data) {
             if (response.data.type === 'finish') {
                 await this.finalizeSession();
                 return;
             }
             if (response.data.sessionId) {
                 this.currentSessionId = response.data.sessionId;
             }
             if (response.data.nextQuestion) {
                 if (this.isTestFinished) {
                     this.onMessageCallback('', false);
                     return;
                 }
                 this.onMessageCallback(response.data.nextQuestion, false);
                 await this.speakWithTTS(response.data.nextQuestion);
             } else {
                 this.resumeVAD();
             }
        } else {
             // Simplified error handling
             this.handleError(response.error || 'speechService.errors.noNextQuestion');
             this.onMessageCallback('', false);
             this.resumeVAD();
        }
    } catch (error) {
        this.handleError('speechService.errors.requestNextQuestionFailed', error);
        this.onMessageCallback('', false);
        this.onSTTProcessingEndCallback();
        this.resumeVAD();
    } // finally is handled by VAD resume logic in most cases, or explicit resume
  }

  private async finalizeSession() {
      if (this.isSessionEnding) return;
      this.isTestFinished = true;
      this.isSessionEnding = true;
      this.isWaitingForFinalResponse = false;
      this.pauseVAD();
      if (this.speechSynthesis && this.currentUtterance) {
          this.speechSynthesis.cancel();
          this.currentUtterance = null;
      }
      if (this.vadInstance) {
          try { this.vadInstance.destroy(); } catch(e) {}
          this.vadInstance = null;
      }
      if (this.vadMediaRecorder) {
          if (this.vadMediaRecorder.state === 'recording') this.vadMediaRecorder.stop();
          this.vadMediaRecorder = null;
      }
      if (this.recorderStream) {
          try { this.recorderStream.getTracks().forEach(t => t.stop()); } catch(e) {}
          this.recorderStream = null;
      }
      this.audioStream = null;
      await this.speakWithTTS(this.sessionEndMessage, true);
  }

  public async speakWithTTS(text: string, isSessionEndingMessage: boolean = false) {
      if (!this.speechSynthesis) {
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
          await new Promise(resolve => setTimeout(resolve, 100));
          this.isTTSPreparing = false;
          this.onTTSPreparingCallback(false);

          const utterance = new SpeechSynthesisUtterance(text);
          this.currentUtterance = utterance;
          const voices = this.speechSynthesis.getVoices();
          const googleVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang.startsWith('en'));
          if (googleVoice) utterance.voice = googleVoice;
          utterance.lang = 'en-US';
          
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
          console.error(error);
          this.onTTSStatusCallback(false);
          this.resumeVAD();
      }
  }

  private handleError(key: string, error?: any) {
    const msg = error instanceof Error ? error.message : String(error || '');
    console.error(`[VAD Python SpeechService Error] ${key}`, msg);
    this.onErrorCallback(key);
  }

  private updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error') {
    this.onConnectionStatusCallback(status);
  }
}

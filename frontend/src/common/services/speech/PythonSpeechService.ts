import { sendAnswerToAI } from '@/common/services/student/sendAnswerToAI';
import { AIAttachment, Exam, Student } from '@/common/types';
import apiClient from '@/common/services/apiClient';
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
} from './BaseSpeechService';

export class PythonSpeechService implements ISpeechService {
  public readonly sttMode: STTMode = 'python';

  private isConnected = false;
  private isTestFinished = false;
  private isTTSSpeaking = false;
  private isTTSPreparing = false;
  private isProcessingRequest = false; // Prevents processing multiple inputs at once

  // Callbacks
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

  // Audio Recording
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioStream: MediaStream | null = null;

  // Session State
  private isFirstQuestionRequested = false;
  private currentExam: Exam | null = null;
  private currentStudent: Student | null = null;
  private currentExamStudentId: number | string | null = null;
  private currentSectionId: number | string | null = null;
  private currentSessionId: string | null = null;

  private isSessionEnding = false;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentRagSources: string[] | null = null;

  private initialAttachments: AIAttachment[] | null = null;
  private isTTSActuallyPlaying = false;
  private ttsStartTime: number | null = null;
  
  private sessionRetryAttempted = false;
  private sessionEndMessage: string = DEFAULT_SESSION_END_MESSAGE;

  constructor() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      console.log(`🎤 Python Speech Service Initialized (Mode: python)`);
    } else {
      console.warn('⚠️ Web Speech API not supported in this browser');
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
    // Button mode - no VAD to pause
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
    console.log('⏭️ Skipping TTS');
    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.isTTSSpeaking = false;
      this.isTTSActuallyPlaying = false;
      this.isTTSPreparing = false;
      this.ttsStartTime = null;
      this.onTTSStatusCallback(false);
      this.onTTSPreparingCallback(false);
      console.log('✅ TTS skipped successfully');
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
    ragSources?: string[]
  ): Promise<void> {
    this.forceDisconnect();

    this.isFirstQuestionRequested = false;
    this.isConnected = false;
    this.isTestFinished = false;

    this.currentExam = exam;
    this.currentStudent = student;
    this.currentExamStudentId = examStudentId ?? null;
    this.currentSectionId = sectionId ?? null;
    this.currentRagSources = ragSources ?? null;
    this.currentSessionId = null;

    this.updateConnectionStatus('connecting');

    try {
      this.isConnected = true;
      this.updateConnectionStatus('connected');
    } catch (error) {
      this.handleError('speechService.errors.connectionFailed', error);
      this.disconnect();
    }
  }

  public async requestFirstQuestion(opts?: { attachments?: AIAttachment[] }): Promise<void> {
    console.log('[PythonSpeechService] requestFirstQuestion called', { 
        isConnected: this.isConnected, 
        isFirstQuestionRequested: this.isFirstQuestionRequested,
        currentExamId: this.currentExam?.id,
        hasSections: !!this.currentExam?.sections,
        sectionsCount: this.currentExam?.sections?.length
    });
    if (!this.isConnected) return;
    if (this.isFirstQuestionRequested) return;
    
    this.isFirstQuestionRequested = true;
    this.initialAttachments = opts?.attachments ?? null;
    console.log('[PythonSpeechService] Calling getNextAIQuestion with START_SESSION');
    await this.getNextAIQuestion('START_SESSION');
  }

  public async endCurrentSection(): Promise<void> {
    if (this.isConnected) {
      await this.submitAnswer('END_SESSION');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    this.disconnect();
  }

  public async sendEndSignal(): Promise<void> {
    await this.finalizeSession();
  }

  public async startRecording(): Promise<void> {
    if (!this.isConnected) return this.handleError('speechService.errors.notConnected');
    await this.startManualRecording();
  }

  public async stopRecording(): Promise<void> {
    await this.stopManualRecording();
  }

  public disconnect(): void {
    this.forceDisconnect();
    this.updateConnectionStatus('disconnected');
    console.log('🔌 Python Speech Service Disconnected');
  }

  // === Private Methods ===
  private forceDisconnect(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    this.mediaRecorder = null;
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    if (this.currentUtterance && this.speechSynthesis) {
      try { this.speechSynthesis.cancel(); } catch (e) {}
      this.currentUtterance = null;
    }
    if (this.isSessionEnding) {
      this.onSessionFinishCallback();
    }
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
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm'; 
      // Safari/iOS might need audio/mp4 or specific codec config needed?
      // For now default to webm or mp4 if supported.
      if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.onSTTProcessingStartCallback();
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        try {
          // Call Python STT API
          const text = await this.sendToPythonSTT(audioBlob, mimeType);
          this.onSTTProcessingEndCallback();

          if (text) {
             this.handleTranscriptResult(text, true, audioBlob);
          } else {
             this.handleError('speechService.errors.sttFailed', 'Empty response');
          }
        } catch (error) {
          this.onSTTProcessingEndCallback();
          this.handleError('speechService.errors.sttFailed', error);
        }
      };

      this.mediaRecorder.start();
      this.onVADStatusCallback(true);
      console.log('🎤 Manual recording started (Python)');
    } catch (error) {
      this.handleError('speechService.errors.micAccessFailed', error);
    }
  }

  private async stopManualRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.onVADStatusCallback(false);
      console.log('🎤 Manual recording stopped');
    }
  }
  
  private async sendToPythonSTT(audioBlob: Blob, mimeType: string): Promise<string> {
    const formData = new FormData();
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    formData.append('audio', audioBlob, `recording.${ext}`);
    formData.append('language', 'auto');

    // apiClient에서 baseUrl 가져오기
    const baseUrl = apiClient.getBaseUrl();  // ← 추가
    const response = await fetch(`${baseUrl}/api/stt/transcribe`, {  // ← 수정
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
        throw new Error(`Python STT Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.text || '';
  }

  private handleTranscriptResult(transcript: string, isFinal: boolean, audioBlob: Blob | null) {
      if (this.isTTSSpeaking || this.isTTSPreparing || this.isProcessingRequest) {
          console.log(`🚫 Ignoring STT result: "${transcript}"`);
          return;
      }
      this.onTranscriptCallback(transcript, isFinal);
      
      if (isFinal) {
          const trimmed = transcript.trim();
          if (trimmed.length > 0) {
              if (this.onVoiceResponseCallback) {
                  this.onVoiceResponseCallback(trimmed, audioBlob);
              } else {
                  this.getNextAIQuestion(trimmed);
              }
          }
      }
  }

  private getCurrentSectionContent(): string {
    if (!this.currentExam?.sections) {
        console.warn('[PythonSpeechService] getCurrentSectionContent: No sections found', this.currentExam);
        return "";
    }

    // sectionId가 지정되어 있으면 매칭되는 섹션의 content 반환
    if (this.currentSectionId) {
      const section = this.currentExam.sections.find(
        (s: any) => String(s.id) === String(this.currentSectionId)
      );
      if (section?.content) {
          console.log('[PythonSpeechService] Found section content:', section.content.substring(0, 20) + "...");
          return section.content;
      }
      console.warn(`[PythonSpeechService] Section ${this.currentSectionId} not found or empty`, section);
    }

    // fallback: 첫 번째 섹션
    const content = this.currentExam.sections[0]?.content || "";
    console.log('[PythonSpeechService] Using fallback content:', content.substring(0, 20) + "...");
    return content;
  }

  // Reuse logic from OpenAISpeechService for getNextAIQuestion
  private async getNextAIQuestion(transcript: string) {
    this.isProcessingRequest = true;
    this.onSTTProcessingStartCallback(); // ✅ Pause Timer & Show Loading

    try {
        if (transcript !== 'START_SESSION') {
            this.onTranscriptCallback(transcript, true);
        }
        
        const content = this.getCurrentSectionContent();
        console.log('[PythonSpeechService] Preparing examInfo with content length:', content.length);

        const studentInfo = this.currentStudent ? {
            school: this.currentStudent.school || '',
            registrationNumber: this.currentStudent.registrationNumber,
            name: this.currentStudent.name || '',
            examStudentId: this.currentExamStudentId,
        } : undefined;

        const examInfo = this.currentExam ? {
            name: this.currentExam.name,
            content: content,
            chapter: this.currentExam.chapter || 1,
            sectionId: this.currentSectionId
        } : undefined;

        if (this.isTestFinished && transcript !== 'START_SESSION') {
            this.onSTTProcessingEndCallback(); // ✅
            return;
        }

        // Use core logical service
        const response = await sendAnswerToAI(
            transcript,
            studentInfo,
            examInfo,
            transcript === 'START_SESSION' ? (this.initialAttachments ?? undefined) : undefined,
            undefined,
            this.currentSessionId ?? undefined,
            this.currentRagSources ?? undefined
        );

        this.onSTTProcessingEndCallback(); // ✅ Processing Done

        if (response.success && response.data) {
             if (response.data.sessionId) {
                 this.currentSessionId = response.data.sessionId;
             }

             if (response.data.type === 'finish') {
                 await this.finalizeSession();
                 return;
             }
             if (response.data.nextQuestion) {
                 if (this.isTestFinished) {
                     this.onMessageCallback('', false);
                     return;
                 }
                 this.onMessageCallback(response.data.nextQuestion, false);
                 await this.speakWithTTS(response.data.nextQuestion);
             }
        } else {
            // Error handling can be simplified for now
            this.handleError(response.error || 'speechService.errors.noNextQuestion');
            this.onMessageCallback('', false);
        }
    } catch (error) {
        this.onSTTProcessingEndCallback(); // ✅
        this.handleError('speechService.errors.requestNextQuestionFailed', error);
        this.onMessageCallback('', false);
    } finally {
        this.isProcessingRequest = false;
    }
  }

  private async finalizeSession() {
      if (this.isSessionEnding) return;
      this.isTestFinished = true;
      this.isSessionEnding = true;
      if (this.speechSynthesis) this.speechSynthesis.cancel();
      await this.speakWithTTS(this.sessionEndMessage, true);
  }

  public async speakWithTTS(text: string, isSessionEndingMessage: boolean = false) {
      if (!this.speechSynthesis) {
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
              }
          };
          utterance.onerror = () => {
              this.isTTSSpeaking = false;
              this.isTTSActuallyPlaying = false;
              this.onTTSStatusCallback(false);
              if (isSessionEndingMessage && this.isSessionEnding) {
                  this.onSessionFinishCallback();
                  this.isSessionEnding = false;
              }
          };
          this.speechSynthesis.speak(utterance);
      } catch (error) {
          console.error(error);
          this.onTTSStatusCallback(false);
      }
  }

  private handleError(key: string, error?: any) {
    const msg = error instanceof Error ? error.message : String(error || '');
    console.error(`[Python SpeechService Error] ${key}`, msg);
    this.onErrorCallback(key);
  }

  private updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error') {
    this.onConnectionStatusCallback(status);
  }
}

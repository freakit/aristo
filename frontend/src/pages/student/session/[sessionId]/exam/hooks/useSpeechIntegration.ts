import { useState, useRef, useCallback, useEffect } from "react";
import { SpeechServiceController } from "@/common/services/speech";
import { AIAttachment } from "@/common/types";
import { ExamPhase } from "./types";

interface UseSpeechIntegrationProps {
  setExamPhase: (phase: ExamPhase) => void;
  timerMode: React.MutableRefObject<"student_only" | "full_exam">;
  pauseTimer: () => void;
  resumeTimer: () => void;
  setLoadingMode: (mode: "stt" | "generation" | null) => void;
  setIsWaitingForServerResponse: (isWaiting: boolean) => void;
  onError: (error: string) => void;
}

export const useSpeechIntegration = ({
  setExamPhase,
  timerMode,
  pauseTimer,
  resumeTimer,
  setLoadingMode,
  setIsWaitingForServerResponse,
  onError,
}: UseSpeechIntegrationProps) => {
  const speechServiceRef = useRef(SpeechServiceController.createService());

  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");

  const [isRecording, setIsRecording] = useState(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const [isTTSPreparing, setIsTTSPreparing] = useState(false);
  const [isVADListening, setIsVADListening] = useState(false);
  const [isExternalAudioDetected, setIsExternalAudioDetected] = useState(false);

  // Connection
  const connect = useCallback(
    async (
      exam: any,
      student: any,
      examStudentId: number,
      sectionId: number,
      vectorKeys: string[], // ✅ ragSources → vectorKeys
    ) => {
      if (speechServiceRef.current) {
        console.log("🔌 Connecting speech service...");
        await speechServiceRef.current.connect(
          exam,
          student,
          examStudentId,
          sectionId,
          vectorKeys, // ✅
        );
        if ("pauseVADExternal" in speechServiceRef.current) {
          (speechServiceRef.current as any).pauseVADExternal();
        }
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    if (speechServiceRef.current) {
      speechServiceRef.current.disconnect();
    }
  }, []);

  // Recording Control
  const stopRecording = useCallback(async () => {
    const service = speechServiceRef.current;
    if (service) {
      await service.stopRecording();
      setIsRecording(false);
    }
  }, []);

  // phase 전환 제거 — 녹음은 LISTENING 단계에서만 Page.tsx에서 제어
  const handleToggleRecording = useCallback(async () => {
    const service = speechServiceRef.current;
    if (isRecording) {
      await stopRecording();
    } else {
      await service.startRecording();
      setIsRecording(true);
      if ("pauseVADExternal" in service) {
        (service as any).pauseVADExternal();
      }
      // ❌ 제거됨: setExamPhase("RECORDING_STARTED");
      // Phase는 Page.tsx에서 관리
    }
  }, [isRecording, stopRecording]);

  // Start First Question
  const handleStartFirstQuestion = useCallback(
    async (
      examPhase: ExamPhase,
      gatherAttachments: () => Promise<AIAttachment[]>,
    ) => {
      if (!speechServiceRef.current || examPhase !== "RECORDING_STARTED")
        return;

      console.log(
        "🎯 [handleStartFirstQuestion] User clicked start start question.",
      );
      setExamPhase("FIRST_QUESTION_REQUESTED");

      try {
        const attachments = await gatherAttachments();
        await speechServiceRef.current.requestFirstQuestion({ attachments });
        setExamPhase("GENERATING_QUESTION");
      } catch (e) {
        console.error("Failed to start first question:", e);
        setExamPhase("RECORDING_STARTED");
      }
    },
    [setExamPhase],
  );

  // Skip TTS
  const handleSkipTTS = useCallback(() => {
    if (speechServiceRef.current) {
      console.log("⏭️ User requested TTS skip");
      speechServiceRef.current.skipTTS();
    }
    setIsTTSSpeaking(false);
    setIsTTSPreparing(false);
    setIsVADListening(true);

    // ✅ Student Only: Skip instantly goes to LISTENING, so resume.
    // ✅ Full Exam: Timer should already be running, but resume is safe.
    if (timerMode.current === "student_only") {
      resumeTimer();
    }
  }, [resumeTimer, timerMode]);

  // Setup Callbacks
  const registerCallbacks = useCallback(
    ({
      onVoiceResponse,
      onMessage,
      onTranscript,
      onSessionFinish,
    }: {
      onVoiceResponse?: (transcript: string, blob: Blob | null) => void;
      onMessage: (message: string, isUser: boolean) => void;
      onTranscript: (transcript: string, isFinal: boolean) => void;
      onSessionFinish: () => void;
    }) => {
      const service = speechServiceRef.current;
      if (!service) return;

      service.onConnectionStatus(setConnectionStatus);
      service.onError((err) => {
        onError(err);
        setIsWaitingForServerResponse(false);
      });

      // Voice Response
      if (onVoiceResponse && "onVoiceResponse" in service) {
        (service as any).onVoiceResponse(onVoiceResponse);
      }

      // TTS Status
      service.onTTSStatus((speaking) => {
        setIsTTSSpeaking(speaking);
        if (speaking) {
          setExamPhase("QUESTION_READING");
          // ✅ Student Only: Pause when AI speaks
          if (timerMode.current === "student_only") {
            pauseTimer();
          }
        } else {
          // Finished speaking -> READY_FOR_LISTEN
          console.log("🔊 TTS Finished -> Setting phase to READY_FOR_LISTEN");
          setExamPhase("READY_FOR_LISTEN");
          // ✅ Student Only: Resume
          if (timerMode.current === "student_only") {
            console.log("⏱️ Resuming timer for READY_FOR_LISTEN");
            resumeTimer();
          }
        }
      });

      // VAD Status
      service.onVADStatus?.((listening) => {
        setIsVADListening(listening);
        if (listening) {
          setExamPhase("LISTENING");
        }
      });

      // TTS Preparing
      service.onTTSPreparing?.((preparing) => {
        setIsTTSPreparing(preparing);
        // ✅ Student Only: Pause during latency
        if (preparing && timerMode.current === "student_only") {
          pauseTimer();
        }
      });

      // STT Processing
      service.onSTTProcessingStart?.(() => {
        setIsWaitingForServerResponse(true);
        setLoadingMode("stt");
        setExamPhase("PROCESSING_ANSWER");
        // ✅ Student Only: Pause when processing starts (Listening ended)
        if (timerMode.current === "student_only") {
          pauseTimer();
        }
      });

      service.onSTTProcessingEnd?.(() => {
        setIsWaitingForServerResponse(false);
        setLoadingMode(null);
      });

      // Message & Transcript
      service.onMessage(onMessage);
      service.onTranscript(onTranscript);
      service.onSessionFinish(onSessionFinish);
    },
    [
      setExamPhase,
      timerMode,
      pauseTimer,
      resumeTimer,
      setLoadingMode,
      setIsWaitingForServerResponse,
      onError,
    ],
  );

  // Initialize Service (Re-creation logic if needed can be handled here or in useEffect of parent)
  // For now we assume one instance per hook lifestyle, but we expose a recreate method if needed.
  const recreateService = useCallback(() => {
    speechServiceRef.current.disconnect();
    speechServiceRef.current = SpeechServiceController.createService();
  }, []);

  return {
    speechServiceRef,
    connectionStatus,
    isRecording,
    setIsRecording, // exposed if needed to set manually, but mostly managed internally
    isTTSSpeaking,
    setIsTTSSpeaking,
    isTTSPreparing,
    setIsTTSPreparing,
    isVADListening,
    setIsVADListening,
    isExternalAudioDetected,
    setIsExternalAudioDetected,
    connect,

    disconnect,
    handleToggleRecording,
    stopRecording, // Added
    handleStartFirstQuestion,
    handleSkipTTS,
    registerCallbacks,
    recreateService,
    isVADMode: SpeechServiceController.isVADMode(),
  };
};

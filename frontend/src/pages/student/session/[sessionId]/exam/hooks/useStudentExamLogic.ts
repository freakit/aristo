/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { SpeechServiceController } from "@/common/services/speech";
import { Student, AIAttachment } from "@/common/types";
import { useTranslation } from "@/common/i18n";
import { useExamShell } from "../../Layout.context";
import { getExamById } from "@/common/services/api/getExamById";
import apiClient from "@/common/services/apiClient";
import { hydrateExamAttachments as hydrateExamAttachmentsApi } from "../services/hydrateExamAttachments";

// API Imports
import { getExamSession } from "@/common/services/student/getExamSession";
import { getQAList } from "@/common/services/api/getQAList";
import { completeExam } from "@/common/services/student/completeExam";
import { signalSessionEnd } from "@/common/services/student/signalSessionEnd";

// Hooks
import { useExamState } from "./useExamState";
import { useExamNavigation } from "./useExamNavigation";
import { useExamMedia } from "./useExamMedia";
import { useExamLifecycle } from "./useExamLifecycle";

// New Refactored Hooks
import { useExamTimer } from "./useExamTimer";
import { useExamSetup } from "./useExamSetup";
import { useExamReview } from "./useExamReview";
import { useSpeechIntegration } from "./useSpeechIntegration";
import { ExamPhase } from "./types";

export type { ExamPhase };

const isImageFileName = (name: string) =>
  /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name);

export const useStudentExamLogic = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Storage
  const storedExamStudentId = localStorage.getItem("examStudentId");
  const storedExamSetId = localStorage.getItem("examSetId");

  // Context
  const examShell = useExamShell();
  const {
    isTrackingRecording,
    setExamStudentId: setExamStudentIdInContext,
    setIsExamInProgress,
    markSectionComplete,
    exams,
    setExamFinishedConditionMet,
    isCameraReady,
    stopSetRecording,
  } = examShell;

  // 1. Core State
  const state = useExamState();
  const {
    exam,
    setExam,
    student,
    setStudent,
    session,
    setSession,
    examStudentId,
    setExamStudentId,
    currentSectionIndex,
    setCurrentSectionIndex,
    qaSets,
    setQASets,
    loading,
    setLoading,
    error,
    setError,
    // Setup status moved to useExamSetup
  } = state;

  // 2. Navigation & Media
  const { navigate, handleReloadPage } = useExamNavigation();
  const media = useExamMedia(exam);
  const { sasUrls, setSasUrls, isUploading, setIsUploading } = media;

  // 3. Local Interaction State (formerly in useExamInteraction)
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [isInitialAIResponseComplete, setIsInitialAIResponseComplete] =
    useState(false);
  const [aiScript, setAiScript] = useState(t("assistantPage.initialAIScript"));
  const [isWaitingForServerResponse, setIsWaitingForServerResponse] =
    useState(false);
  const [calibrationCompleted, setCalibrationCompleted] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"stt" | "generation" | null>(
    null,
  );
  const [examPhase, setExamPhase] = useState<ExamPhase>("IDLE");

  // Image Modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Derived Refs for Callbacks
  const qaSetsRef = useRef(qaSets);
  const examStudentIdRef = useRef(examStudentId);
  const examsRef = useRef(exams);
  const isSessionFinishedRef = useRef(isSessionFinished);
  const isInitialAIResponseCompleteRef = useRef(isInitialAIResponseComplete);
  const latestFinalTranscriptRef = useRef<string>("");
  const studentRef = useRef(student);
  const examRef = useRef(exam);
  const isNavigatingRef = useRef(false);
  const rightQAAreaRef = useRef<HTMLDivElement>(null);

  // Sync Refs
  useEffect(() => {
    qaSetsRef.current = qaSets;
  }, [qaSets]);
  useEffect(() => {
    examStudentIdRef.current = examStudentId;
  }, [examStudentId]);
  useEffect(() => {
    examsRef.current = exams;
  }, [exams]);
  useEffect(() => {
    isSessionFinishedRef.current = isSessionFinished;
  }, [isSessionFinished]);
  useEffect(() => {
    isInitialAIResponseCompleteRef.current = isInitialAIResponseComplete;
  }, [isInitialAIResponseComplete]);
  useEffect(() => {
    studentRef.current = student;
  }, [student]);
  useEffect(() => {
    examRef.current = exam;
  }, [exam]);

  // 4. Setup Hook
  const {
    setupStatus,
    setSetupStatus,
    setupError,
    setSetupError,
    handleConfirmSetup,
    isMac,
  } = useExamSetup(setExamPhase);

  // 5. Timer Hook
  const {
    remainingTime,
    isAwaitingFinishOnTimeout,
    pauseTimer,
    resumeTimer,
    resetTimer,
    timerMode,
  } = useExamTimer({
    exam,
    isInitialAIResponseComplete,
    onTimeout: () => {
      // Handle timeout actions
      if (SpeechServiceController.isButtonMode()) {
        speechIntegration.stopRecording();
      }
      speechIntegration.speechServiceRef.current?.sendEndSignal();
    },
    examPhase,
  });

  const isAwaitingFinishOnTimeoutRef = useRef(isAwaitingFinishOnTimeout);
  useEffect(() => {
    isAwaitingFinishOnTimeoutRef.current = isAwaitingFinishOnTimeout;
  }, [isAwaitingFinishOnTimeout]);

  // 6. Speech Integration Hook
  const speechIntegration = useSpeechIntegration({
    setExamPhase,
    timerMode,
    pauseTimer,
    resumeTimer,
    setLoadingMode,
    setIsWaitingForServerResponse,
    onError: setError,
  });

  // Handle Student Answer Helper
  const handleStudentAnswer = useCallback(
    (answer: string) => {
      setQASets((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].answer = answer;
        }
        return updated;
      });
    },
    [setQASets],
  );

  // 7. Review Hook
  const {
    isReviewModalOpen,
    setIsReviewModalOpen,
    originalTranscript,
    reviewAudioUrl,
    handleVoiceResponse,
    submitReview,
    handleEditStart,
  } = useExamReview({
    speechServiceRef: speechIntegration.speechServiceRef,
    examStudentIdRef,
    qaSetsRef,
    studentRef,
    examRef,
    isSessionFinishedRef,
    handleStudentAnswer,
    setIsWaitingForServerResponse,
    setLoadingMode,
    pauseTimer, // ✅ Pass pauseTimer
  });

  // 8. Lifecycle & Auth
  useExamLifecycle({
    student,
    exam,
    isSessionFinished,
    isAwaitingFinishOnTimeout,
    isNavigating: isNavigatingRef.current,
  });

  // Finish Condition Sync
  const currentExamIndex = storedExamStudentId
    ? exams.findIndex((e) => String(e.examStudentId) === storedExamStudentId)
    : -1;
  const nextExam =
    currentExamIndex !== -1 && currentExamIndex < exams.length - 1
      ? exams[currentExamIndex + 1]
      : null;

  useEffect(() => {
    const isLastExam =
      currentExamIndex !== -1 && currentExamIndex === exams.length - 1;
    setExamFinishedConditionMet(isLastExam ? isSessionFinished : false);
  }, [
    isAwaitingFinishOnTimeout,
    isSessionFinished,
    setExamFinishedConditionMet,
    currentExamIndex,
    exams.length,
  ]);

  // Setup Bypass
  useEffect(() => {
    if (isTrackingRecording && setupStatus !== "ready") {
      setSetupStatus("ready");
    }
  }, [isTrackingRecording, setupStatus, setSetupStatus]);

  // TTS Skip Logic
  const [ttsElapsedTime, setTtsElapsedTime] = useState<number>(0);
  const [showSkipButton, setShowSkipButton] = useState<boolean>(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (speechIntegration.isTTSSpeaking || speechIntegration.isTTSPreparing) {
      intervalId = setInterval(() => {
        const elapsed =
          speechIntegration.speechServiceRef.current?.getTTSElapsedSeconds() ||
          0;
        setTtsElapsedTime(elapsed);
      }, 1000);
    } else {
      setTtsElapsedTime(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    speechIntegration.isTTSSpeaking,
    speechIntegration.isTTSPreparing,
    speechIntegration.speechServiceRef,
  ]);

  useEffect(() => {
    const shouldShow =
      ttsElapsedTime >= 30 &&
      !speechIntegration.isVADListening &&
      (speechIntegration.isTTSSpeaking || speechIntegration.isTTSPreparing);
    setShowSkipButton(shouldShow);
  }, [
    ttsElapsedTime,
    speechIntegration.isTTSSpeaking,
    speechIntegration.isTTSPreparing,
    speechIntegration.isVADListening,
  ]);

  const handleSkipTTSWrapper = useCallback(() => {
    speechIntegration.handleSkipTTS();
    setTtsElapsedTime(0);
    setShowSkipButton(false);
  }, [speechIntegration]);

  // Gather Attachments
  const gatherAllAttachmentUrlsForAI = useCallback(async (): Promise<
    AIAttachment[]
  > => {
    if (!exam?.sections) return [];

    const pairs = exam.sections.flatMap((sec: any) =>
      (sec.attachments ?? [])
        .filter((a: any) => !!a.file)
        .map((a: any) => ({ secId: sec.id, file: a.file })),
    );
    const uniq = Array.from(new Map(pairs.map((p) => [p.file.id, p])).values());

    const ensureSas = async (f: any) => {
      let url = sasUrls[f.id];
      if (!url) {
        const r = await apiClient.getAzureSasToken(f.fileName, {
          folder: "attachments",
        });
        url = r?.data?.sasUrl as any;
        if (url) {
          setSasUrls((prev: Record<string, string>) => ({
            ...prev,
            [f.id]: url,
          }));
        }
      }
      return url;
    };

    const out: AIAttachment[] = [];
    for (const p of uniq) {
      const url = await ensureSas(p.file);
      if (url) {
        out.push({
          kind: isImageFileName(p.file.fileName) ? "image" : "file",
          url,
          fileName: p.file.fileName,
        });
      }
    }
    return out;
  }, [exam, sasUrls, setSasUrls]);

  // Init Logic
  const init = useCallback(async () => {
    if (!storedExamStudentId) return;
    if (isInitialAIResponseCompleteRef.current && !isSessionFinishedRef.current)
      return;

    setLoading(true);
    setExam(null);
    setStudent(null);

    try {
      setQASets([]);
      setAiScript(t("assistantPage.initialAIScript"));
      setIsInitialAIResponseComplete(false);
      setIsSessionFinished(false);
      setIsExamInProgress(true);

      isNavigatingRef.current = false;
      resetTimer();

      speechIntegration.recreateService();

      // Register Callbacks
      speechIntegration.registerCallbacks({
        onVoiceResponse: handleVoiceResponse,
        onMessage: (message, isUser) => {
          if (isUser) return;
          setIsWaitingForServerResponse(false);
          setLoadingMode(null);
          if (!message || isAwaitingFinishOnTimeoutRef.current) return;

          latestFinalTranscriptRef.current = "";
          setError(null);
          setIsInitialAIResponseComplete(true);
          setAiScript(message);

          setQASets((prev) => [
            ...prev,
            { question: message, answer: "", timestamp: new Date() },
          ]);

          if (!qaSetsRef.current.length) {
            if ((window as any).markFirstQuestionCalled)
              (window as any).markFirstQuestionCalled();
          }
        },
        onTranscript: (transcript, isFinal) => {
          setAiScript(
            `${t("assistantPage.qaArea.studentAnswerLabel")}: ${transcript}`,
          );
          if (!isFinal) return;
          latestFinalTranscriptRef.current = transcript;
          setError(null);
          setQASets((prev) => {
            const updated = [...prev];
            if (updated.length > 0)
              updated[updated.length - 1].answer = transcript;
            return updated;
          });
        },
        onSessionFinish: async () => {
          console.log("🏁 onSessionFinish");
          setIsSessionFinished(true);
          isSessionFinishedRef.current = true;
          setIsExamInProgress(false);
          setExamPhase("FINISHED");

          if (sessionData.examStudentId) {
            try {
              markSectionComplete(String(sessionData.examStudentId));
              await completeExam(String(sessionData.examStudentId));
            } catch (e) {
              console.error(e);
            }
          }

          // Determine end message
          const latestExams = examsRef.current;
          const currentIdx = storedExamStudentId
            ? latestExams.findIndex(
                (e) => String(e.examStudentId) === storedExamStudentId,
              )
            : -1;
          const hasNext =
            currentIdx !== -1 && currentIdx < latestExams.length - 1;
          const endMessage = hasNext
            ? t("assistantPage.sessionEnd.nextExamMessage")
            : t("assistantPage.sessionEnd.message");

          setIsWaitingForServerResponse(false);
          setAiScript(endMessage);
          resetTimer();
        },
      });

      // Fetch Data
      const sessionData = await getExamSession(storedExamStudentId);
      const examData = await getExamById(String(sessionData.examId));
      if (!examData) throw new Error("Exam not found");
      const hydratedExam = await hydrateExamAttachmentsApi(examData);
      const qaList = await getQAList(String(sessionData.examStudentId));

      const studentObj: Student = {
        id: String(sessionData.studentId),
        userId: String(sessionData.userId),
        name: sessionData.studentName,
        age: sessionData.age,
        gender: sessionData.gender,
        email: sessionData.email,
        phoneNumber: sessionData.phoneNumber,
        studentId: sessionData.studentId,
        school: sessionData.school,
        registrationNumber: sessionData.registrationNumber,
        significant: sessionData.significant,
        sessionId: sessionData.sessionId,
      };

      setExam(hydratedExam);
      setStudent(studentObj);
      setSession(sessionData);
      setExamStudentId(String(sessionData.examStudentId));
      setExamStudentIdInContext(String(sessionData.examStudentId));
      setQASets(qaList);

      if (qaList.length > 0) {
        setAiScript(qaList[qaList.length - 1].question || "");
      }

      if (sessionData.status === "completed") {
        setIsSessionFinished(true);
        setAiScript(t("assistantPage.alreadyCompleted"));
        setExamPhase("FINISHED");
        return;
      }

      setCalibrationCompleted(true);

      // Connect
      await speechIntegration.connect(
        hydratedExam,
        studentObj,
        sessionData.examStudentId,
        hydratedExam.sections?.[0]?.id ?? null,
        hydratedExam.ragSources ?? hydratedExam.sections?.[0]?.ragSources,
      );
      (window as any).speechServiceInstance =
        speechIntegration.speechServiceRef.current;

      // Set End Message
      const endMessageEn =
        currentExamIndex !== -1 &&
        currentExamIndex < examsRef.current.length - 1
          ? "This exam has ended. Please proceed to the next exam."
          : "All exams have ended. Please stop the recording immediately, upload the video, and then click the 'End Exam' button. Good work.";
      speechIntegration.speechServiceRef.current.setSessionEndMessage(
        endMessageEn,
      );
    } catch (err: any) {
      setError(err.message || t("assistantPage.errors.initFailed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    storedExamStudentId,
    t,
    navigate,
    setExam,
    setStudent,
    setSession,
    setExamStudentId,
    setExamStudentIdInContext,
    setQASets,
    setIsExamInProgress,
    setAiScript,
    setIsInitialAIResponseComplete,
    setIsSessionFinished,
    setIsWaitingForServerResponse,
    setError,
    setLoading,
    speechIntegration.recreateService,
    speechIntegration.registerCallbacks,
    speechIntegration.connect,
    handleVoiceResponse,
    resetTimer,
  ]);

  useEffect(() => {
    if (setupStatus === "ready") {
      init();
    }
  }, [setupStatus, init]);

  // FIX #4: "시험 시작" 버튼 핸들러 — CAMERA_READY → RECORDING_STARTED
  const handleStartExam = useCallback(() => {
    if (!isTrackingRecording) {
      alert(
        t("assistantPage.errors.recordingRequired") ||
          "Recording must be active to start the exam.",
      );
      return;
    }
    setExamPhase("RECORDING_STARTED");
  }, [setExamPhase, isTrackingRecording, t]);

  // Handle Next Exam
  const handleNextExam = useCallback(async () => {
    if (!examStudentId) {
      alert("Error: Cannot find current exam information.");
      return;
    }

    const confirmMessage = nextExam
      ? t("assistantPage.header.confirmMoveToNextExam")
      : t("assistantPage.header.endExamConfirm");
    if (!window.confirm(confirmMessage)) return;

    if (nextExam) isNavigatingRef.current = true;
    else setIsUploading(true);

    try {
      if (examStudentId) {
        markSectionComplete(examStudentId);
        setIsExamInProgress(false);
        await completeExam(examStudentId);
      }

      if (student && exam) {
        try {
          await signalSessionEnd(
            {
              school: student.school || "",
              registrationNumber: student.registrationNumber,
              name: student.name || "",
            },
            { name: exam.name },
          );
        } catch (e) {
          console.warn("Signal end failed", e);
        }
      }

      speechIntegration.disconnect();

      if (nextExam && storedExamSetId) {
        if (nextExam.examStudentId) {
          localStorage.setItem("examStudentId", String(nextExam.examStudentId));
        }
        navigate(`/student/session/${sessionId}/exam`, { replace: true });
      } else {
        if (storedExamSetId) await stopSetRecording();
        else navigate(`/student/session/${sessionId}/exam/complete`);
      }
    } catch (error) {
      console.error("Exam finalization process failed:", error);
      setError(
        "An error occurred while finalizing the exam. Please try again.",
      );
      setIsUploading(false);
    }
  }, [
    nextExam,
    storedExamSetId,
    stopSetRecording,
    navigate,
    sessionId,
    examStudentId,
    markSectionComplete,
    setIsExamInProgress,
    t,
    student,
    exam,
    speechIntegration.disconnect,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      speechIntegration.disconnect();
      resetTimer();
    };
  }, []);

  return {
    exam,
    student,
    session,
    examStudentId,
    currentSectionIndex,
    qaSets,
    loading,
    error,
    setupStatus,
    setupError,

    // States
    isRecording: speechIntegration.isRecording,
    isSessionFinished,
    isInitialAIResponseComplete,
    connectionStatus: speechIntegration.connectionStatus,
    aiScript,
    setAiScript, // Added explicitly
    setQASets, // Added explicitly
    setCurrentSectionIndex, // Added explicitly
    setIsInitialAIResponseComplete, // Added explicitly
    setIsSessionFinished, // Added explicitly
    isWaitingForServerResponse,
    isTTSSpeaking: speechIntegration.isTTSSpeaking,
    remainingTime,
    isVADListening: speechIntegration.isVADListening,
    isExternalAudioDetected: speechIntegration.isExternalAudioDetected,
    isTTSPreparing: speechIntegration.isTTSPreparing,
    isVADMode: speechIntegration.isVADMode,
    isTrackingRecording,

    sasUrls,
    isUploading,
    isNavigating: isNavigatingRef.current, // Use ref or derived state? Page uses it for disabling

    isMac,

    // Derived
    nextExam,
    rightQAAreaRef,

    // Handlers
    handleConfirmSetup,
    handleReloadPage,
    handleNextExam,
    handleToggleRecording: speechIntegration.handleToggleRecording,

    // Review Modal
    isReviewModalOpen,
    setIsReviewModalOpen,
    originalTranscript,
    reviewAudioUrl,
    submitReview,
    handleEditStart,
    handleStudentAnswer,

    // Image Modal
    selectedImage,
    setSelectedImage,

    handleSkipTTS: handleSkipTTSWrapper,
    showSkipButton,

    isAwaitingFinishOnTimeout,
    t,
    examPhase,
    handleStartExam,
    handleStartFirstQuestion: () =>
      speechIntegration.handleStartFirstQuestion(
        examPhase,
        gatherAllAttachmentUrlsForAI,
      ),

    loadingMode,
    speechServiceRef: speechIntegration.speechServiceRef,

    // Legacy/Unused mocks to prevent errors
    isCameraReady,
    isExternalAudioDetectedMock: false,
    questions: [], // Deprecated
  } as any;
};

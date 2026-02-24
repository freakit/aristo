import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Exam, Student } from "@/common/types";
import { saveFileRecord } from "@/common/services/api/saveFileRecord";
import { getExamSetSession } from "@/common/services/student/getExamSetSession";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { completeExam } from "@/common/services/student/completeExam";
import { CalibrationData } from "../components/HandAndGazeTrackingModal/types";
import { BlockBlobClient } from "@azure/storage-blob";
import { isMacOs } from "@/common/utils/mediaUtils";
import { useTranslation } from "@/common/i18n";
import { ExamShellContextType } from "../Layout.context";

interface MediaTrackSettingsWithDisplaySurface extends MediaTrackSettings {
  displaySurface?: "monitor" | "window" | "browser";
}

const getOSCompatibleScreenRecordingType = (): {
  mimeType: string;
  fileExtension: string;
} => {
  const compatibleOptions = [
    {
      mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      fileExtension: "mp4",
    },
    {
      mimeType: 'video/mp4; codecs="avc1.424028, mp4a.40.2"',
      fileExtension: "mp4",
    },
    {
      mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
      fileExtension: "mp4",
    },
    { mimeType: "video/mp4", fileExtension: "mp4" },
    { mimeType: 'video/webm; codecs="vp8, vorbis"', fileExtension: "webm" },
    { mimeType: 'video/webm; codecs="vp9, vorbis"', fileExtension: "webm" },
    { mimeType: "video/webm", fileExtension: "webm" },
  ];

  for (const option of compatibleOptions) {
    if (MediaRecorder.isTypeSupported(option.mimeType)) {
      return option;
    }
  }
  return { mimeType: "video/mp4", fileExtension: "mp4" };
};

export const useSessionLayoutLogic = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{
    sessionId: string;
  }>();
  const location = useLocation();

  // Check if we're on the list page - don't use localStorage examSetId on list page
  const isListPage = location.pathname.endsWith("/list");

  // Read examSetId from localStorage only if NOT on list page
  const storedExamSetId = isListPage ? null : localStorage.getItem("examSetId");

  const [exams, setExams] = useState<Exam[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [isExamInProgress, setIsExamInProgress] = useState(false);
  const [calibrationData, setCalibrationData] =
    useState<CalibrationData | null>(null);
  const [examStudentId, setExamStudentId] = useState<string | null>(null);
  const [trackingVideoUploaded, _setTrackingVideoUploaded] = useState(false);
  const [isTrackingRecording, setIsTrackingRecording] = useState(false);

  // New State for Set Flow
  const [isSetRecording, setIsSetRecording] = useState(false);
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>([]);
  const [examSetName, setExamSetName] = useState<string>("");
  const [isExamFinishedConditionMet, _setExamFinishedConditionMet] =
    useState(false);

  // Latch Setters: Once true, stay true
  const setTrackingVideoUploaded = useCallback(
    (val: boolean | ((prevState: boolean) => boolean)) => {
      _setTrackingVideoUploaded((prev) => {
        if (prev) return true;
        const next = typeof val === "function" ? val(prev) : val;
        return next;
      });
    },
    [],
  );

  const setExamFinishedConditionMet = useCallback(
    (val: boolean | ((prevState: boolean) => boolean)) => {
      _setExamFinishedConditionMet((prev) => {
        if (prev) return true;
        const next = typeof val === "function" ? val(prev) : val;
        return next;
      });
    },
    [],
  );
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Survey Modal State
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  // Loading State for List
  const [isLoading, setIsLoading] = useState(true);

  // Screen Recording State
  const [isUploading, setIsUploading] = useState(false);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenRecordedChunksRef = useRef<Blob[]>([]);
  const screenRecordingTypeRef = useRef(getOSCompatibleScreenRecordingType());
  const isMac = useRef(isMacOs());
  const [isRecordingStopped, setIsRecordingStopped] = useState(false);
  const [screenUploadProgress, setScreenUploadProgress] = useState(0);

  // Load student info
  useEffect(() => {
    const studentData = localStorage.getItem("currentStudent");
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        setStudent(parsed);

        // Load calibration data
        const calibKey = `gaze_calib_${parsed.registrationNumber}`;
        const storedCalib = localStorage.getItem(calibKey);
        if (storedCalib) {
          setCalibrationData(JSON.parse(storedCalib));
        }
      } catch (e) {
        console.error("Failed to load student data", e);
      }
    }
  }, []);

  // Fetch exams (or exam set items)
  const fetchExams = useCallback(async () => {
    if (!student?.studentId) return;

    try {
      setIsLoading(true);

      if (storedExamSetId) {
        // Fetch Exam Set Session (sections)
        const data = await getExamSetSession(
          storedExamSetId,
          student.studentId.toString(),
        );
        const sessionExams = data.exams || [];
        setExams(sessionExams);
        setExamSetName(data.name || "Exam Set");

        // Resume Logic: Restore completed sections for abnormal exit recovery
        const completed = sessionExams
          .filter((e: any) => e.status === "completed" && e.examStudentId)
          .map((e: any) => String(e.examStudentId));

        if (completed.length > 0) {
          setCompletedSectionIds((prev) => {
            const next = new Set([...prev, ...completed]);
            return Array.from(next);
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch exams", err);
    } finally {
      setIsLoading(false);
    }
  }, [student?.studentId, storedExamSetId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Determine current exam from URL and localStorage
  useEffect(() => {
    // Check if we're on an exam page
    const isExamPage =
      location.pathname.includes("/exam") &&
      !location.pathname.endsWith("/list");

    if (isExamPage) {
      // For new URL structure, use examStudentId from localStorage
      const storedExamStudentId = localStorage.getItem("examStudentId");
      if (storedExamStudentId) {
        setCurrentExamId(storedExamStudentId);
      }
    } else {
      setCurrentExamId(null);
    }
  }, [location.pathname]);

  // Auto-navigate to next exam in set
  useEffect(() => {
    if (
      storedExamSetId &&
      isSetRecording &&
      !currentExamId &&
      exams.length > 0
    ) {
      const nextExam = exams.find(
        (e) =>
          e.examStudentId &&
          !completedSectionIds.includes(String(e.examStudentId)),
      );
      if (nextExam) {
        localStorage.setItem("examStudentId", String(nextExam.examStudentId));
        navigate(`/student/session/${sessionId}/exam`);
      }
    }
  }, [
    storedExamSetId,
    isSetRecording,
    currentExamId,
    exams,
    completedSectionIds,
    navigate,
    sessionId,
  ]);

  const handleExamClick = (exam: Exam) => {
    if (
      isExamInProgress &&
      currentExamId &&
      currentExamId !== String(exam.examStudentId)
    ) {
      alert(t("examSetShell.completeSectionFirst"));
      return;
    }

    if (storedExamSetId && !isTrackingRecording) {
      alert(t("examSetShell.startExamAndRecordingFirst"));
      return;
    }

    setCurrentExamId(String(exam.examStudentId) || null);
    localStorage.setItem("examStudentId", String(exam.examStudentId));

    navigate(`/student/session/${sessionId}/exam`);
  };

  const startScreenRecording = useCallback(async () => {
    try {
      const requestAudio = !isMac.current;
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        } as any,
        audio: requestAudio,
      });

      const videoTrack = displayStream.getVideoTracks()[0];
      const settings =
        videoTrack.getSettings() as MediaTrackSettingsWithDisplaySurface;

      if (settings.displaySurface !== "monitor") {
        displayStream.getTracks().forEach((track) => track.stop());
        alert(t("examSetShell.mustShareFullScreen"));
        return false;
      }

      const mediaType = getOSCompatibleScreenRecordingType();
      screenRecordingTypeRef.current = mediaType;
      const recorderOptions: MediaRecorderOptions = {
        mimeType: mediaType.mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      };

      screenRecorderRef.current = new MediaRecorder(
        displayStream,
        recorderOptions,
      );
      screenRecordedChunksRef.current = [];
      screenRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0)
          screenRecordedChunksRef.current.push(event.data);
      };
      screenRecorderRef.current.onstop = () => {
        displayStream.getTracks().forEach((track) => track.stop());
      };
      screenRecorderRef.current.start();
      return true;
    } catch (err) {
      alert(t("examSetShell.screenRecordingPermissionRequired"));
      return false;
    }
  }, [t]);

  const startSetRecording = async (): Promise<boolean> => {
    const started = await startScreenRecording();
    if (started) {
      setIsSetRecording(true);
      return true;
    }
    return false;
  };

  const uploadFile = async (blob: Blob, fileName: string) => {
    try {
      const sasResponse = await getAzureSasToken(fileName);
      if (!sasResponse.success || !sasResponse.data)
        throw new Error("SAS Token failed");
      const blockBlobClient = new BlockBlobClient(sasResponse.data.sasUrl);

      setScreenUploadProgress(0);
      await blockBlobClient.uploadData(blob, {
        blobHTTPHeaders: { blobContentType: blob.type },
        onProgress: (progress) => {
          if (blob.size > 0) {
            const percent = Math.round(
              (progress.loadedBytes / blob.size) * 100,
            );
            setScreenUploadProgress(percent);
          }
        },
      });
      setScreenUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const permanentUrl = blockBlobClient.url.split("?")[0];
      await saveFileRecord({ fileName, fileUrl: permanentUrl });
    } catch (err) {
      console.error("Upload failed", err);
      throw err;
    }
  };

  const markSectionComplete = (token: string) => {
    setCompletedSectionIds((prev) => {
      if (prev.includes(token)) return prev;
      return [...prev, token];
    });
    setIsExamInProgress(false);
  };

  const currentExamName =
    exams.find((e) => String(e.examStudentId) === currentExamId)?.name || "";

  const allSectionsCompleted =
    exams.length > 0 &&
    exams.every(
      (e) =>
        e.examStudentId &&
        completedSectionIds.includes(String(e.examStudentId)),
    );

  const stopScreenRecording = async () => {
    if (window.confirm(t("examSetShell.confirmStopRecording"))) {
      setIsUploading(true);
      try {
        // Stop Screen Recording
        const screenBlob = await new Promise<Blob>((resolve) => {
          if (screenRecorderRef.current?.state === "recording") {
            screenRecorderRef.current.onstop = () => {
              const blob = new Blob(screenRecordedChunksRef.current, {
                type: screenRecordingTypeRef.current.mimeType,
              });
              screenRecorderRef.current?.stream
                ?.getTracks()
                .forEach((t) => t.stop());
              resolve(blob);
            };
            screenRecorderRef.current.stop();
          } else {
            resolve(
              new Blob([], { type: screenRecordingTypeRef.current.mimeType }),
            );
          }
        });

        // Upload
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const { fileExtension } = screenRecordingTypeRef.current;
        const namePart = storedExamSetId ? examSetName : currentExamName;
        const screenFileName = `screen_set_${student?.school}_${student?.registrationNumber}_${namePart}_${timestamp}.${fileExtension}`;
        await uploadFile(screenBlob, screenFileName);

        setIsSetRecording(false);
        setIsRecordingStopped(true);
      } catch (e) {
        console.error("Failed to stop/upload", e);
        alert(t("examSetShell.recordingSaveError"));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const finishExamSet = async () => {
    if (!trackingVideoUploaded) {
      alert(t("examSetShell.webcamUploadPending"));
      return;
    }
    if (window.confirm(t("examSetShell.confirmEndExamSet"))) {
      try {
        if (currentExamId && examStudentId) {
          await completeExam(examStudentId);
          markSectionComplete(currentExamId);
        }
        setShowSurveyModal(true);
      } catch (e) {
        console.error("Failed to complete exam set", e);
        alert(t("examSetShell.examEndError"));
      }
    }
  };

  const handleSurveyClose = () => {
    setShowSurveyModal(false);
    navigate(`/student/session/${sessionId}/exam/${currentExamId}/complete`);
  };

  const contextValue: ExamShellContextType = {
    exams,
    refreshExams: fetchExams,
    currentExamId,
    setCurrentExamId,
    isExamInProgress,
    setIsExamInProgress,
    student,
    examStudentId,
    setExamStudentId,
    calibrationData,
    trackingVideoUploaded,
    setTrackingVideoUploaded,
    isTrackingRecording,
    setIsTrackingRecording,
    isSetRecording,
    startSetRecording,
    stopSetRecording: stopScreenRecording,
    completedSectionIds,
    markSectionComplete,
    isExamFinishedConditionMet,
    setExamFinishedConditionMet,
    isCameraReady,
    setIsCameraReady,
  };

  return {
    contextValue,
    // UI States
    isListPage,
    examSetId: storedExamSetId,
    examSetName,
    isSetRecording,
    isRecordingStopped,
    showSurveyModal,
    isLoading,
    exams,
    currentExamId,
    isExamInProgress,
    isTrackingRecording,
    isExamFinishedConditionMet,
    completedSectionIds,
    allSectionsCompleted,
    isUploading,
    trackingVideoUploaded,
    isCompletionPage: location.pathname.endsWith("/complete"),
    // Handlers
    startSetRecording,
    stopScreenRecording,
    finishExamSet,
    handleSurveyClose,
    handleExamClick,
  };
};

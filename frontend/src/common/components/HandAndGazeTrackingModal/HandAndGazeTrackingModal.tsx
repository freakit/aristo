// src/components/HandAndGazeTrackingModal.tsx
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Camera,
  Video,
  Square,
  TriangleAlert,
  Upload,
  CheckCircle,
  Loader,
} from "lucide-react";
import ProgressBar from "../ui/ProgressBar";
import { BlockBlobClient } from "@azure/storage-blob";
import apiClient from "@/common/services/apiClient";
import { useTranslation } from "@/common/i18n";
import {
  ModalWrapper,
  WebcamArea,
  StyledCanvas,
  StyledVideo,
  Placeholder,
  // WarningOverlay, // Unused
  ControlsArea,
  ControlButton,
  RecIndicator,
  ErrorMessage,
  GazeIndicator,
  GazeStatus,
  HandCountIndicator,
  // WarningButton, // Unused
} from "./HandAndGazeTrackingModal.styles";
import {
  ExamLog,
  GazeZone,
  CalibrationData,
  FaceMeshResults,
  HandResults,
  Landmark,
} from "@/common/types";

// #region (Settings, Math helpers, Global types)
const EYE_OPEN_THRESH = 0.15;
const LOST_RESET_MS = 1200;
const OUTSIDE_MARGIN_PX = 120;
const SUSTAINED_CLOSE_MIN = 2000;

const HARD_CLAMP_MARGIN = 500;

const UI_LAYOUT = {
  HEADER_HEIGHT: 60,
  FOOTER_HEIGHT: 80,
  TABS_HEIGHT_APPROX: 50,
  CAMERA_WIDTH: 240,
  CAMERA_HEIGHT: 180,
  OFFSCREEN_MARGIN: 100,
};

// GazeZone moved to types

// Moved getZoneThreatLevel to types or just use local helper if types one is not available yet.
// Actually, the user asked to implement ExamLog structure.
// I will keep the local getZoneThreatLevel for now but rename it to avoid conflict if I imported it, or just use the local one.
// The local one is exported, so I can use it.
export const getZoneThreatLevel = (
  zone: GazeZone,
): "SAFE" | "CAUTION" | "DANGER" => {
  switch (zone) {
    case "ZONE_LEFT_CONTENT":
    case "ZONE_RIGHT_QA":
      return "SAFE";

    case "ZONE_HEADER":
    case "ZONE_LEFT_TABS":
    case "ZONE_FOOTER_CONTROLS":
    case "ZONE_CAMERA_SELF":
      return "CAUTION";

    case "OFF_SCREEN":
    case "NO_FACE":
    case "EYES_CLOSED":
      return "DANGER";

    default:
      return "CAUTION";
  }
};

// Types moved to common/types
declare global {
  interface Window {
    Hands: any;
    FaceMesh: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: Array<[number, number]>;
    FACEMESH_TESSELATION: Array<[number, number]>;
    FACEMESH_RIGHT_EYE: Array<[number, number]>;
    FACEMESH_LEFT_EYE: Array<[number, number]>;
    FACEMESH_FACE_OVAL: Array<[number, number]>;
    speechServiceInstance?: { requestFirstQuestion: () => void };
  }
}

class Kalman2D {
  private x: number[];
  private P: number[][];
  private F: number[][];
  private H: number[][];
  private Q: number[][];
  private R: number[][];
  private last_t: number;

  constructor(x0: number, y0: number) {
    this.x = [x0, y0, 0, 0];
    this.P = [
      [100, 0, 0, 0],
      [0, 100, 0, 0],
      [0, 0, 100, 0],
      [0, 0, 0, 100],
    ];
    this.F = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    this.H = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
    ];
    this.Q = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (__, j) => (i === j ? 1.0 : 0)),
    );
    this.R = [
      [25.0, 0],
      [0, 25.0],
    ];
    this.last_t = Date.now() / 1000;
  }

  predict() {
    const t = Date.now() / 1000;
    const dt = Math.max(t - this.last_t, 1 / 60);
    this.last_t = t;

    this.F[0][2] = dt;
    this.F[1][3] = dt;

    const [x, y, vx, vy] = this.x;
    this.x = [x + vx * dt, y + vy * dt, vx, vy];

    const FP = this.matMul(this.F, this.P);
    const FPF_T = this.matMul(FP, this.transpose(this.F));
    this.P = this.matAdd(FPF_T, this.Q);
  }

  update(zx: number, zy: number): [number, number] {
    const z = [zx, zy];
    const y = [z[0] - this.x[0], z[1] - this.x[1]];

    const P_HT = this.matMul(this.P, this.transpose(this.H));
    const S = this.matAdd(this.matMul(this.H, P_HT), this.R);
    const S_inv = this.inv2x2(S);
    if (!S_inv) return [this.x[0], this.x[1]];

    const K = this.matMul(P_HT, S_inv);
    const K_y = this.matVecMul(K, y);
    this.x = this.x.map((val, i) => val + K_y[i]);

    const KH = this.matMul(K, this.H);
    const I_KH = this.matSub(
      Array.from({ length: 4 }, (_, i) =>
        Array.from({ length: 4 }, (__, j) => (i === j ? 1 : 0)),
      ),
      KH,
    );
    this.P = this.matMul(I_KH, this.P);
    return [this.x[0], this.x[1]];
  }

  private transpose(m: number[][]) {
    return m[0].map((_, i) => m.map((row) => row[i]));
  }
  private matMul(a: number[][], b: number[][]) {
    return a.map((row) =>
      this.transpose(b).map((col) =>
        row.reduce((acc, v, i) => acc + v * col[i], 0),
      ),
    );
  }
  private matVecMul(m: number[][], v: number[]) {
    return m.map((row) => row.reduce((acc, val, i) => acc + val * v[i], 0));
  }
  private matAdd(a: number[][], b: number[][]) {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
  }
  private matSub(a: number[][], b: number[][]) {
    return a.map((row, i) => row.map((val, j) => val - b[i][j]));
  }
  private inv2x2(m: number[][]): number[][] | null {
    const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (Math.abs(det) < 1e-9) return null;
    return [
      [m[1][1] / det, -m[0][1] / det],
      [-m[1][0] / det, m[0][0] / det],
    ];
  }
}

class MedianFilter {
  private buffer: number[] = [];
  private size: number;

  constructor(size: number = 5) {
    this.size = size;
  }

  update(value: number): number {
    this.buffer.push(value);
    if (this.buffer.length > this.size) {
      this.buffer.shift();
    }
    const sorted = [...this.buffer].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  reset() {
    this.buffer = [];
  }
}

const getCompatibleMediaType = async (): Promise<{
  mimeType: string;
  fileExtension: string;
}> => {
  const compatibleOptions = [
    {
      mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      fileExtension: "mp4",
    },
    {
      mimeType: 'video/mp4; codecs="avc1.424028, mp4a.40.2"',
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
  return { mimeType: "video/webm", fileExtension: "webm" };
};
// #endregion

// CalibrationData moved to types

interface HandAndGazeTrackingModalProps {
  school: string;
  studentId: string;
  examName: string;
  examStudentId: number | null;
  onVideoUploaded?: () => void;
  calibrationData: CalibrationData;
  isExamFinished: boolean;
  warningDelayMs?: number;
  warningAutoCloseMs?: number;
  onRecordingStart?: () => void;
  onCameraReady?: () => void; // ??New
  isRecordingDisabled?: boolean; // ??New
}
interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
}
type GazeTrackingState = "idle" | "tracking" | "error";
type UploadStatus = "idle" | "uploading" | "success" | "error";
type UiStatus = "idle" | "in" | "out" | "closed";

const HandAndGazeTrackingModal: React.FC<HandAndGazeTrackingModalProps> = ({
  school,
  studentId,
  examName,
  examStudentId,
  onVideoUploaded,
  calibrationData,
  isExamFinished,
  warningDelayMs = 5000,
  warningAutoCloseMs = 4000,
  onRecordingStart,
  onCameraReady, // ??New
  isRecordingDisabled = false, // ??New
}) => {
  const { t } = useTranslation();

  // #region Component Refs and State Definitions
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const faceMeshRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  // const unifiedWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // const warningAutoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // const currentViolationStateRef = useRef({ hand: false, gaze: false });
  const animationFrameIdRef = useRef<number>(0);
  const closedSinceRef = useRef(0);
  const kfRef = useRef<Kalman2D | null>(null);
  const medianFilterXRef = useRef<MedianFilter>(new MedianFilter(5));
  const medianFilterYRef = useRef<MedianFilter>(new MedianFilter(5));
  const lastGoodAtRef = useRef(Date.now());
  const lostRef = useRef(false);
  const mediaTypeRef = useRef({
    mimeType: "video/webm",
    fileExtension: "webm",
  });
  const lastValidGazeRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    onScreen: true,
  });
  const isInitialized = useRef(false);
  const isMediaPipeInitialized = useRef(false);
  const mediaPipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  ); // MediaPipe Timeout
  const MEDIAPIPE_TIMEOUT_MS = 15000; // 15s Timeout
  // const warningCountRef = useRef<number>(0);
  // const warningDisabledRef = useRef<boolean>(false);
  const currentOnScreenStateRef = useRef(true);
  const stateChangeStartTimeRef = useRef<number | null>(null);
  const candidateStateRef = useRef<boolean | null>(null);
  const eyeEventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoneBufferRef = useRef<GazeZone[]>([]);
  const gazeLogRef = useRef<{ timestamp: number; zone: GazeZone }[]>([]);
  const examLogRef = useRef<ExamLog["events"]>([]); // [NEW] Accumulate events
  const startTimeRef = useRef<number>(0); // [NEW] Track start time

  const DEBOUNCE_TIME_MS = 500;
  const applyDebounce = (rawOnScreen: boolean, now: number): boolean => {
    if (rawOnScreen !== currentOnScreenStateRef.current) {
      if (candidateStateRef.current !== rawOnScreen) {
        candidateStateRef.current = rawOnScreen;
        stateChangeStartTimeRef.current = now;
      } else if (
        stateChangeStartTimeRef.current &&
        now - stateChangeStartTimeRef.current >= DEBOUNCE_TIME_MS
      ) {
        currentOnScreenStateRef.current = rawOnScreen;
        candidateStateRef.current = null;
        stateChangeStartTimeRef.current = null;
      }
    } else {
      candidateStateRef.current = null;
      stateChangeStartTimeRef.current = null;
    }
    return currentOnScreenStateRef.current;
  };

  useEffect(() => {
    const initializeMediaType = async () => {
      mediaTypeRef.current = await getCompatibleMediaType();
    };
    initializeMediaType();
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [componentStatus, setComponentStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
  });
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  // const [showUnifiedWarning, setShowUnifiedWarning] = useState<boolean>(false);
  // const [, setWarningDisabled] = useState<boolean>(false);
  const [, setEyeClosed] = useState(false);
  const [currentHandCount, setCurrentHandCount] = useState<number>(0);

  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);
  const hasSignaledCameraReady = useRef(false); // ??New ref to track signal

  const [gazeState, setGazeState] = useState<GazeTrackingState>("idle");
  const [, setGazePoint] = useState<{
    x: number;
    y: number;
    onScreen: boolean;
    confidence: number;
  }>({ x: -1, y: -1, onScreen: false, confidence: 0 });
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [trackingUploadProgress, setTrackingUploadProgress] = useState(0);

  // [NEW] Trigger onCameraReady when both Webcam and MediaPipe are ready
  useEffect(() => {
    if (isWebcamReady && isMediaPipeReady && !hasSignaledCameraReady.current) {
      console.log("[Camera] Ready signal sent to parent");
      hasSignaledCameraReady.current = true;
      onCameraReady?.();
    }
  }, [isWebcamReady, isMediaPipeReady, onCameraReady]);
  // #endregion

  // #region Recording and Upload Logic
  const startRecording = useCallback(async () => {
    if (!canvasRef.current || !streamRef.current) {
      setError(t("trackingModal.errors.recordingSetupFailed"));
      return;
    }
    try {
      setDownloadUrl(null);
      setUploadStatus("idle");
      setError(null);
      recordedChunksRef.current = [];

      const canvasStream = canvasRef.current.captureStream(30);
      const audioTracks = streamRef.current.getAudioTracks();
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);

      const mediaType = await getCompatibleMediaType();
      mediaTypeRef.current = mediaType;

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mediaType.mimeType,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setDownloadUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setRecordingState({ isRecording: true, isPaused: false });
      onRecordingStart?.();

      // [NEW] Reset log and start time
      examLogRef.current = [];
      startTimeRef.current = Date.now();

      setGazeState("tracking");
      setUiStatus("out");

      kfRef.current = null;
      medianFilterXRef.current = new MedianFilter(5);
      medianFilterYRef.current = new MedianFilter(5);
      lostRef.current = false;
      lastGoodAtRef.current = Date.now();

      currentOnScreenStateRef.current = true;
      stateChangeStartTimeRef.current = null;
      candidateStateRef.current = null;
    } catch (e) {
      setError(t("trackingModal.errors.recordingStartFailed"));
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setRecordingState({ isRecording: false, isPaused: false });
    setRecordingCompleted(true);
  }, []);

  const handleConfirmStopRecording = useCallback(() => {
    if (window.confirm(t("trackingModal.calibration.stopRecordingConfirm"))) {
      stopRecording();
    }
  }, [stopRecording, t]);

  const uploadRecording = useCallback(async () => {
    if (recordedChunksRef.current.length === 0) {
      setError(t("trackingModal.errors.noRecordingData"));
      return;
    }
    const mediaRecorder = mediaRecorderRef.current;
    const blobType = mediaRecorder
      ? mediaRecorder.mimeType
      : mediaTypeRef.current.mimeType;
    const blob = new Blob(recordedChunksRef.current, { type: blobType });

    setUploadStatus("uploading");
    setError(null);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const { fileExtension } = mediaTypeRef.current;
      const fileName = `tracking_${school}_${studentId}_${examName}_${timestamp}.${fileExtension}`;

      const sasResponse = await apiClient.getAzureSasToken(fileName);
      if (!sasResponse.success || !sasResponse.data) {
        throw new Error(
          sasResponse.error || t("trackingModal.errors.sasUrlFetchFailed"),
        );
      }

      const blockBlobClient = new BlockBlobClient(sasResponse.data.sasUrl);

      setTrackingUploadProgress(0);
      await blockBlobClient.uploadData(blob, {
        blobHTTPHeaders: { blobContentType: blob.type },
        onProgress: (progress) => {
          if (blob.size > 0) {
            const percent = Math.round(
              (progress.loadedBytes / blob.size) * 100,
            );
            setTrackingUploadProgress(percent);
          }
        },
      });

      setTrackingUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const permanentUrl = blockBlobClient.url.split("?")[0];
      await apiClient.saveFileRecord({ fileName, fileUrl: permanentUrl });

      setUploadStatus("success");
      onVideoUploaded?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("trackingModal.errors.unknownUploadError");
      setError(
        t("trackingModal.errors.uploadFailed", { message: errorMessage }),
      );
      setUploadStatus("error");
    }
  }, [school, studentId, examName, onVideoUploaded, t]);

  // [NEW] Ensure parent is notified when upload is success
  useEffect(() => {
    if (uploadStatus === "success") {
      onVideoUploaded?.();
    }
  }, [uploadStatus, onVideoUploaded]);

  // [NEW] Upload Exam Log
  const uploadExamLog = useCallback(async () => {
    if (examLogRef.current.length === 0) return;

    try {
      const logData: ExamLog = {
        meta: {
          studentId,
          examStudentId: examStudentId ?? undefined,
          examName,
          totalDuration: (Date.now() - startTimeRef.current) / 1000,
        },
        events: examLogRef.current,
      };

      const jsonString = JSON.stringify(logData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `examlog_${school}_${studentId}_${examName}_${timestamp}.json`;

      const sasResponse = await apiClient.getAzureSasToken(fileName, {
        folder: "gazetrackings",
      });

      if (sasResponse.success && sasResponse.data) {
        const blockBlobClient = new BlockBlobClient(sasResponse.data.sasUrl);
        await blockBlobClient.uploadData(blob, {
          blobHTTPHeaders: { blobContentType: "application/json" },
        });
        // We don't necessarily need to save a file record for the log in the DB if not required,
        // but it might be good practice. For now, following the requirement "upload to gazetracking/ folder".
      }
    } catch (e) {
      console.error("Failed to upload exam log JSON:", e);
    }
  }, [school, studentId, examName]);

  // Modified uploadRecording to also upload JSON
  const uploadRecordingAndLog = useCallback(async () => {
    await Promise.all([uploadRecording(), uploadExamLog()]);
  }, [uploadRecording, uploadExamLog]);
  // #endregion

  // #region Tracking
  const resolveEyeEventIfAny = async () => {
    if (eyeEventTimerRef.current) {
      clearTimeout(eyeEventTimerRef.current);
      eyeEventTimerRef.current = null;
    }
  };

  const getSemanticZone = useCallback((x: number, y: number): GazeZone => {
    const { innerWidth: W, innerHeight: H } = window;
    const {
      HEADER_HEIGHT,
      FOOTER_HEIGHT,
      TABS_HEIGHT_APPROX,
      CAMERA_WIDTH,
      CAMERA_HEIGHT,
      OFFSCREEN_MARGIN,
    } = UI_LAYOUT;

    // 1. DANGER ZONE (Off Screen)
    if (
      x < -OFFSCREEN_MARGIN ||
      x > W + OFFSCREEN_MARGIN ||
      y < -OFFSCREEN_MARGIN ||
      y > H + OFFSCREEN_MARGIN
    ) {
      return "OFF_SCREEN";
    }

    // Clamp coordinates
    const safeX = Math.max(0, Math.min(x, W));
    const safeY = Math.max(0, Math.min(y, H));

    // 2. Fixed Areas (CAUTION)
    // Header Bar
    if (safeY < HEADER_HEIGHT) {
      return "ZONE_HEADER";
    }
    // Footer Control Bar
    if (safeY > H - FOOTER_HEIGHT) {
      return "ZONE_FOOTER_CONTROLS";
    }

    // 3. Main Content Areas
    const splitX = W / 2;

    if (safeX < splitX) {
      // === Left Panel ===
      // Top tabs are Caution, Main content is Safe
      if (safeY < HEADER_HEIGHT + TABS_HEIGHT_APPROX) {
        return "ZONE_LEFT_TABS";
      } else {
        // Main content (Question, Script Bubble) is Safe
        return "ZONE_LEFT_CONTENT";
      }
    } else {
      // === Right Panel ===
      // Generally Safe for QA, but camera area is Caution
      const cameraZoneTop = H - FOOTER_HEIGHT - CAMERA_HEIGHT;
      const cameraZoneLeft = W - CAMERA_WIDTH;

      if (safeY > cameraZoneTop && safeX > cameraZoneLeft) {
        return "ZONE_CAMERA_SELF";
      }

      return "ZONE_RIGHT_QA";
    }
  }, []);

  useEffect(() => {
    if (uploadStatus === "success" || uploadStatus === "error") {
      const timer = setTimeout(() => {
        setUploadStatus("idle");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const extractGazeFeatures = (
    results: FaceMeshResults,
  ): { features: number[]; confidence: number; eyeOpen: number } | null => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0)
      return null;

    const landmarks = results.multiFaceLandmarks[0];
    const required_indices = [
      33, 263, 362, 1, 473, 468, 145, 159, 374, 386, 10, 152, 168, 6,
    ];
    if (required_indices.some((i) => !landmarks[i])) return null;

    const leftEyeOuter = landmarks[33],
      rightEyeInner = landmarks[362],
      rightEyeOuter = landmarks[263];
    const noseTip = landmarks[1],
      leftPupil = landmarks[473],
      rightPupil = landmarks[468];
    const faceTop = landmarks[10],
      faceBottom = landmarks[152];

    const faceHeight = Math.hypot(
      faceTop.x - faceBottom.x,
      faceTop.y - faceBottom.y,
    );
    const faceLeft = landmarks[234];
    const faceRight = landmarks[454];
    const faceWidthPx = Math.hypot(
      faceLeft.x - faceRight.x,
      faceLeft.y - faceRight.y,
    );
    if (faceWidthPx < 0.1) return null;

    const headDist = 1.0 / (faceWidthPx + 1e-6);
    const faceCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2,
      faceCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
    const pupilCenterX = (leftPupil.x + rightPupil.x) / 2,
      pupilCenterY = (leftPupil.y + rightPupil.y) / 2;

    const interOcularDistance = Math.hypot(
      rightEyeOuter.x - leftEyeOuter.x,
      rightEyeOuter.y - leftEyeOuter.y,
    );
    if (interOcularDistance < 0.05) return null;

    const pupilVecX = (pupilCenterX - faceCenterX) / interOcularDistance;
    const pupilVecY = (pupilCenterY - faceCenterY) / interOcularDistance;

    const headRotZ = (noseTip.z - (leftEyeOuter.z + rightEyeOuter.z) / 2) * 10;
    const headRotY = (rightEyeInner.x - leftEyeOuter.x) / interOcularDistance;
    const headRotX = (noseTip.y - faceCenterY) / faceHeight; // Pitch

    const leftEyeOpenness =
      Math.abs(landmarks[145].y - landmarks[159].y) / interOcularDistance;
    const rightEyeOpenness =
      Math.abs(landmarks[374].y - landmarks[386].y) / interOcularDistance;
    const eyeOpenness = Math.max(leftEyeOpenness, rightEyeOpenness);

    let dynamicThresh = EYE_OPEN_THRESH;
    if (calibrationData.avgEyeOpen && calibrationData.avgEyeOpen > 0.1) {
      dynamicThresh = calibrationData.avgEyeOpen * 0.6;
    }

    let confidence = 1.0;
    if (Math.abs(headRotX) > 0.3) confidence *= 0.5;
    if (Math.abs(headRotY - 0.65) > 0.15) confidence *= 0.5;

    if (eyeOpenness < dynamicThresh) confidence *= 0.3;

    if (interOcularDistance < 0.08) confidence *= 0.4;

    const headStability = 1.0 - Math.min(Math.abs(headRotZ) * 0.1, 0.5);
    const eyeSymmetry = 1.0 - Math.abs(leftEyeOpenness - rightEyeOpenness) * 2;
    confidence *= headStability;
    confidence *= Math.max(eyeSymmetry, 0.7);

    const features = [
      pupilVecX,
      pupilVecY,
      headRotY, // Yaw
      headRotX, // Pitch
      headRotZ, // Roll
      headDist,
      pupilVecY * headRotX, // Interaction
      pupilVecX * headRotY, // Interaction
      Math.pow(pupilVecY, 2),
      Math.pow(headRotX, 2), // Pitch 2nd order
      1.0,
    ];

    return { features, confidence, eyeOpen: eyeOpenness };
  };

  const predict = (f: number[], W: number[][]) => {
    if (!W || f.length !== W.length) {
        // Prevent crash if dimensions mismatch (e.g. old calibration data)
        return { x: -1, y: -1 };
    }
    return {
      x: f.reduce((a, v, i) => a + v * (W[i]?.[0] ?? 0), 0),
      y: f.reduce((a, v, i) => a + v * (W[i]?.[1] ?? 0), 0),
    };
  };

  const isGazeOnScreen = (
    x: number,
    y: number,
    bounds: { width: number; height: number },
    margin = 50,
  ): boolean =>
    x >= -margin &&
    x <= bounds.width + margin &&
    y >= -margin &&
    y <= bounds.height + margin;
  // #endregion

  // #region Initialize MediaPipe + Render Loop
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        setComponentStatus("loading");
        console.log("[Camera Debug] Starting initialization...");

        const loadScript = (src: string) =>
          new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.crossOrigin = "anonymous";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed: ${src}`));
            document.head.appendChild(script);
          });

        await Promise.all([
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"),
          loadScript(
            "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
          ),
          loadScript(
            "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
          ),
        ]);
        console.log("[Camera Debug] MediaPipe scripts loaded");

        const hands = new window.Hands({
          locateFile: (file: any) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
        handsRef.current = hands;
        console.log("[Camera Debug] Hands model initialized");

        const faceMesh = new window.FaceMesh({
          locateFile: (file: any) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        faceMeshRef.current = faceMesh;
        console.log("[Camera Debug] FaceMesh model initialized");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
        streamRef.current = stream;
        console.log("[Camera Debug] Camera stream acquired");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current;
            if (!video) return reject(new Error("No video el"));

            let isResolved = false;

            const onFrame = () => {
              if (isResolved) return;
              // Double check dimensions just in case
              if (video.videoWidth === 0) {
                (video as any).requestVideoFrameCallback(onFrame);
                return;
              }
              isResolved = true;
              setIsWebcamReady(true);
              console.log(
                "[Camera Debug] Webcam ready, video dimensions:",
                video.videoWidth,
                "x",
                video.videoHeight,
              );
              // onCameraReady call moved to onBothResults
              resolve();
            };

            if ("requestVideoFrameCallback" in video) {
              (video as any).requestVideoFrameCallback(onFrame);
            } else {
              // Fallback
              const checkReady = () => {
                if (isResolved) return;
                const v = video as any;
                if (v.readyState >= 3 && v.currentTime > 0) {
                  onFrame();
                } else {
                  requestAnimationFrame(checkReady);
                }
              };
              checkReady();
            }

            // Safety timeout
            setTimeout(() => {
              if (!isResolved) {
                console.warn("Frame callback timed out, forcing ready.");
                onFrame();
              }
            }, 3000);
          });
          setComponentStatus("ready");
          console.log("[Camera Debug] Component status set to READY");
        }
      } catch (err) {
        console.error(err);
        setComponentStatus("error");
      }
    };
    initialize();

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [t]);

  useEffect(() => {
    if (
      componentStatus !== "ready" ||
      !videoRef.current ||
      !handsRef.current ||
      !faceMeshRef.current
    ) {
      console.log("[Camera Debug] detectLoop useEffect skipped:", {
        componentStatus,
        hasVideo: !!videoRef.current,
        hasHands: !!handsRef.current,
        hasFaceMesh: !!faceMeshRef.current,
      });
      return;
    }
    console.log("[Camera Debug] detectLoop useEffect starting...");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastHandResults: HandResults | null = null,
      lastFaceResults: FaceMeshResults | null = null;

    const onBothResults = () => {
      if (!isMediaPipeInitialized.current) {
        console.log(
          "[Camera Debug] MediaPipe first result received! Marking as initialized.",
        );
        setIsMediaPipeReady(true);
        isMediaPipeInitialized.current = true;
        // Cancel timeout - MediaPipe responded successfully
        if (mediaPipeTimeoutRef.current) {
          clearTimeout(mediaPipeTimeoutRef.current);
          mediaPipeTimeoutRef.current = null;
        }
      }
      if (!canvasRef.current || !videoRef.current) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Signal camera ready only after first successful draw
      if (!hasSignaledCameraReady.current) {
        console.log("[Camera Debug] onCameraReady callback triggered!");
        hasSignaledCameraReady.current = true;
        onCameraReady?.();
      }

      const currentHandCount = lastHandResults?.multiHandLandmarks?.length ?? 0;
      setCurrentHandCount(currentHandCount);
      // currentViolationStateRef.current.hand = currentHandCount !== 2;

      if (currentHandCount > 0 && lastHandResults?.multiHandLandmarks) {
        for (const landmarks of lastHandResults.multiHandLandmarks) {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
            color: "#FFFFFF",
            lineWidth: 3,
          });
          window.drawLandmarks(ctx, landmarks, {
            color: "#22c55e",
            lineWidth: 1,
            radius: 4,
          });
        }
      }

      let gazeResult: any = null;
      let isClosed = false;
      let finalOnScreen = true;
      let closedDuration = 0;
      let zoneToLog: GazeZone | null = null;

      if (
        !lastFaceResults?.multiFaceLandmarks ||
        lastFaceResults.multiFaceLandmarks.length === 0
      ) {
        if (recordingState.isRecording) zoneBufferRef.current.push("NO_FACE");
        const now = Date.now();
        if (now - lastGoodAtRef.current > LOST_RESET_MS && !lostRef.current) {
          lostRef.current = true;
          kfRef.current = null;
          medianFilterXRef.current.reset();
          medianFilterYRef.current.reset();
        }
        ctx.restore();
        return;
      }

      gazeResult = extractGazeFeatures(lastFaceResults);

      lastFaceResults.multiFaceLandmarks.forEach((landmarks) => {
        window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
          color: "#475569",
          lineWidth: 0.3,
        });
        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, {
          color: "#facc15",
          lineWidth: 1,
        });
        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, {
          color: "#facc15",
          lineWidth: 1,
        });
      });

      if (!gazeResult) {
        const now = Date.now();
        if (now - lastGoodAtRef.current > LOST_RESET_MS && !lostRef.current) {
          lostRef.current = true;
          kfRef.current = null;
          medianFilterXRef.current.reset();
          medianFilterYRef.current.reset();
        }
        finalOnScreen = applyDebounce(currentOnScreenStateRef.current, now);
        if (recordingState.isRecording) zoneBufferRef.current.push("UNKNOWN");
        if (gazeState === "tracking") {
          setGazePoint((g) => ({
            ...g,
            x: lastValidGazeRef.current.x,
            y: lastValidGazeRef.current.y,
            onScreen: finalOnScreen,
          }));
          setUiStatus(finalOnScreen ? "in" : "out");
        }
        ctx.restore();
        return;
      }

      isClosed = gazeResult.eyeOpen < EYE_OPEN_THRESH;
      setEyeClosed(isClosed);

      if (gazeState === "tracking" && calibrationData) {
        const now = Date.now();
        const raw = predict(gazeResult.features, calibrationData.W);

        let ax = calibrationData.flipX
          ? calibrationData.screenBounds.width - raw.x
          : raw.x;
        let ay = calibrationData.flipY
          ? calibrationData.screenBounds.height - raw.y
          : raw.y;

        // [SAFETY CLAMP] Prevent extreme head angles
        const isHeadStable = Math.abs(gazeResult.features[2]) < 0.2;
        const SW = calibrationData.screenBounds.width;
        const SH = calibrationData.screenBounds.height;

        if (isHeadStable) {
          if (ay > SH * 1.2) ay = SH - 10;
          if (ay < -SH * 0.2) ay = 10;
        }

        // [FIX: HARD CLAMPING]
        // Kalman filter should not adapt to extreme values
        ax = Math.max(-HARD_CLAMP_MARGIN, Math.min(ax, SW + HARD_CLAMP_MARGIN));
        ay = Math.max(-HARD_CLAMP_MARGIN, Math.min(ay, SH + HARD_CLAMP_MARGIN));

        // Determine off-screen area
        const geomOff =
          ax < -OUTSIDE_MARGIN_PX ||
          ax > SW + OUTSIDE_MARGIN_PX ||
          ay < -OUTSIDE_MARGIN_PX ||
          ay > SH + OUTSIDE_MARGIN_PX;

        if (geomOff) {
          setGazePoint((g) => ({
            ...g,
            onScreen: false,
            confidence: gazeResult.confidence,
          }));
          setUiStatus("out");
          closedSinceRef.current = 0;
          finalOnScreen = false;
          // currentViolationStateRef.current.gaze = true;

          if (recordingState.isRecording)
            zoneBufferRef.current.push(getSemanticZone(ax, ay));
          // manageUnifiedWarning();
          ctx.restore();
          return;
        }

        if (isClosed) {
          if (closedSinceRef.current === 0) closedSinceRef.current = now;
          closedDuration = now - closedSinceRef.current;
        } else {
          closedSinceRef.current = 0;
          closedDuration = 0;
        }

        const good = !isClosed && gazeResult.confidence > 0.5;
        let currentSx = lastValidGazeRef.current.x;
        let currentSy = lastValidGazeRef.current.y;
        let rawOnScreen: boolean;

        if (good) {
          const fx = medianFilterXRef.current.update(ax);
          const fy = medianFilterYRef.current.update(ay);

          if (!kfRef.current) kfRef.current = new Kalman2D(fx, fy);

          kfRef.current.predict();
          const [sx, sy] = kfRef.current.update(fx, fy);

          currentSx = sx;
          currentSy = sy;
          rawOnScreen = isGazeOnScreen(
            sx,
            sy,
            calibrationData.screenBounds,
            50,
          );
          lastValidGazeRef.current = { x: sx, y: sy, onScreen: rawOnScreen };
          lastGoodAtRef.current = now;
        } else {
          rawOnScreen = lastValidGazeRef.current.onScreen;
        }

        finalOnScreen = applyDebounce(rawOnScreen, now);

        if (isClosed && closedDuration >= SUSTAINED_CLOSE_MIN) {
          zoneToLog = "EYES_CLOSED";
          setGazePoint((g) => ({
            ...g,
            x: currentSx,
            y: currentSy,
            onScreen: false,
            confidence: gazeResult.confidence,
          }));
          setUiStatus("closed");
          finalOnScreen = false;
        } else {
          zoneToLog = getSemanticZone(currentSx, currentSy);
          setGazePoint((g) => ({
            ...g,
            x: currentSx,
            y: currentSy,
            onScreen: finalOnScreen,
            confidence: gazeResult.confidence,
          }));
          setUiStatus(finalOnScreen ? "in" : "out");
          if (finalOnScreen) resolveEyeEventIfAny();
        }

        if (recordingState.isRecording && zoneToLog) {
          zoneBufferRef.current.push(zoneToLog);
        }
      }

      ctx.restore();
    };

    handsRef.current.onResults((r: HandResults) => {
      lastHandResults = r;
    });
    faceMeshRef.current.onResults((r: FaceMeshResults) => {
      lastFaceResults = r;
      onBothResults();
    });

    const detectLoop = async () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          await handsRef.current?.send({ image: video });
          await faceMeshRef.current?.send({ image: video });
        } catch (err) {
          console.warn("MediaPipe send failed:", err);
        }
      }
      animationFrameIdRef.current = requestAnimationFrame(detectLoop);
    };

    // MediaPipe Timeout: Error if no response within 15s
    mediaPipeTimeoutRef.current = setTimeout(() => {
      if (!isMediaPipeInitialized.current) {
        console.error(
          "[Camera Debug] MediaPipe failed to initialize within timeout",
        );
        setError(t("trackingModal.errors.mediaPipeTimeout"));
        setComponentStatus("error");
      }
    }, MEDIAPIPE_TIMEOUT_MS);
    detectLoop();

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      if (mediaPipeTimeoutRef.current) {
        clearTimeout(mediaPipeTimeoutRef.current);
      }
    };
  }, [componentStatus, gazeState, calibrationData]);

  useEffect(() => {
    if (!recordingState.isRecording) return;
    const interval = setInterval(() => {
      const buffer = zoneBufferRef.current;
      if (buffer.length === 0) return;

      const counts: Record<string, number> = {};
      let maxCount = 0;
      let dominantZone: GazeZone = "UNKNOWN";

      for (const zone of buffer) {
        counts[zone] = (counts[zone] || 0) + 1;
        if (counts[zone] > maxCount) {
          maxCount = counts[zone];
          dominantZone = zone as GazeZone;
        }
      }
      const logEntry = { timestamp: Date.now(), zone: dominantZone };
      gazeLogRef.current.push(logEntry);

      // [NEW] Accumulate to ExamLog
      if (examLogRef.current) {
        const threatLevel = getZoneThreatLevel(dominantZone as GazeZone);
        examLogRef.current.push({
          timestamp: Date.now() - startTimeRef.current,
          type: "GAZE",
          zone: dominantZone,
          riskLevel: threatLevel,
          // coordinates: ... (optional)
        });
      }

      zoneBufferRef.current = [];
    }, 1000);
    return () => clearInterval(interval);
  }, [recordingState.isRecording]);

  // #region Keyboard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") event.preventDefault();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  // #endregion

  const renderUploadStatus = () => {
    switch (uploadStatus) {
      case "uploading":
        return (
          <div
            style={{
              width: "100%",
              minWidth: "120px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Loader size={14} className="spin" />{" "}
              {t("trackingModal.controls.uploading")}
            </div>
            <ProgressBar
              progress={trackingUploadProgress}
              height={4}
              color="#facc15"
            />
          </div>
        );
      case "success":
        return (
          <div>
            <CheckCircle size={14} />{" "}
            {t("trackingModal.controls.uploadSuccess")}
          </div>
        );
      case "error":
        return (
          <div>
            <TriangleAlert size={14} />{" "}
            {t("trackingModal.controls.uploadError")}
          </div>
        );
      default:
        return (
          <div>
            <Upload size={14} /> {t("trackingModal.controls.upload")}
          </div>
        );
    }
  };

  return (
    <div>
      <ModalWrapper>
        <WebcamArea>
          <StyledVideo ref={videoRef} playsInline muted />
          <StyledCanvas ref={canvasRef} />
          {componentStatus !== "ready" && (
            <Placeholder>
              <Camera size={48} strokeWidth={1.5} />
              <p style={{ marginTop: "10px" }}>
                {t(
                  componentStatus === "loading"
                    ? "trackingModal.status.loading"
                    : "trackingModal.status.error",
                )}
              </p>
            </Placeholder>
          )}

          {recordingState.isRecording && <RecIndicator>REC</RecIndicator>}
          <GazeIndicator>
            <GazeStatus $state={gazeState === "idle" ? "idle" : uiStatus}>
              {gazeState === "idle" && (
                <div>{t("trackingModal.status.gazeIdle")}</div>
              )}
              {gazeState === "tracking" && (
                <div style={{ color: "#22c55e" }}>
                  {t("trackingModal.status.gazeTracking")}
                </div>
              )}
            </GazeStatus>
          </GazeIndicator>
          <HandCountIndicator>
            {t("trackingModal.status.handCount", { count: currentHandCount })}
          </HandCountIndicator>
        </WebcamArea>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ControlsArea>
          {componentStatus === "ready" && (
            <div>
              {!recordingCompleted && !recordingState.isRecording && (
                <ControlButton
                  variant="danger"
                  onClick={startRecording}
                  disabled={
                    !isWebcamReady || !isMediaPipeReady || isRecordingDisabled
                  }
                  title={
                    !isWebcamReady
                      ? t("trackingModal.status.loading")
                      : !isMediaPipeReady
                        ? t("trackingModal.status.mediaPipeInit")
                        : isRecordingDisabled
                          ? t("trackingModal.status.examNotStarted")
                          : ""
                  }
                >
                  <Video size={14} />{" "}
                  {t("trackingModal.controls.startRecording")}
                </ControlButton>
              )}
              {recordingState.isRecording && (
                <ControlButton
                  variant="warning"
                  onClick={handleConfirmStopRecording}
                  disabled={!isExamFinished}
                  title={
                    !isExamFinished
                      ? t("trackingModal.controls.stopRecordingDisabledTooltip")
                      : t("trackingModal.controls.stopRecording")
                  }
                >
                  <Square size={14} />{" "}
                  {t("trackingModal.controls.stopRecording")}
                </ControlButton>
              )}
              {recordingCompleted && downloadUrl && (
                <ControlButton
                  variant={
                    uploadStatus === "success"
                      ? "success"
                      : uploadStatus === "error"
                        ? "danger"
                        : "primary"
                  }
                  onClick={uploadRecordingAndLog}
                  disabled={
                    uploadStatus === "uploading" || uploadStatus === "success"
                  }
                >
                  {renderUploadStatus()}
                </ControlButton>
              )}
            </div>
          )}
        </ControlsArea>
      </ModalWrapper>
    </div>
  );
};

export default HandAndGazeTrackingModal;

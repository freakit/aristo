import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/common/i18n";
import {
  HandAndGazeTrackingModalProps,
  RecordingState,
  GazeTrackingState,
  UploadStatus,
  UiStatus,
  HandResults,
  FaceMeshResults,
  ExamLog,
  getZoneThreatLevel,
} from "../types";
import {
  Kalman2D,
  MedianFilter,
  getCompatibleMediaType,
  extractGazeFeatures,
  getSemanticZone,
} from "../utils/trackingUtils";
import { uploadVideo, uploadExamLog } from "../services/uploadService";
import {
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export const useTrackingLogic = (props: HandAndGazeTrackingModalProps) => {
  const {
    school,
    studentId,
    examName,
    examStudentId,
    onVideoUploaded,
    calibrationData,
    isExamFinished,
    onRecordingStart,
    onCameraReady,
  } = props;

  const { t } = useTranslation();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const faceMeshRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameIdRef = useRef<number>(0);
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
  const currentOnScreenStateRef = useRef(true);
  const stateChangeStartTimeRef = useRef<number | null>(null);
  const candidateStateRef = useRef<boolean | null>(null);
  const examLogRef = useRef<ExamLog["events"]>([]);
  const startTimeRef = useRef<number>(0);
  const hasSignaledCameraReady = useRef(false);

  // State
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
  const [currentHandCount, setCurrentHandCount] = useState<number>(0);
  const [gazeState, setGazeState] = useState<GazeTrackingState>("idle");
  const [gazePoint, setGazePoint] = useState({
    x: -1,
    y: -1,
    onScreen: false,
    confidence: 0,
  });
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [trackingUploadProgress, setTrackingUploadProgress] = useState(0);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);

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

      const canvasStream = (canvasRef.current as any).captureStream(30);
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

      examLogRef.current = [];
      startTimeRef.current = Date.now();
      setGazeState("tracking");
      setUiStatus("out");

      kfRef.current = null;
      medianFilterXRef.current.reset();
      medianFilterYRef.current.reset();
      lostRef.current = false;
      lastGoodAtRef.current = Date.now();
      currentOnScreenStateRef.current = true;
    } catch (e) {
      setError(t("trackingModal.errors.recordingStartFailed"));
    }
  }, [t, onRecordingStart]);

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

  const handleUpload = useCallback(async () => {
    if (recordedChunksRef.current.length === 0) {
      setError(t("trackingModal.errors.noRecordingData"));
      return;
    }
    const blob = new Blob(recordedChunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || mediaTypeRef.current.mimeType,
    });
    setUploadStatus("uploading");

    try {
      await uploadVideo(blob, mediaTypeRef.current.fileExtension, {
        school,
        studentId,
        examName,
        t,
        onProgress: setTrackingUploadProgress,
      });

      const logData: ExamLog = {
        meta: {
          studentId,
          examName,
          totalDuration: (Date.now() - startTimeRef.current) / 1000,
        },
        events: examLogRef.current,
      };
      await uploadExamLog(logData, school, t);

      setUploadStatus("success");
      onVideoUploaded?.();
    } catch (err: any) {
      setError(
        t("trackingModal.errors.uploadFailed", { message: err.message }),
      );
      setUploadStatus("error");
    }
  }, [school, studentId, examName, onVideoUploaded, t]);

  const onBothResults = useCallback(
    (handResults: HandResults, faceResults: FaceMeshResults) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(faceResults.image, 0, 0, canvas.width, canvas.height);

      if (handResults.multiHandLandmarks) {
        setCurrentHandCount(handResults.multiHandLandmarks.length);
        for (const landmarks of handResults.multiHandLandmarks) {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
          });
          window.drawLandmarks(ctx, landmarks, {
            color: "#FF0000",
            lineWidth: 2,
          });
        }
      } else {
        setCurrentHandCount(0);
      }

      if (faceResults.multiFaceLandmarks) {
        for (const landmarks of faceResults.multiFaceLandmarks) {
          window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
            color: "#C0C0C070",
            lineWidth: 1,
          });
          window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, {
            color: "#FF3030",
          });
          window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, {
            color: "#30FF30",
          });
        }
      }

      const gazeFeat = extractGazeFeatures(faceResults, calibrationData);
      if (gazeFeat) {
        const pred = {
          x: gazeFeat.features.reduce(
            (a, v, i) => a + v * calibrationData.W[i][0],
            0,
          ),
          y: gazeFeat.features.reduce(
            (a, v, i) => a + v * calibrationData.W[i][1],
            0,
          ),
        };

        if (!kfRef.current) kfRef.current = new Kalman2D(pred.x, pred.y);
        kfRef.current.predict();
        const [kx, ky] = kfRef.current.update(pred.x, pred.y);

        const smoothedX = medianFilterXRef.current.update(kx);
        const smoothedY = medianFilterYRef.current.update(ky);

        const rawOnScreen =
          smoothedX >= -50 &&
          smoothedX <= window.innerWidth + 50 &&
          smoothedY >= -50 &&
          smoothedY <= window.innerHeight + 50;
        const debouncedOnScreen = applyDebounce(rawOnScreen, Date.now());

        setGazePoint({
          x: smoothedX,
          y: smoothedY,
          onScreen: debouncedOnScreen,
          confidence: gazeFeat.confidence,
        });

        if (recordingState.isRecording) {
          const zone = getSemanticZone(smoothedX, smoothedY);
          examLogRef.current.push({
            timestamp: Date.now() - startTimeRef.current,
            type: "GAZE",
            zone: zone,
            riskLevel: getZoneThreatLevel(zone),
            coordinates: {
              x: smoothedX / window.innerWidth,
              y: smoothedY / window.innerHeight,
            },
          });
        }
      }

      ctx.restore();

      if (
        !hasSignaledCameraReady.current &&
        isMediaPipeReady &&
        isWebcamReady
      ) {
        hasSignaledCameraReady.current = true;
        onCameraReady?.();
      }
    },
    [
      calibrationData,
      recordingState.isRecording,
      isMediaPipeReady,
      isWebcamReady,
      onCameraReady,
    ],
  );

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
        );

        faceMeshRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });

        handsRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });

        setIsMediaPipeReady(true);
        isMediaPipeInitialized.current = true;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsWebcamReady(true);
            setComponentStatus("ready");
            requestAnimationFrame(predictWebcam);
          };
        }
      } catch (err: any) {
        console.error(err);
        setComponentStatus("error");
        setError(
          t("trackingModal.errors.initFailed", { message: err.message }),
        );
      }
    };

    const predictWebcam = async () => {
      if (!videoRef.current || !faceMeshRef.current || !handsRef.current)
        return;

      let startTimeMs = performance.now();
      if (videoRef.current.videoWidth > 0) {
        const faceResults = faceMeshRef.current.detectForVideo(
          videoRef.current,
          startTimeMs,
        );
        const handResults = handsRef.current.detectForVideo(
          videoRef.current,
          startTimeMs,
        );

        onBothResults(
          {
            multiHandLandmarks: handResults.landmarks,
            image: videoRef.current,
          },
          {
            multiFaceLandmarks: faceResults.faceLandmarks,
            image: videoRef.current,
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          },
        );
      }
      animationFrameIdRef.current = requestAnimationFrame(predictWebcam);
    };

    initMediaPipe();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [t, onBothResults]);

  return {
    videoRef,
    canvasRef,
    error,
    componentStatus,
    downloadUrl,
    recordingState,
    recordingCompleted,
    currentHandCount,
    gazeState,
    gazePoint,
    uiStatus,
    uploadStatus,
    trackingUploadProgress,
    isWebcamReady,
    isMediaPipeReady,
    startRecording,
    stopRecording,
    handleUpload,
    setUiStatus,
  };
};

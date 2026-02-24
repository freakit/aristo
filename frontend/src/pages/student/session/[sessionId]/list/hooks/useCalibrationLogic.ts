import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/common/i18n";

// --- Settings & Constants ---
const CALIB_SLEEP_MS = 1200;
const CALIB_POINT_DURATION_MS = 3000;
const SAMPLE_INTERVAL_MS = 50;
const MIN_SAMPLES_PER_POINT = 15;
const MAX_POINT_TOTAL_MS = 10000;
const MIN_TOTAL_SAMPLES = 100;
const EYE_OPEN_THRESH = 0.015;
const EDGE_MARGIN_RATIO = 0.06;
const GRID_COLS = 4;
const GRID_ROWS = 3;
const CONSECUTIVE_GOOD_REQUIRED = 2;
const STRICT_CONFIDENCE_THRESH = 0.8;
const STRICT_HEAD_ROT_THRESH = 0.18;
const STRICT_EYE_OPEN_THRESH = 0.1;
const MIN_FACE_SIZE_THRESH = 0.06;

// --- Types ---
export interface CalibrationData {
  W: number[][]; // Weights for linear regression
  screenBounds: { width: number; height: number };
  flipX: boolean;
  flipY: boolean;
  avgEyeOpen?: number;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceMeshResults {
  multiFaceLandmarks: Landmark[][];
  image: HTMLCanvasElement | (HTMLVideoElement & { width: number; height: number });
}

declare global {
  interface Window {
    FaceMesh: any;
    drawConnectors: any;
    drawLandmarks: any;
    FACEMESH_TESSELATION: Array<[number, number]>;
    FACEMESH_RIGHT_EYE: Array<[number, number]>;
    FACEMESH_LEFT_EYE: Array<[number, number]>;
  }
}

// --- Helper Functions ---
const linspaceWithMargin = (n: number, m: number) =>
  Array.from({ length: n }, (_, i) => m + (i / (n - 1)) * (1 - 2 * m));

const makeEdgeBiasedTargets = (W: number, H: number) => {
  const xs = linspaceWithMargin(GRID_COLS, EDGE_MARGIN_RATIO);
  const ys = linspaceWithMargin(GRID_ROWS, EDGE_MARGIN_RATIO);
  type P = { x: number; y: number; xi: number; yi: number };
  const all: P[] = [];
  for (let yi = 0; yi < ys.length; yi++) {
    for (let xi = 0; xi < xs.length; xi++) {
      all.push({
        x: Math.round(W * xs[xi]),
        y: Math.round(H * ys[yi]),
        xi,
        yi,
      });
    }
  }
  const isBorder = (p: P) =>
    p.xi === 0 ||
    p.xi === xs.length - 1 ||
    p.yi === 0 ||
    p.yi === ys.length - 1;
  const border = all.filter(isBorder);
  const top = border.filter((p) => p.yi === 0).sort((a, b) => a.x - b.x);
  const right = border
    .filter((p) => p.xi === xs.length - 1 && p.yi > 0 && p.yi < ys.length - 1)
    .sort((a, b) => a.y - b.y);
  const bottom = border
    .filter((p) => p.yi === ys.length - 1)
    .sort((a, b) => b.x - a.x);
  const left = border
    .filter((p) => p.xi === 0 && p.yi > 0 && p.yi < ys.length - 1)
    .sort((a, b) => b.y - a.y);
  const inner = all.filter((p) => !isBorder(p));
  const ordered = [...top, ...right, ...bottom, ...left, ...inner];
  return ordered.map(({ x, y }) => ({ x, y }));
};

const linearRegression = (
  features: number[][],
  labels: number[][]
): number[][] => {
  const n = features.length;
  const m = features[0].length;
  const XtX = Array(m)
    .fill(0)
    .map(() => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < n; k++) {
        XtX[i][j] += features[k][i] * features[k][j];
      }
    }
  }
  const lambda = 0.01;
  for (let i = 0; i < m; i++) XtX[i][i] += lambda;

  const XtY = Array(m)
    .fill(0)
    .map(() => Array(2).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < n; k++) {
        XtY[i][j] += features[k][i] * labels[k][j];
      }
    }
  }
  const aug = XtX.map((row, i) => [...row, ...XtY[i]]);
  for (let i = 0; i < m; i++) {
    let maxRow = i;
    for (let k = i + 1; k < m; k++)
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    for (let k = i + 1; k < m; k++) {
      if (Math.abs(aug[i][i]) < 1e-10) continue;
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j < aug[i].length; j++) aug[k][j] -= factor * aug[i][j];
    }
  }
  const W = Array(m)
    .fill(0)
    .map(() => Array(2).fill(0));
  for (let j = 0; j < 2; j++) {
    for (let i = m - 1; i >= 0; i--) {
      let sum = 0;
      for (let k = i + 1; k < m; k++) sum += aug[i][k] * W[k][j];
      if (Math.abs(aug[i][i]) > 1e-10)
        W[i][j] = (aug[i][m + j] - sum) / aug[i][i];
    }
  }
  return W;
};

// --- Hook ---
export const useCalibrationLogic = ({
  studentId,
  onComplete,
}: {
  studentId: string;
  onComplete: (data: CalibrationData) => void;
}) => {
  const { t } = useTranslation();
  
  // Refs for non-rendering state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const targetsRef = useRef<Array<{ x: number; y: number }>>([]);
  const nextIdxRef = useRef(0);
  const collectStartAtRef = useRef(0);
  const pointSamplesRef = useRef(0);
  const lastSampleAtRef = useRef(0);
  const totalMsRef = useRef(0);
  const goodMsRef = useRef(0);
  const lastTickRef = useRef(0);
  const featuresRef = useRef<number[][]>([]);
  const labelsRef = useRef<number[][]>([]);
  const eyeOpenSumRef = useRef(0);
  const eyeOpenCountRef = useRef(0);
  const consecutiveGoodSamplesRef = useRef(0);

  // React State
  const [currentTarget, setCurrentTarget] = useState<{
    x: number;
    y: number;
    idx: number;
  } | null>(null);
  const [calibPhase, setCalibPhase] = useState<"transition" | "collecting">(
    "transition"
  );
  const [calibStats, setCalibStats] = useState({
    collected: 0,
    required: MIN_TOTAL_SAMPLES,
  });
  const [error, setError] = useState<string | null>(null);

  // Core Feature Extraction Logic
  const extractGazeFeatures = (
    results: FaceMeshResults
  ): { features: number[]; confidence: number; eyeOpen: number } | null => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0)
      return null;

    const landmarks = results.multiFaceLandmarks[0];
    // Key landmarks for eyes, iris, nose, face bounds
    // 33: Left Eye Outer, 263: Right Eye Outer, ... (Standard FaceMesh indices)
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
      faceTop.y - faceBottom.y
    );
    const faceLeft = landmarks[234],
      faceRight = landmarks[454];
    const faceWidthPx = Math.hypot(
      faceLeft.x - faceRight.x,
      faceLeft.y - faceRight.y
    );
    if (faceWidthPx < 0.1) return null;

    const headDist = 1.0 / (faceWidthPx + 1e-6);
    const faceCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const faceCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
    const pupilCenterX = (leftPupil.x + rightPupil.x) / 2;
    const pupilCenterY = (leftPupil.y + rightPupil.y) / 2;

    const interOcularDistance = Math.hypot(
      rightEyeOuter.x - leftEyeOuter.x,
      rightEyeOuter.y - leftEyeOuter.y
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

    let confidence = 1.0;
    if (Math.abs(headRotX) > 0.3) confidence *= 0.5;
    if (Math.abs(headRotY - 0.65) > STRICT_HEAD_ROT_THRESH) confidence *= 0.5;
    if (eyeOpenness < STRICT_EYE_OPEN_THRESH) confidence *= 0.3;
    if (interOcularDistance < MIN_FACE_SIZE_THRESH) confidence *= 0.4;

    const headStability = 1.0 - Math.min(Math.abs(headRotZ) * 0.1, 0.5);
    const eyeSymmetry = 1.0 - Math.abs(leftEyeOpenness - rightEyeOpenness) * 2;
    confidence *= headStability * Math.max(eyeSymmetry, 0.7);

    // 11 Features for Regression
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
      Math.pow(headRotX, 2),
      1.0, // Bias
    ];

    return { features, confidence, eyeOpen: eyeOpenness };
  };

  const finishCalibration = useCallback(() => {
    setCurrentTarget(null);
    const X = featuresRef.current;
    const Y = labelsRef.current;

    if (X.length < MIN_TOTAL_SAMPLES) {
      setError(
        t("trackingModal.errors.calibrationSampleShortage", {
          collected: X.length,
          required: MIN_TOTAL_SAMPLES,
        })
      );
      return;
    }

    const W_matrix = linearRegression(X, Y);
    const rawPreds = X.map((f) => [
      f.reduce((a, v, i) => a + v * W_matrix[i][0], 0),
      f.reduce((a, v, i) => a + v * W_matrix[i][1], 0),
    ]);

    const SW = { width: window.innerWidth, height: window.innerHeight };
    const combos = [
      { flipX: false, flipY: false },
      { flipX: true, flipY: false },
      { flipX: false, flipY: true },
      { flipX: true, flipY: true },
    ];

    const meanErrFor = (flipX: boolean, flipY: boolean) => {
      let sum = 0;
      for (let i = 0; i < rawPreds.length; i++) {
        const rx = flipX ? SW.width - rawPreds[i][0] : rawPreds[i][0];
        const ry = flipY ? SW.height - rawPreds[i][1] : rawPreds[i][1];
        sum += Math.hypot(rx - Y[i][0], ry - Y[i][1]);
      }
      return sum / rawPreds.length;
    };

    let best = { flipX: false, flipY: false, err: Infinity };
    for (const c of combos) {
      const err = meanErrFor(c.flipX, c.flipY);
      if (err < best.err) best = { ...c, err };
    }

    if (best.err > 400) {
      setError(
        t("trackingModal.errors.calibrationLowQuality", {
          error: best.err.toFixed(0),
        })
      );
      return;
    }

    const calibData: CalibrationData = {
      W: W_matrix,
      screenBounds: SW,
      flipX: best.flipX,
      flipY: best.flipY,
      avgEyeOpen:
        eyeOpenCountRef.current > 0
          ? eyeOpenSumRef.current / eyeOpenCountRef.current
          : undefined,
    };

    // Save to LocalStorage
    try {
      const calibKey = `gaze_calib_${studentId}`;
      localStorage.setItem(
        calibKey,
        JSON.stringify({
          ...calibData,
          timestamp: Date.now(),
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        })
      );
      console.log("Calibration data saved to localStorage");
    } catch (err) {
      console.error("Failed to save calibration:", err);
    }

    onComplete(calibData);
  }, [studentId, onComplete, t]);

  const advanceToNextTarget = useCallback(() => {
    if (nextIdxRef.current >= targetsRef.current.length) {
      finishCalibration();
      return;
    }
    pointSamplesRef.current = 0;
    consecutiveGoodSamplesRef.current = 0;
    const i = nextIdxRef.current++;
    setCurrentTarget({ ...targetsRef.current[i], idx: i });
    collectStartAtRef.current = Date.now() + CALIB_SLEEP_MS;
    setCalibPhase("transition");
    totalMsRef.current = 0;
    goodMsRef.current = 0;
    lastTickRef.current = 0;
  }, [finishCalibration]);

  // Main Effect: Initialize & Loop
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const loadScript = (src: string) =>
          new Promise<void>((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.src = src;
            script.crossOrigin = "anonymous";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed: ${src}`));
            document.head.appendChild(script);
          });

        await Promise.all([
          loadScript(
            "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
          ),
          loadScript(
            "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
          ),
        ]);

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

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const W = window.innerWidth;
        const H = window.innerHeight;
        targetsRef.current = makeEdgeBiasedTargets(W, H);
        nextIdxRef.current = 0;
        pointSamplesRef.current = 0;
        consecutiveGoodSamplesRef.current = 0;
        setCalibStats({ collected: 0, required: MIN_TOTAL_SAMPLES });
        setCurrentTarget({ ...targetsRef.current[0], idx: 0 });
        nextIdxRef.current = 1;
        collectStartAtRef.current = Date.now() + CALIB_SLEEP_MS;
        setCalibPhase("transition");
        featuresRef.current = [];
        labelsRef.current = [];
        eyeOpenSumRef.current = 0;
        eyeOpenCountRef.current = 0;
        totalMsRef.current = 0;
        goodMsRef.current = 0;
        lastTickRef.current = 0;
      } catch (err: any) {
        console.error(err);
        if (isMounted) setError(err.message || "Failed to initialize");
      }
    };

    initialize();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameIdRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Frame Loop
  useEffect(() => {
    if (!videoRef.current || !faceMeshRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let lastFaceResults: FaceMeshResults | null = null;

    faceMeshRef.current.onResults((r: FaceMeshResults) => {
      lastFaceResults = r;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (
        lastFaceResults?.multiFaceLandmarks &&
        lastFaceResults.multiFaceLandmarks.length > 0
      ) {
        const now = Date.now();
        const gazeResult = extractGazeFeatures(lastFaceResults);

        // Draw mesh
        lastFaceResults.multiFaceLandmarks.forEach((landmarks) => {
          if (window.drawConnectors) {
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
          }
        });

        if (!gazeResult) {
          ctx.restore();
          return;
        }
        const isClosed = gazeResult.eyeOpen < EYE_OPEN_THRESH;

        if (
          currentTarget &&
          calibPhase === "transition" &&
          now >= collectStartAtRef.current
        ) {
          setCalibPhase("collecting");
          lastTickRef.current = now;
          totalMsRef.current = 0;
          goodMsRef.current = 0;
          lastSampleAtRef.current = 0;
        }

        if (currentTarget && calibPhase === "collecting") {
          if (lastTickRef.current === 0) lastTickRef.current = now;
          const dt = now - lastTickRef.current;
          lastTickRef.current = now;
          totalMsRef.current += dt;

          const isGoodQuality =
            !isClosed &&
            gazeResult.confidence > STRICT_CONFIDENCE_THRESH &&
            Math.abs(
              (lastFaceResults.multiFaceLandmarks[0][362].x -
                lastFaceResults.multiFaceLandmarks[0][33].x) /
                Math.hypot(
                  lastFaceResults.multiFaceLandmarks[0][263].x -
                    lastFaceResults.multiFaceLandmarks[0][33].x,
                  lastFaceResults.multiFaceLandmarks[0][263].y -
                    lastFaceResults.multiFaceLandmarks[0][33].y
                ) -
                0.65
            ) < STRICT_HEAD_ROT_THRESH &&
            gazeResult.eyeOpen > STRICT_EYE_OPEN_THRESH &&
            Math.hypot(
              lastFaceResults.multiFaceLandmarks[0][263].x -
                lastFaceResults.multiFaceLandmarks[0][33].x,
              lastFaceResults.multiFaceLandmarks[0][263].y -
                lastFaceResults.multiFaceLandmarks[0][33].y
            ) > MIN_FACE_SIZE_THRESH;

          if (isGoodQuality) {
            consecutiveGoodSamplesRef.current += 1;
            goodMsRef.current += dt;
            if (
              consecutiveGoodSamplesRef.current >= CONSECUTIVE_GOOD_REQUIRED &&
              now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS
            ) {
              featuresRef.current.push(gazeResult.features);
              labelsRef.current.push([currentTarget.x, currentTarget.y]);

              eyeOpenSumRef.current += gazeResult.eyeOpen;
              eyeOpenCountRef.current += 1;

              pointSamplesRef.current += 1;
              lastSampleAtRef.current = now;
              setCalibStats((prev) => ({
                ...prev,
                collected: featuresRef.current.length,
              }));
            }
          } else {
            consecutiveGoodSamplesRef.current = 0;
          }

          if (
            (goodMsRef.current >= CALIB_POINT_DURATION_MS &&
              pointSamplesRef.current >= MIN_SAMPLES_PER_POINT) ||
            totalMsRef.current >= MAX_POINT_TOTAL_MS
          ) {
            advanceToNextTarget();
          }
        }
      }
      ctx.restore();
    });

    const detectLoop = async () => {
        // Only run if video is ready and playing
      if (video.readyState >= 2 && video.videoWidth > 0 && !video.paused && !video.ended) {
        await faceMeshRef.current?.send({ image: video });
      }
      animationFrameIdRef.current = requestAnimationFrame(detectLoop);
    };
    detectLoop();

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [currentTarget, calibPhase, advanceToNextTarget]);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  return {
    videoRef,
    canvasRef,
    currentTarget,
    calibPhase,
    calibStats,
    error,
    cleanup,
    GridCols: GRID_COLS,
    GridRows: GRID_ROWS,
    targetsLength: targetsRef.current.length,
  };
};

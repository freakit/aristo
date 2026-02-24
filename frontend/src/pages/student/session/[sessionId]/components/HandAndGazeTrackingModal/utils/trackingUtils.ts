import { FaceMeshResults, GazeZone } from "@/common/types";

export const UI_LAYOUT = {
  HEADER_HEIGHT: 60,
  FOOTER_HEIGHT: 80,
  TABS_HEIGHT_APPROX: 50,
  CAMERA_WIDTH: 240,
  CAMERA_HEIGHT: 180,
  OFFSCREEN_MARGIN: 100,
};

export const EYE_OPEN_THRESH = 0.015;

export class Kalman2D {
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
      [10, 0, 0, 0],
      [0, 10, 0, 0],
      [0, 0, 100, 0],
      [0, 0, 0, 100],
    ];
    this.F = [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    this.H = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
    ];
    this.Q = [
      [0.1, 0, 0, 0],
      [0, 0.1, 0, 0],
      [0, 0, 0.01, 0],
      [0, 0, 0, 0.01],
    ];
    this.R = [
      [5, 0],
      [0, 5],
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

export class MedianFilter {
  private buffer: number[] = [];
  private size: number;
  constructor(size: number = 5) {
    this.size = size;
  }
  update(value: number): number {
    this.buffer.push(value);
    if (this.buffer.length > this.size) this.buffer.shift();
    const sorted = [...this.buffer].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  reset() {
    this.buffer = [];
  }
}

export const getCompatibleMediaType = async (): Promise<{
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
    if (MediaRecorder.isTypeSupported(option.mimeType)) return option;
  }
  return { mimeType: "video/webm", fileExtension: "webm" };
};

export const extractGazeFeatures = (
  results: FaceMeshResults,
  calibrationData: any,
): { features: number[]; confidence: number; eyeOpen: number } | null => {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0)
    return null;
  const landmarks = results.multiFaceLandmarks[0];
  const required_indices = [
    33, 263, 362, 1, 473, 468, 145, 159, 374, 386, 10, 152, 168, 6,
  ];
  if (required_indices.some((i) => !landmarks[i])) return null;

  const leftEyeOuter = landmarks[33],
    rightEyeOuter = landmarks[263],
    rightEyeInner = landmarks[362];
  const noseTip = landmarks[1],
    leftPupil = landmarks[473],
    rightPupil = landmarks[468];
  const faceTop = landmarks[10],
    faceBottom = landmarks[152];

  const faceHeight = Math.hypot(
    faceTop.x - faceBottom.x,
    faceTop.y - faceBottom.y,
  );
  const faceLeft = landmarks[234],
    faceRight = landmarks[454];
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
  const headRotX = (noseTip.y - faceCenterY) / faceHeight;

  const leftEyeOpenness =
    Math.abs(landmarks[145].y - landmarks[159].y) / interOcularDistance;
  const rightEyeOpenness =
    Math.abs(landmarks[374].y - landmarks[386].y) / interOcularDistance;
  const eyeOpenness = Math.max(leftEyeOpenness, rightEyeOpenness);

  let dynamicThresh = EYE_OPEN_THRESH;
  if (calibrationData.avgEyeOpen && calibrationData.avgEyeOpen > 0.1)
    dynamicThresh = calibrationData.avgEyeOpen * 0.6;

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
    headRotY,
    headRotX,
    headRotZ,
    headDist,
    pupilVecY * headRotX,
    pupilVecX * headRotY,
    Math.pow(pupilVecY, 2),
    Math.pow(headRotX, 2),
    1.0,
  ];
  return { features, confidence, eyeOpen: eyeOpenness };
};

export const getSemanticZone = (x: number, y: number): GazeZone => {
  const { innerWidth: W, innerHeight: H } = window;
  const {
    HEADER_HEIGHT,
    FOOTER_HEIGHT,
    TABS_HEIGHT_APPROX,
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
    OFFSCREEN_MARGIN,
  } = UI_LAYOUT;
  if (
    x < -OFFSCREEN_MARGIN ||
    x > W + OFFSCREEN_MARGIN ||
    y < -OFFSCREEN_MARGIN ||
    y > H + OFFSCREEN_MARGIN
  )
    return "OFF_SCREEN";
  const safeX = Math.max(0, Math.min(x, W)),
    safeY = Math.max(0, Math.min(y, H));
  if (safeY < HEADER_HEIGHT) return "ZONE_HEADER";
  if (safeY > H - FOOTER_HEIGHT) return "ZONE_FOOTER_CONTROLS";
  const splitX = W / 2;
  if (safeX < splitX) {
    if (safeY < HEADER_HEIGHT + TABS_HEIGHT_APPROX) return "ZONE_LEFT_TABS";
    return "ZONE_LEFT_CONTENT";
  } else {
    if (safeY > H - FOOTER_HEIGHT - CAMERA_HEIGHT && safeX > W - CAMERA_WIDTH)
      return "ZONE_CAMERA_SELF";
    return "ZONE_RIGHT_QA";
  }
};

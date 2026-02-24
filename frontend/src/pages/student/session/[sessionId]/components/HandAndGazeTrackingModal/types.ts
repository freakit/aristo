import { ExamLogEvent } from "@/common/types";

export type GazeZone =
  | "OFF_SCREEN"
  | "ZONE_HEADER"
  | "ZONE_FOOTER_CONTROLS"
  | "ZONE_LEFT_TABS"
  | "ZONE_LEFT_CONTENT"
  | "ZONE_CAMERA_SELF"
  | "ZONE_RIGHT_QA"
  | "EYES_CLOSED"
  | "NO_FACE"
  | "UNKNOWN";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks?: Landmark[][];
  image: HTMLCanvasElement | HTMLVideoElement;
}

export interface FaceMeshResults {
  multiFaceLandmarks: Landmark[][];
  image:
    | HTMLCanvasElement
    | (HTMLVideoElement & { width: number; height: number });
  width: number;
  height: number;
}

export interface CalibrationData {
  W: number[][];
  screenBounds: { width: number; height: number };
  flipX: boolean;
  flipY: boolean;
  avgEyeOpen?: number;
}

export interface HandAndGazeTrackingModalProps {
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
  onCameraReady?: () => void;
  isRecordingDisabled?: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
}

export type GazeTrackingState = "idle" | "tracking" | "error";
export type UploadStatus = "idle" | "uploading" | "success" | "error";
export type UiStatus = "idle" | "in" | "out" | "closed";

export interface ExamLog {
  meta: {
    studentId: string;
    examName: string;
    totalDuration: number;
  };
  events: ExamLogEvent[];
}

export function getZoneThreatLevel(zone: GazeZone): "SAFE" | "CAUTION" | "DANGER" {
  switch (zone) {
    case "OFF_SCREEN":
    case "EYES_CLOSED":
    case "NO_FACE":
      return "DANGER";
    case "ZONE_HEADER":
    case "ZONE_FOOTER_CONTROLS":
    case "ZONE_LEFT_TABS":
    case "ZONE_CAMERA_SELF":
      return "CAUTION";
    case "ZONE_LEFT_CONTENT":
    case "ZONE_RIGHT_QA":
    case "UNKNOWN":
    default:
      return "SAFE";
  }
}

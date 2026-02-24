// src/types/index.ts (Full Code - camelCase)

// 기존 Exam 인터페이스에 아래 4개만 "옵셔널"로 추가
export type ExamStatus = "hidden" | "visible" | "open" | "blocked";

export interface Student {
  id: string;
  userId: string;
  name: string;
  age: number | null;
  gender: "남성" | "여성" | null;
  email: string | null;
  phoneNumber: string | null;
  studentId: number;
  grade?: number;
  school: string;
  registrationNumber: string;
  significant: string | null;
  sessionId?: string;
}

export interface Section {
  id?: number | string; // ✅ 수정: optional로 변경
  examId?: number;
  sectionIndex?: number;
  title?: string;
  content?: string;
  attachments?: Attachment[];
  attachmentFileIds?: number[];
  vectorIds?: number[];
  ragSourceIds?: number[];
  openAt?: string;
  blockAt?: string;
  duration?: number;
}

export interface SectionInput {
  id?: number | string; // ✅ 추가: optional
  title: string;
  content: string;
  attachmentFileIds?: number[];
  vectorIds?: number[];
  openAt?: string;
  blockAt?: string;
  duration?: number;
}

// ⭐️ 수정: Attachment가 fileId를 참조하도록 변경
export interface Attachment {
  id: string;
  sectionId: number;
  fileId: number;
  // 필요 시, 파일 상세 정보를 포함할 수 있음
  file?: File;
}

// ⭐️ 추가: files 테이블에 대응하는 타입
export interface File {
  id: number;
  fileName: string;
  fileUrl: string; // DB에 저장된 영구적인 URL 또는 파일 경로
  contentType?: string;
  folder?: string;
}

export interface Exam {
  id: number;
  name: string;
  duration: number;
  createdAt?: string;
  updatedAt?: string;
  chapter?: number | null;
  examSetId?: number;
  visibleAt: string;
  openAt: string;
  blockAt: string;
  status?: "hidden" | "visible" | "open" | "blocked";
  sections?: Section[];
  studentIds?: string[];
  vectorIds?: number[]; // ✅ 추가
  ragSourceIds?: number[]; // 하위 호환성
  examStudentId?: number; // ✅ 추가: 학생-시험 매핑 ID
  studentCount?: number;
  examSetName?: string;
}

/** 자식 시험(= 섹션이었던 것) */
export interface ExamUnit {
  id: number;
  setId: number;
  name: string; // 섹션 제목을 name으로 저장(또는 별도 title 필드 유지 가능)
  content?: string;
  duration: number;
  chapter: number | null;
  openAt: string; // ISO(Z)
  blockAt: string; // ISO(Z)
  visibleAt?: string | null; // 과도기 호환; 궁극적으로 부모가 소유
  status?: ExamStatus;
  createdAt: string;
  updatedAt: string;
  attachmentFileIds?: number[];
  ragSources?: string[];
  examStudentId?: number; // 학생-시험 매핑 ID
}

/** 부모 세트 */
export interface ExamSetDetail {
  id: number;
  name: string;
  visibleAt: string; // ISO(Z)
  createdAt: string;
  updatedAt: string;
  studentIds: string[]; // 세트에 배정된 수강생(자식에 일괄 복제하거나 조인)
  items: ExamUnit[]; // 자식들
}

/** 생성 페이로드(V2): 부모 + 자식들 */
export interface ExamSetCreatePayload {
  name: string;
  visibleAt: string;
  items: {
    title: string;
    content: string;
    duration: number;
    chapter?: number | null;
    openAt: string;
    blockAt: string;
    attachmentFileIds?: number[];
    vectorIds?: number[]; // ✅ 추가
    ragSources?: string[]; // 하위 호환성 (deprecated)
    ragSourceIds?: number[]; // 하위 호환성
  }[];
  studentIds?: string[];
}

export interface ExamSetUpdatePayload extends Partial<ExamSetCreatePayload> {}

export interface QA {
  question: string;
  answer: string;
  timestamp: Date;
  isModified?: boolean;
}

export interface FileRecord {
  id: number | string;
  fileName: string;
  fileUrl: string;
}

export interface ExamStudentSession {
  examId: number;
  examName: string;
  duration: number;
  examCreatedAt: string;
  examUpdatedAt: string;
  studentId: number;
  userId: number;
  school: string;
  registrationNumber: string;
  significant: string | null;
  studentName: string;
  age: number | null;
  gender: "남성" | "여성" | null;
  email: string | null;
  phoneNumber: string | null;
  examStudentId: number; // 기본 키
  sessionId: string; // UUID for the session
  status: "pending" | "in_progress" | "completed" | null;
  startAt: string | null;
  endAt: string | null;
  vector_keys?: string[]; // VectorDB keys
}

export interface StudentExamRecord extends ExamStudentSession {
  questions: string[];
  answers: string[];
  qaList?: QA[];
}

export interface AIAttachment {
  kind: "image" | "file";
  url: string;
  fileName: string;
  mime?: string;
  sectionId?: number | string;
}

export interface ExamLogEvent {
  timestamp: number; // ms from start
  type: "GAZE" | "HAND";
  zone: string; // "OFF_SCREEN" | "EYES_CLOSED" | "NO_FACE" | "ZONE_LEFT_TABS" | ...
  riskLevel: "SAFE" | "CAUTION" | "DANGER";
  coordinates?: { x: number; y: number }; // normalized 0~1
}

export interface ExamLog {
  meta: {
    studentId: string;
    examStudentId?: number;
    examName: string;
    totalDuration: number; // seconds
  };
  events: ExamLogEvent[];
}

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
}

export type GazeZone =
  | "OFF_SCREEN"
  | "ZONE_HEADER"
  | "ZONE_LEFT_TABS"
  | "ZONE_RIGHT_QA"
  | "ZONE_FOOTER_CONTROLS"
  | "ZONE_CAMERA_SELF"
  | "ZONE_LEFT_CONTENT"
  | "EYES_CLOSED"
  | "NO_FACE"
  | "UNKNOWN";

export interface CalibrationData {
  W: number[][];
  screenBounds: { width: number; height: number };
  flipX: boolean;
  flipY: boolean;
  avgEyeOpen?: number;
}

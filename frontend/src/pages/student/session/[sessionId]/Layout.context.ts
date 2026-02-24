import { createContext, useContext } from "react";
import { Exam, Student } from "@/common/types";
import { CalibrationData } from "./components/HandAndGazeTrackingModal/types";

export interface ExamShellContextType {
  exams: Exam[];
  refreshExams: () => Promise<void>;
  currentExamId: string | null;
  setCurrentExamId: (id: string | null) => void;
  isExamInProgress: boolean;
  setIsExamInProgress: (inProgress: boolean) => void;
  student: Student | null;
  examStudentId: string | null;
  setExamStudentId: (id: string | null) => void;
  calibrationData: CalibrationData | null;
  trackingVideoUploaded: boolean;
  setTrackingVideoUploaded: (uploaded: boolean) => void;
  isTrackingRecording: boolean;
  setIsTrackingRecording: (recording: boolean) => void;
  // New Context Props
  isSetRecording: boolean;
  startSetRecording: () => Promise<boolean>;
  stopSetRecording: () => Promise<void>;
  completedSectionIds: string[];
  markSectionComplete: (examStudentId: string) => void;
  isExamFinishedConditionMet: boolean;
  setExamFinishedConditionMet: (met: boolean) => void;
  isCameraReady: boolean;
  setIsCameraReady: (ready: boolean) => void;
}

export const ExamShellContext = createContext<ExamShellContextType | null>(
  null,
);

export const useExamShell = () => {
  const context = useContext(ExamShellContext);
  if (!context) {
    throw new Error("useExamShell must be used within ExamSetShellPage");
  }
  return context;
};

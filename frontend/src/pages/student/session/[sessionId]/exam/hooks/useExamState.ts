import { useState } from "react";
import { Exam, Student, ExamStudentSession, QA } from "@/common/types";

export const useExamState = () => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [session, setSession] = useState<ExamStudentSession | null>(null);
  const [examStudentId, setExamStudentId] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [qaSets, setQASets] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup state
  const [setupStatus, setSetupStatus] = useState<"pending" | "checking" | "ready" | "unsupported" | "error">("pending");
  const [setupError, setSetupError] = useState<string | null>(null);

  return {
    exam, setExam,
    student, setStudent,
    session, setSession,
    examStudentId, setExamStudentId,
    currentSectionIndex, setCurrentSectionIndex,
    qaSets, setQASets,
    loading, setLoading,
    error, setError,
    setupStatus, setSetupStatus,
    setupError, setSetupError,
  };
};

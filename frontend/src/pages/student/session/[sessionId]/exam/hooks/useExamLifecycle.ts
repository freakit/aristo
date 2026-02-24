import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { useTranslation } from "@/common/i18n";
import { signalSessionEnd } from "@/common/services/student/signalSessionEnd";
import { Student, Exam } from "@/common/types";

interface UseExamLifecycleProps {
  student: Student | null;
  exam: Exam | null;
  isSessionFinished: boolean;
  isAwaitingFinishOnTimeout: boolean;
  isNavigating: boolean;
}

export const useExamLifecycle = ({
  student,
  exam,
  isSessionFinished,
  isAwaitingFinishOnTimeout,
  isNavigating,
}: UseExamLifecycleProps) => {
  const { t } = useTranslation();

  const isSessionFinishedRef = useRef(isSessionFinished);
  const isAwaitingFinishOnTimeoutRef = useRef(isAwaitingFinishOnTimeout);
  const isNavigatingRef = useRef(isNavigating);
  const studentRef = useRef(student);
  const examRef = useRef(exam);

  // Sync refs
  useEffect(() => {
    isSessionFinishedRef.current = isSessionFinished;
  }, [isSessionFinished]);
  useEffect(() => {
    isAwaitingFinishOnTimeoutRef.current = isAwaitingFinishOnTimeout;
  }, [isAwaitingFinishOnTimeout]);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);
  useEffect(() => {
    studentRef.current = student;
  }, [student]);
  useEffect(() => {
    examRef.current = exam;
  }, [exam]);

  // BeforeUnload Handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        !isSessionFinishedRef.current &&
        !isAwaitingFinishOnTimeoutRef.current
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Unload Handler (Signal End)
  useEffect(() => {
    const handleUnload = () => {
      const currentStudent = studentRef.current;
      const currentExam = examRef.current;
      const sessionFinished = isSessionFinishedRef.current;

      if (currentStudent && currentExam && !sessionFinished) {
        console.log("👋 Page exit detected. Signaling session end to server.");
        const studentInfo = {
          school: currentStudent.school || "",
          registrationNumber: currentStudent.registrationNumber,
          name: currentStudent.name || "",
        };
        const examInfo = { name: currentExam.name };
        signalSessionEnd(studentInfo, examInfo);
      }
    };
    window.addEventListener("unload", handleUnload);
    return () => {
      window.removeEventListener("unload", handleUnload);
    };
  }, []);

  // React Router Blocker
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (
      isNavigatingRef.current ||
      isSessionFinishedRef.current ||
      isAwaitingFinishOnTimeoutRef.current
    ) {
      return false;
    }
    return currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm(t("assistantPage.pageLeaveWarning"))) {
        const currentStudent = studentRef.current;
        const currentExam = examRef.current;
        if (currentStudent && currentExam) {
          const studentInfo = {
            school: currentStudent.school || "",
            registrationNumber: currentStudent.registrationNumber,
            name: currentStudent.name || "",
          };
          const examInfo = { name: currentExam.name };
          signalSessionEnd(studentInfo, examInfo);
        }
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, t]);
};

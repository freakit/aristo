import { useState, useEffect, useRef, useCallback } from "react";
import { Exam } from "@/common/types";
import { ExamPhase } from "./types";

type TimerMode = "student_only" | "full_exam";

interface UseExamTimerProps {
  exam: Exam | null;
  isInitialAIResponseComplete: boolean;
  onTimeout: () => void;
  examPhase: ExamPhase;
}

export const useExamTimer = ({
  exam,
  isInitialAIResponseComplete,
  onTimeout,
  examPhase,
}: UseExamTimerProps) => {
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [isAwaitingFinishOnTimeout, setIsAwaitingFinishOnTimeout] =
    useState(false);

  // Timer Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  const pausedTimeTimestampRef = useRef<number | null>(null);
  const accumulatedPausedDurationRef = useRef<number>(0);
  const timerMode = useRef<TimerMode>(
    (import.meta.env.VITE_TIMER_MODE as TimerMode) || "student_only",
  );

  // Pause/Resume functions
  const pauseTimer = useCallback(() => {
    if (!isPausedRef.current) {
      isPausedRef.current = true;
      pausedTimeTimestampRef.current = Date.now();
      console.log("⏸️ Timer paused");
    }
  }, []);

  const resumeTimer = useCallback(() => {
    if (isPausedRef.current && pausedTimeTimestampRef.current) {
      const pausedDuration = Date.now() - pausedTimeTimestampRef.current;
      accumulatedPausedDurationRef.current += pausedDuration;
      isPausedRef.current = false;
      pausedTimeTimestampRef.current = null;
      console.log(
        "▶️ Timer resumed. Paused for:",
        pausedDuration,
        "ms. Total paused:",
        accumulatedPausedDurationRef.current,
      );
    }
  }, []);

  // Mode-based Timer Control
  useEffect(() => {
    let shouldRun = false;

    if (timerMode.current === "student_only") {
      shouldRun = examPhase === "READY_FOR_LISTEN" || examPhase === "LISTENING";
    } else if (timerMode.current === "full_exam") {
      shouldRun =
        examPhase === "FIRST_QUESTION_REQUESTED" ||
        examPhase === "QUESTION_READING" ||
        examPhase === "READY_FOR_LISTEN" ||
        examPhase === "LISTENING" ||
        examPhase === "PROCESSING_ANSWER" ||
        examPhase === "GENERATING_QUESTION";
    }

    if (shouldRun) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [examPhase, resumeTimer, pauseTimer, timerMode]);

  // Reset Timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
    setIsAwaitingFinishOnTimeout(false);
    isPausedRef.current = false;
    pausedTimeTimestampRef.current = null;
    accumulatedPausedDurationRef.current = 0;
  }, []);

  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Main Timer Logic
  useEffect(() => {
    if (!isInitialAIResponseComplete || !exam?.duration) return;

    // Prevent re-initialization if timer is already running
    if (timerRef.current) return;

    console.log("⏰ Starting Timer. Duration:", exam.duration);
    const examDurationInMs = exam.duration * 60 * 1000;
    const startTime = new Date().getTime();

    // If starting in paused state, treat the pause as starting NOW (start time)
    // so no time elapses until resumed.
    if (isPausedRef.current) {
      pausedTimeTimestampRef.current = startTime;
    }

    accumulatedPausedDurationRef.current = 0;

    timerRef.current = setInterval(() => {
      const currentTime = new Date().getTime();
      let currentPausedDuration = 0;

      if (isPausedRef.current && pausedTimeTimestampRef.current) {
        currentPausedDuration = currentTime - pausedTimeTimestampRef.current;
      }

      const elapsedTime =
        currentTime -
        startTime -
        accumulatedPausedDurationRef.current -
        currentPausedDuration;
      const distance = examDurationInMs - elapsedTime;

      // Debug Log (throttled to every ~1s)
      if (
        Math.floor(elapsedTime / 1000) % 5 === 0 &&
        Math.floor(elapsedTime / 100) % 10 === 0
      ) {
        console.log(
          `⏱️ Timer Tick: Elapsed=${elapsedTime}, Remaining=${distance}`,
        );
      }

      // Safety check: Ignore timeout if it happens immediately (e.g. < 1s elapsed)
      if (distance < 0 && elapsedTime > 1000) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setRemainingTime("00:00");
        setIsAwaitingFinishOnTimeout(true);
        if (onTimeoutRef.current) onTimeoutRef.current();
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setRemainingTime(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`,
        );
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        console.log("🛑 Clearing timer interval");
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isInitialAIResponseComplete, exam?.duration]); // Removed onTimeout, exam (used exam.duration primitive)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    remainingTime,
    setRemainingTime,
    isAwaitingFinishOnTimeout,
    setIsAwaitingFinishOnTimeout,
    pauseTimer,
    resumeTimer,
    resetTimer,
    timerMode,
  };
};

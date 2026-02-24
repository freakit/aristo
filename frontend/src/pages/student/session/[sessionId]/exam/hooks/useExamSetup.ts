import { useState, useCallback, useRef, useEffect } from "react";
import { isMacOs, isChrome } from "@/common/utils/mediaUtils";
import { useTranslation } from "@/common/i18n";
import { useExamShell } from "../../Layout.context";
import { ExamPhase } from "./types";

export const useExamSetup = (setExamPhase: (phase: ExamPhase) => void) => {
  const { t } = useTranslation();
  const examShell = useExamShell();
  const isMac = useRef(isMacOs());

  const [setupStatus, setSetupStatus] = useState<
    "idle" | "checking" | "ready" | "error" | "unsupported"
  >("idle");
  const [setupError, setSetupError] = useState<string | null>(null);

  const isCheckingRef = useRef(false);

  // Fix: Check if set recording is already active (from Layout.tsx) and skip setup
  useEffect(() => {
    if (examShell.isSetRecording && setupStatus === "idle") {
      setSetupStatus("ready");
      setExamPhase("CAMERA_READY");
    }
  }, [examShell.isSetRecording, setupStatus, setExamPhase]);

  const handleConfirmSetup = useCallback(async () => {
    if (isCheckingRef.current || setupStatus === "ready") return;
    isCheckingRef.current = true;
    setSetupStatus("checking");

    // 1. Browser/OS Check
    if (isMac.current && !isChrome()) {
      setSetupStatus("unsupported");
      isCheckingRef.current = false;
      return;
    }

    try {
      // ✅ FIX #1: 화면 공유 단계로 직접 진입 (getUserMedia 제거)
      setExamPhase("SCREEN_SHARE_SETUP");

      // 2. 화면 공유만 요청 (카메라/마이크 권한은 TrackingModal에서 별도 처리)
      const screenStarted = await examShell.startSetRecording();
      if (!screenStarted) {
        setSetupStatus("error");
        setSetupError(t("assistantPage.setup.screenShareError"));
        isCheckingRef.current = false;
        return;
      }

      setSetupStatus("ready");
      setSetupError(null);
      setExamPhase("CAMERA_READY");
    } catch (err) {
      console.error("Setup check failed", err);
      setSetupStatus("error");
      setSetupError(t("assistantPage.setup.permissionCancelled"));
      isCheckingRef.current = false;
    }
  }, [t, setupStatus, examShell, setExamPhase]);

  return {
    setupStatus,
    setSetupStatus,
    setupError,
    setSetupError,
    handleConfirmSetup,
    isMac: isMac.current,
  };
};

import { useState, useCallback } from "react";
import { useTranslation } from "@/common/i18n";
import apiClient from "@/common/services/apiClient";
import { logAnswerChange } from "@/common/services/student/logAnswerChange";
import { Student, Exam, QA } from "@/common/types";

interface UseExamReviewProps {
  speechServiceRef: React.MutableRefObject<any>;
  examStudentIdRef: React.MutableRefObject<string | null>;
  qaSetsRef: React.MutableRefObject<QA[]>;
  studentRef: React.MutableRefObject<Student | null>;
  examRef: React.MutableRefObject<Exam | null>;
  isSessionFinishedRef: React.MutableRefObject<boolean>;
  handleStudentAnswer: (answer: string) => void;
  setIsWaitingForServerResponse: (waiting: boolean) => void;
  setLoadingMode: (mode: "stt" | "generation" | null) => void;
  pauseTimer: () => void;
}

export const useExamReview = ({
  speechServiceRef,
  examStudentIdRef,
  qaSetsRef,
  studentRef,
  examRef,
  isSessionFinishedRef,
  handleStudentAnswer,
  setIsWaitingForServerResponse,
  setLoadingMode,
  pauseTimer,
}: UseExamReviewProps) => {
  const { t } = useTranslation();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [reviewAudioBlob, setReviewAudioBlob] = useState<Blob | null>(null);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);

  // Upload Verified Audio Helper
  const uploadVerifiedAudio = useCallback(
    async (blob: Blob): Promise<string | null> => {
      try {
        const ext = blob.type.includes("mp3") ? "mp3" : "webm";
        const studentId =
          studentRef.current?.registrationNumber || "unknown_student";
        const examName = examRef.current?.name || "unknown_exam";
        const uuid = crypto.randomUUID();
        const fileName = `answer_audio_${studentId}_${examName}_${uuid}.${ext}`;

        console.log("📤 [uploadExerifiedAudio] Requesting SAS token...");
        const sasRes = await apiClient.getAzureSasToken(fileName, {
          folder: "answeraudios",
        });

        if (!sasRes.success) {
          console.error(
            "❌ [uploadVerifiedAudio] SAS Token API failed:",
            sasRes.error
          );
          return null;
        }

        const sasUrl = sasRes.data?.sasUrl;
        if (!sasUrl) {
          console.error(
            "❌ [uploadVerifiedAudio] SAS URL is missing in response"
          );
          return null;
        }
        console.log("✅ [uploadVerifiedAudio] SAS Token received.");

        console.log(
          `📤 [uploadVerifiedAudio] Uploading to Azure (${fileName})...`
        );
        const uploadRes = await fetch(sasUrl, {
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": blob.type,
          },
          body: blob,
        });

        if (uploadRes.ok) {
          const cleanUrl = sasUrl.split("?")[0];
          return cleanUrl;
        } else {
          const errText = await uploadRes.text();
          console.error(
            "❌ [uploadVerifiedAudio] Upload Failed. Status:",
            uploadRes.status
          );
          console.error("- Response:", errText);
          return null;
        }
      } catch (e) {
        console.error("❌ [uploadVerifiedAudio] Exception occurred:", e);
        return null;
      }
    },
    [studentRef, examRef]
  );

  // Voice Response Handler
  const handleVoiceResponse = useCallback(
    (transcript: string, audioBlob: Blob | null) => {
      console.log("🎙️ Voice response intercepted:", transcript);

      if (isSessionFinishedRef.current) {
        console.log("⚠️ Exam finished, skipping review modal");
        return;
      }

      if (
        speechServiceRef.current &&
        "pauseVADExternal" in speechServiceRef.current
      ) {
        (speechServiceRef.current as any).pauseVADExternal();
      }

      setOriginalTranscript(transcript);
      setReviewAudioBlob(audioBlob);

      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        setReviewAudioUrl(url);
      } else {
        setReviewAudioUrl(null);
      }

      setIsReviewModalOpen(true);
    },
    [isSessionFinishedRef, speechServiceRef]
  );

  // Submit Review
  const submitReview = useCallback(
    async (text: string) => {
      setIsReviewModalOpen(false);
      setIsWaitingForServerResponse(true);
      setLoadingMode("generation");
      pauseTimer(); // ✅ Pause timer explicitly
      console.log("📋 Submit Review Triggered");

      let uploadedAudioUrl: string | null = null;
      const isTextDifferent = text.trim() !== originalTranscript.trim();

      if (reviewAudioBlob && isTextDifferent) {
        console.log("📤 Starting upload (Answer Changed)...");
        uploadedAudioUrl = await uploadVerifiedAudio(reviewAudioBlob);
      }

      if (examStudentIdRef.current && isTextDifferent && uploadedAudioUrl) {
        await logAnswerChange({
          examStudentId: examStudentIdRef.current,
          oldAnswer: originalTranscript,
          newAnswer: text,
          audioUrl: uploadedAudioUrl,
          turn: qaSetsRef.current.length,
        });
      }

      handleStudentAnswer(text);

      if (reviewAudioUrl) {
        URL.revokeObjectURL(reviewAudioUrl);
        setReviewAudioUrl(null);
      }

      if (text.trim() === "") {
        console.log(
          "⚠️ Empty corrected answer submitted. Triggering retry flow."
        );
        setIsWaitingForServerResponse(false);
        setLoadingMode(null);
        if (speechServiceRef.current) {
          speechServiceRef.current.speakWithTTS(
            t("assistantPage.review.pleaseSayAgain")
          );
        }
        return;
      }

      if (
        speechServiceRef.current &&
        "submitAnswer" in speechServiceRef.current
      ) {
        await (speechServiceRef.current as any).submitAnswer(text);
      } else {
        console.warn(
          "submitAnswer not supported in current speech service mode"
        );
      }
    },
    [
      originalTranscript,
      reviewAudioBlob,
      reviewAudioUrl,
      examStudentIdRef,
      qaSetsRef,
      handleStudentAnswer,
      uploadVerifiedAudio,
      setIsWaitingForServerResponse,
      setLoadingMode,
      speechServiceRef,
      t,
    ]
  );

  // Edit Start Handler
  const handleEditStart = useCallback(() => {
    if (
      speechServiceRef.current &&
      "pauseVADExternal" in speechServiceRef.current
    ) {
      (speechServiceRef.current as any).pauseVADExternal();
    }
  }, [speechServiceRef]);

  return {
    isReviewModalOpen,
    setIsReviewModalOpen,
    originalTranscript,
    setOriginalTranscript,
    reviewAudioUrl,
    setReviewAudioUrl,
    reviewAudioBlob,
    setReviewAudioBlob,
    handleVoiceResponse,
    submitReview,
    handleEditStart,
  };
};

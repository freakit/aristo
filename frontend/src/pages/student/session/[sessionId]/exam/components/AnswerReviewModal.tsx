import React, { useState, useEffect } from "react";
import { useTranslation } from "@/common/i18n";
import {
  ReviewOverlay,
  ReviewContent,
  ReviewTitle,
  ReviewTimer,
  TimerContainer,
  TimerFill,
  ReviewWarningText,
  ReviewTextArea,
  ReviewAudioPlayer,
  ReviewButtonGroup,
  ControlButton,
  RecordingBlock,
} from "../Page.styles";

interface AnswerReviewModalProps {
  initialTranscript: string;
  audioUrl: string | null;
  onSubmit: (finalText: string) => void;
  onEditStart: () => void;
}

// ✅ 리뷰 타이머 지속 시간: 30초
const REVIEW_TIMER_DURATION = 30;

const AnswerReviewModal: React.FC<AnswerReviewModalProps> = ({
  initialTranscript,
  audioUrl,
  onSubmit,
  onEditStart,
}) => {
  const { t } = useTranslation();

  // Internal State
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isEditing, setIsEditing] = useState(false);
  const [timer, setTimer] = useState<number | null>(REVIEW_TIMER_DURATION);

  // Initialize state when initialTranscript changes
  useEffect(() => {
    setTranscript(initialTranscript);
    setIsEditing(false);
    setTimer(REVIEW_TIMER_DURATION);
  }, [initialTranscript]);

  // Timer Logic
  useEffect(() => {
    if (isEditing || timer === null || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEditing, timer]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (!isEditing && timer === 0) {
      onSubmit(transcript);
    }
  }, [timer, isEditing, transcript, onSubmit]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimer(null);
    onEditStart(); // Signal parent to skip TTS
  };

  const handleCancelEdit = () => {
    setTranscript(initialTranscript);
    setIsEditing(false);
    setTimer(REVIEW_TIMER_DURATION); // ✅ Restore timer on cancel (User Req)
  };

  const handleSubmit = () => {
    onSubmit(transcript);
  };

  return (
    <ReviewOverlay>
      <ReviewContent>
        <ReviewTitle>
          {t("assistantPage.review.title", { defaultValue: "답변 수정" })}
          {!isEditing && timer !== null && (
            <ReviewTimer>
              {t("assistantPage.review.autoSubmitIn", {
                seconds: timer,
                defaultValue: `${timer}초 후 자동 제출`,
              })}
            </ReviewTimer>
          )}
        </ReviewTitle>
        {!isEditing && timer !== null && (
          <TimerContainer>
            <TimerFill $progress={(timer / REVIEW_TIMER_DURATION) * 100} />
          </TimerContainer>
        )}

        {isEditing && (
          <ReviewWarningText>
            {t("assistantPage.review.warning")}
          </ReviewWarningText>
        )}

        <ReviewTextArea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={!isEditing}
        />

        {audioUrl && <ReviewAudioPlayer src={audioUrl} controls autoPlay />}

        <ReviewButtonGroup>
          {!isEditing ? (
            <RecordingBlock>
              <ControlButton onClick={handleStartEdit} $active>
                {t("assistantPage.review.edit", {
                  defaultValue: "수정하기",
                })}
              </ControlButton>
              <ControlButton $primary onClick={handleSubmit}>
                {t("assistantPage.review.submitNow", {
                  defaultValue: "지금 제출",
                })}
              </ControlButton>
            </RecordingBlock>
          ) : (
            <RecordingBlock>
              <ControlButton onClick={handleCancelEdit}>
                {t("assistantPage.review.cancelEdit", {
                  defaultValue: "취소",
                })}
              </ControlButton>
              <ControlButton $primary onClick={handleSubmit}>
                {t("assistantPage.review.saveAndSubmit", {
                  defaultValue: "저장 후 제출",
                })}
              </ControlButton>
            </RecordingBlock>
          )}
        </ReviewButtonGroup>
      </ReviewContent>
    </ReviewOverlay>
  );
};

export default AnswerReviewModal;

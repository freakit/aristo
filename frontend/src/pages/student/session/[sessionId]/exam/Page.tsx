import React, { useState } from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useStudentExamLogic } from "./hooks/useStudentExamLogic";
import { RetryableImage } from "./components/RetryableImage";
import SetupModal from "./components/SetupModal";
import AnswerReviewModal from "./components/AnswerReviewModal";

import {
  MobileContainer,
  Header,
  HeaderTitle,
  HeaderAction,
  NextExamButton,
  TimerBadge,
  MainContentArea,
  LeftColumn,
  LeftContentArea,
  AIScriptBubble,
  ScriptContent,
  MarkdownContainer,
  AttachmentSection,
  AttachmentItem,
  RightPanel,
  QATitle,
  QAList,
  QAItem,
  QuestionSection,
  AnswerSection,
  QLabel,
  ALabel,
  QText,
  AText,
  EmptyQAState,
  EmptyQAIcon,
  EmptyQATitle,
  EmptyQADescription,
  ControlBar,
  StatusInfo,
  StatusIcon,
  StatusTitle,
  StatusDescription,
  ControlButtons,
  ControlButton,
  VADListeningIndicator,
  VADNotListeningIndicator,
  RecordingBlock,
  RecordingIndicator,
  UploadOverlay,
  UploadContent,
  WarningBanner,
  SectionTabs,
  SectionTab,
  ServerResponseLoadingOverlay,
  ServerResponseLoadingContent,

  // Image Modal Styles
  ImageModalOverlay,
  ImageModalContent,
  ExpandedImage,
  CloseButton as ImageCloseButton,

  // Loading Components (Re-exported)
  FullScreenLoadingOverlay,
  FullScreenLoadingContent,
  LoadingSpinnerLarge,
  LoadingMessage,
  LoadingSubMessage,

  // New Styles
  StatusIndicatorContainer,
  StatusBadge,
  StatusPhaseText,
  StartButton,
} from "./Page.styles";

import { ErrorContainer, ErrorIcon, ErrorMessage } from "./Page.styles";

export default function StudentAssistantPage() {
  const {
    exam,
    student,
    loading,
    error,
    connectionStatus, // ✅ Add this
    setupStatus,
    setupError,
    isMac,
    handleConfirmSetup,
    handleReloadPage,
    isCameraReady,

    isUploading,
    isNavigating,
    remainingTime,
    isRecording,
    isTTSSpeaking,
    isTTSPreparing,
    isVADListening,
    isVADMode,
    isExternalAudioDetected,
    isWaitingForServerResponse,
    isAwaitingFinishOnTimeout, // ✅ Add this
    isSessionFinished,
    isInitialAIResponseComplete,
    setIsInitialAIResponseComplete, // ✅ Add this
    setIsSessionFinished, // ✅ Add this

    aiScript,
    setAiScript, // ✅ Add this
    qaSets,
    setQASets, // ✅ Add this
    currentSectionIndex,
    setCurrentSectionIndex, // ✅ Add this
    sasUrls,
    rightQAAreaRef,

    isReviewModalOpen,
    setIsReviewModalOpen,
    reviewAudioUrl,
    originalTranscript,
    submitReview,
    handleStudentAnswer,

    selectedImage,
    setSelectedImage,

    handleNextExam,
    handleToggleRecording,
    handleSkipTTS,
    showSkipButton,
    nextExam,
    t,
    isTrackingRecording,
    handleEditStart,
    loadingMode,
    speechServiceRef, // ✅ Restored for section switching
    examPhase,
    handleStartExam,
    handleStartFirstQuestion,
  } = useStudentExamLogic();

  // Helper function for rendering attachments
  const renderSectionAttachments = (section: any) => {
    const atts = (section?.attachments ?? []).filter((a: any) => !!a.file);
    if (atts.length === 0) return null;

    const isImg = (name: string) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);

    return (
      <AttachmentSection>
        {atts
          .filter((att: any) => isImg(att.file.fileName))
          .map((att: any) => {
            const f = att.file;
            const secureUrl = sasUrls[f.id];
            return (
              <AttachmentItem key={att.id} title={f.fileName}>
                {secureUrl ? (
                  <RetryableImage
                    src={secureUrl}
                    alt={f.fileName}
                    onClick={() => setSelectedImage(secureUrl)}
                  />
                ) : (
                  <div>
                    📎 {f.fileName} {t("common.loading")}
                  </div>
                )}
              </AttachmentItem>
            );
          })}
        {atts
          .filter((att: any) => !isImg(att.file.fileName))
          .map((att: any) => {
            const f = att.file;
            const secureUrl = sasUrls[f.id];
            return (
              <AttachmentItem
                key={att.id}
                as={secureUrl ? "a" : "div"}
                href={secureUrl || undefined}
                target={secureUrl ? "_blank" : undefined}
                rel={secureUrl ? "noopener noreferrer" : undefined}
                title={f.fileName}
              >
                📎 {f.fileName} {secureUrl ? "" : t("common.loading")}
              </AttachmentItem>
            );
          })}
      </AttachmentSection>
    );
  };

  // Status message logic
  const getStatusMessage = () => {
    if (!isInitialAIResponseComplete)
      return t("assistantPage.assistantControls.status.initial");
    if (isSessionFinished)
      return t("assistantPage.assistantControls.status.finished");
    if (error)
      return t("assistantPage.assistantControls.status.error", { error });
    if (isWaitingForServerResponse)
      return t("assistantPage.assistantControls.status.waitingForServer");
    if (isTTSPreparing)
      return t("assistantPage.assistantControls.status.ttsPreparing");
    if (isTTSSpeaking)
      return t("assistantPage.assistantControls.status.ttsSpeaking");
    // VAD Specific Status
    if (isVADMode) {
      if (examPhase === "RECORDING_STARTED") {
        return t("assistantPage.assistantControls.status.startFirstQuestion");
      }
      if (!isTrackingRecording) {
        return t(
          "assistantPage.assistantControls.status.vadWaitingForRecording",
        );
      }
      if (isVADListening || examPhase === "LISTENING") {
        return t("assistantPage.assistantControls.status.vadListening");
      }
      if (examPhase === "READY_FOR_LISTEN") {
        return "답변 대기 중"; // Waiting for user to speak
      }
      // If not listening, not speaking, not waiting -> Silence (Ready to speak)
      if (!isTTSSpeaking && !isTTSPreparing && !isWaitingForServerResponse) {
        return t("assistantPage.assistantControls.status.vadSilence");
      }
    }

    if (isRecording)
      return t("assistantPage.assistantControls.status.recording");
    if (examPhase === "READY_FOR_LISTEN") return "답변 대기 중";
    return t("assistantPage.assistantControls.status.ready");
  };

  // --- Early Returns for Global States ---

  if (!loading && setupStatus !== "ready") {
    return (
      <SetupModal
        status={setupStatus}
        error={setupError}
        isMac={isMac}
        onConfirm={handleConfirmSetup}
        onReload={handleReloadPage}
        isCameraReady={isCameraReady}
      />
    );
  }

  if (loading) {
    return (
      <FullScreenLoadingOverlay>
        <FullScreenLoadingContent>
          <LoadingSpinnerLarge />
          <LoadingMessage>{t("assistantPage.loading.title")}</LoadingMessage>
          <LoadingSubMessage>
            {t("assistantPage.loading.subtitle")}
          </LoadingSubMessage>
        </FullScreenLoadingContent>
      </FullScreenLoadingOverlay>
    );
  }

  if (error && !exam) {
    return (
      <ErrorContainer>
        <ErrorIcon>🚫</ErrorIcon>
        <ErrorMessage>{error}</ErrorMessage>
      </ErrorContainer>
    );
  }

  if (!exam || !student) {
    return (
      <FullScreenLoadingOverlay>
        <FullScreenLoadingContent>
          <LoadingSpinnerLarge />
          <LoadingMessage>{t("assistantPage.loading.title")}</LoadingMessage>
          <LoadingSubMessage>
            {t("assistantPage.loading.subtitle")}
          </LoadingSubMessage>
        </FullScreenLoadingContent>
      </FullScreenLoadingOverlay>
    );
  }

  const currentSection = exam?.sections?.[currentSectionIndex];
  const isButtonDisabled =
    connectionStatus !== "connected" ||
    isSessionFinished ||
    isWaitingForServerResponse;

  return (
    <MobileContainer>
      {isUploading && (
        <UploadOverlay>
          <UploadContent>
            <LoadingSpinnerLarge />
            <LoadingMessage>
              {t("assistantPage.uploadOverlay.title")}
            </LoadingMessage>
            <LoadingSubMessage>
              {t("assistantPage.uploadOverlay.subtitle")}
            </LoadingSubMessage>
          </UploadContent>
        </UploadOverlay>
      )}

      <Header>
        <HeaderAction
          style={{ width: "auto", gap: "12px", alignItems: "center" }}
        >
          <NextExamButton
            onClick={handleNextExam}
            disabled={
              isUploading || isNavigating || !nextExam || !isSessionFinished
            }
          >
            {nextExam
              ? t("assistantPage.header.nextExamButton")
              : t("assistantPage.header.lastExamButton")}
          </NextExamButton>
          {(remainingTime || exam.duration) && (
            <TimerBadge>{remainingTime || `${exam.duration}:00`}</TimerBadge>
          )}
        </HeaderAction>

        <HeaderTitle>{exam.name}</HeaderTitle>
        <HeaderAction style={{ width: "auto", minWidth: "100px" }} />
      </Header>

      {isTrackingRecording && (
        <MainContentArea>
          <LeftColumn>
            <LeftContentArea>
              {isWaitingForServerResponse && (
                <ServerResponseLoadingOverlay>
                  <ServerResponseLoadingContent>
                    <LoadingSpinnerLarge />
                    <LoadingMessage>
                      {loadingMode === "stt"
                        ? t("assistantPage.sttLoading.title")
                        : isAwaitingFinishOnTimeout
                          ? t("assistantPage.serverResponseLoading.savingTitle")
                          : t("assistantPage.serverResponseLoading.title")}
                    </LoadingMessage>
                    <LoadingSubMessage>
                      {loadingMode === "stt"
                        ? t("assistantPage.sttLoading.subtitle")
                        : isAwaitingFinishOnTimeout
                          ? t(
                              "assistantPage.serverResponseLoading.savingSubtitle",
                            )
                          : t("assistantPage.serverResponseLoading.subtitle")}
                    </LoadingSubMessage>
                  </ServerResponseLoadingContent>
                </ServerResponseLoadingOverlay>
              )}

              <SectionTabs>
                {/* @ts-ignore */}
                {exam.sections.map((sec: any, i) => (
                  <SectionTab
                    key={sec.id}
                    $isActive={i === currentSectionIndex}
                    onClick={async () => {
                      if (i === currentSectionIndex) return;
                      if (speechServiceRef.current) {
                        try {
                          await (
                            speechServiceRef.current as any
                          ).endCurrentSection();
                        } catch (e) {
                          console.error("Failed to end current section:", e);
                        }
                      }
                      setQASets([]);
                      setAiScript(t("assistantPage.initialAIScript"));
                      setIsInitialAIResponseComplete(false);
                      setIsSessionFinished(false);
                      setCurrentSectionIndex(i);
                    }}
                  >
                    {sec.title}
                  </SectionTab>
                ))}
              </SectionTabs>

              <MarkdownContainer>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aiScript}
                </ReactMarkdown>
              </MarkdownContainer>

              {/* Attachments */}
              {currentSection && renderSectionAttachments(currentSection)}
            </LeftContentArea>

            {aiScript && (
              <AIScriptBubble>
                <ScriptContent>{aiScript}</ScriptContent>
              </AIScriptBubble>
            )}
          </LeftColumn>

          <RightPanel ref={rightQAAreaRef}>
            {/* ✅ Status Indicator */}
            <StatusIndicatorContainer>
              <StatusBadge $phase={examPhase}>
                {(examPhase === "LISTENING" ||
                  examPhase === "READY_FOR_LISTEN") &&
                  "👂"}
                {examPhase === "QUESTION_READING" && "🔊"}
                {examPhase === "PROCESSING_ANSWER" && "⏳"}
                {examPhase === "RECORDING_STARTED" && "▶️"}
                <StatusPhaseText>
                  {t(`assistantPage.phases.${examPhase}`, {
                    defaultValue: examPhase.replace(/_/g, " "),
                  })}
                </StatusPhaseText>
              </StatusBadge>
            </StatusIndicatorContainer>

            <QATitle>
              {t("assistantPage.qaArea.title", { count: qaSets.length })}
            </QATitle>

            {qaSets.length === 0 ? (
              <EmptyQAState>
                <EmptyQAIcon>💬</EmptyQAIcon>
                <EmptyQATitle>
                  {t("assistantPage.qaArea.emptyState.title")}
                </EmptyQATitle>
                <EmptyQADescription>
                  {t("assistantPage.qaArea.emptyState.description")}
                </EmptyQADescription>
              </EmptyQAState>
            ) : (
              <QAList>
                {qaSets.map((qa: any, idx: number) => (
                  <QAItem key={idx}>
                    <QuestionSection>
                      <QLabel>
                        {t("assistantPage.qaArea.aiQuestionLabel")}
                      </QLabel>
                      <QText>{qa.question}</QText>
                    </QuestionSection>
                    {qa.answer && (
                      <AnswerSection>
                        <ALabel>
                          {t("assistantPage.qaArea.studentAnswerLabel")}
                        </ALabel>
                        <AText>{qa.answer}</AText>
                      </AnswerSection>
                    )}
                  </QAItem>
                ))}
              </QAList>
            )}
          </RightPanel>
        </MainContentArea>
      )}

      <ControlBar>
        <StatusInfo>
          <StatusIcon $recording={isRecording}>
            {isRecording ? "🎤" : "⌛"}
          </StatusIcon>
          <StatusDescription>
            <StatusTitle>
              {t("assistantPage.assistantControls.statusLabel")}
            </StatusTitle>
            <StatusDescription>{getStatusMessage()}</StatusDescription>
          </StatusDescription>
        </StatusInfo>

        <ControlButtons>
          {/* TTS 건너뛰기 버튼 */}
          {showSkipButton && (
            <ControlButton onClick={handleSkipTTS}>
              {t("assistantPage.assistantControls.skipTTSButton")}
            </ControlButton>
          )}

          {/* ✅ FIX #4: "시험 시작" 버튼 — CAMERA_READY 단계 */}
          {examPhase === "CAMERA_READY" && (
            <StartButton
              onClick={handleStartExam}
              disabled={!isTrackingRecording}
              style={{
                opacity: isTrackingRecording ? 1 : 0.5,
                cursor: isTrackingRecording ? "pointer" : "not-allowed",
              }}
            >
              {t("assistantPage.assistantControls.status.startExam")}
            </StartButton>
          )}

          {/* ✅ FIX #2: "첫 질문 시작" 버튼 — RECORDING_STARTED 단계 */}
          {examPhase === "RECORDING_STARTED" && (
            <StartButton
              onClick={() =>
                handleStartFirstQuestion(examPhase, () => Promise.resolve([]))
              }
            >
              {t("assistantPage.assistantControls.status.startFirstQuestion")}
            </StartButton>
          )}

          {/* ✅ FIX #5: 답변 시작(녹음) 버튼 — LISTENING 단계에서만 활성화 */}
          {!isVADMode && (
            <ControlButton
              onClick={handleToggleRecording}
              $primary={isRecording}
              disabled={
                isButtonDisabled ||
                (examPhase !== "LISTENING" && examPhase !== "READY_FOR_LISTEN")
              }
              style={{
                opacity:
                  examPhase !== "LISTENING" && examPhase !== "READY_FOR_LISTEN"
                    ? 0.5
                    : 1,
                cursor:
                  examPhase !== "LISTENING" && examPhase !== "READY_FOR_LISTEN"
                    ? "not-allowed"
                    : "pointer",
                // 이 단계들에서는 버튼 자체를 숨김
                display:
                  examPhase === "CAMERA_READY" ||
                  examPhase === "RECORDING_STARTED" ||
                  examPhase === "GENERATING_QUESTION" ||
                  examPhase === "FIRST_QUESTION_REQUESTED"
                    ? "none"
                    : "block",
              }}
            >
              {isSessionFinished
                ? t("assistantPage.assistantControls.stopRecording")
                : isRecording
                  ? t("assistantPage.assistantControls.recordingInProgress")
                  : t("assistantPage.assistantControls.startRecording")}
            </ControlButton>
          )}
        </ControlButtons>
      </ControlBar>

      {/* Review Modal (AnswerReviewModal 컴포넌트 사용) */}
      {isReviewModalOpen && (
        <AnswerReviewModal
          initialTranscript={originalTranscript}
          audioUrl={reviewAudioUrl}
          onSubmit={submitReview}
          onEditStart={handleEditStart}
        />
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModalOverlay onClick={() => setSelectedImage(null)}>
          <ImageModalContent>
            <ExpandedImage src={selectedImage} />
            <ImageCloseButton onClick={() => setSelectedImage(null)}>
              ✕
            </ImageCloseButton>
          </ImageModalContent>
        </ImageModalOverlay>
      )}

      {isTTSSpeaking && isExternalAudioDetected && (
        <WarningBanner>
          {t("assistantPage.warnings.externalAudio")}
        </WarningBanner>
      )}
    </MobileContainer>
  );
}

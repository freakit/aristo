import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "@/common/i18n";
import SatisfactionSurveyModal from "./SatisfactionSurveyModal";
import { useSessionLayoutLogic } from "./hooks/useSessionLayoutLogic";
import { ExamShellContext } from "./Layout.context";
import * as S from "./Layout.styles";

import HandAndGazeTrackingModal from "@/common/components/HandAndGazeTrackingModal/HandAndGazeTrackingModal";
import SetupModal, { SetupStatus } from "./exam/components/SetupModal";
import { isMacOs, isChrome } from "@/common/utils/mediaUtils";

// Helper components for UI
const Circle = ({
  size = 16,
  fill = "currentColor",
  color,
}: {
  size?: number;
  fill?: string;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color || "currentColor"}
      strokeWidth="2"
      fill={fill === "currentColor" ? "none" : fill}
    />
    {color && (
      <path
        d="M8 12L11 15L16 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

// Fallback calibration data to ensure camera init runs even if calibration was skipped
const DEFAULT_CALIBRATION_DATA = {
  W: [],
  screenBounds: { width: 1920, height: 1080 },
  flipX: false,
  flipY: false,
};

const ExamSetShellPage: React.FC = () => {
  const { t } = useTranslation();

  const {
    contextValue,
    isListPage,
    examSetId,
    examSetName,
    isSetRecording,
    isRecordingStopped,
    showSurveyModal,
    isLoading,
    exams,
    currentExamId,
    isExamInProgress,
    isTrackingRecording,
    isExamFinishedConditionMet,
    completedSectionIds,
    allSectionsCompleted,
    isUploading,
    trackingVideoUploaded,
    isCompletionPage,
    startSetRecording,
    stopScreenRecording,
    finishExamSet,
    handleSurveyClose,
    handleExamClick,
  } = useSessionLayoutLogic();

  // Sidebar visibility - hide on list page
  const showSidebar = !isListPage && (!!examSetId || !!currentExamId);

  // Fix 1: State for Setup Modal
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>("pending");
  const [setupError, setSetupError] = useState<string | null>(null);

  return (
    <ExamShellContext.Provider value={contextValue}>
      <S.ShellContainer>
        <S.MainContent>
          {/* If in Set mode and NOT recording, show Start Instruction (not on list page) */}
          {!isListPage &&
          examSetId &&
          !isSetRecording &&
          !isRecordingStopped ? (
            <S.EmptyStateContainer>
              <h2>{examSetName}</h2>
              <S.StartInstruction>
                {t("examSetShellUI.startInstruction")}
              </S.StartInstruction>
              <S.StartSetButton onClick={() => setShowIntroModal(true)}>
                {t("examSetShellUI.startButton")}
              </S.StartSetButton>
            </S.EmptyStateContainer>
          ) : (
            <>
              {examSetId && isSetRecording && !currentExamId && (
                <S.EmptyStateContainer>
                  <S.SelectSectionMessage>
                    {t("examSetShellUI.selectSection")}
                  </S.SelectSectionMessage>
                </S.EmptyStateContainer>
              )}
              <Outlet />
            </>
          )}
        </S.MainContent>

        <S.Sidebar $visible={showSidebar && !isCompletionPage}>
          <S.SidebarContent>
            {/* Exam List */}
            <S.ExamListContainer>
              <S.ExamListSection>
                <S.SectionTitle>
                  {examSetId
                    ? t("examSetShellUI.sections")
                    : t("examSetShellUI.availableExams")}
                </S.SectionTitle>
                {isLoading ? (
                  <S.LoadingMessage>{t("common.loading")}</S.LoadingMessage>
                ) : (
                  exams.map((exam) => {
                    const isCompleted =
                      exam.examStudentId &&
                      completedSectionIds.includes(String(exam.examStudentId));

                    const isDisabled =
                      (!isTrackingRecording && !!examSetId) ||
                      (isExamInProgress &&
                        String(exam.examStudentId) !== currentExamId) ||
                      isExamFinishedConditionMet;

                    const isActive =
                      String(exam.examStudentId) === currentExamId;

                    return (
                      <S.ExamItem
                        key={exam.id}
                        $active={isActive}
                        $disabled={isDisabled}
                        onClick={() => !isDisabled && handleExamClick(exam)}
                      >
                        <S.StatusIcon
                          $status={
                            isCompleted
                              ? "completed"
                              : isActive
                                ? "in_progress"
                                : "pending"
                          }
                        >
                          {isCompleted ? (
                            <Circle size={16} fill="#10b981" color="#10b981" />
                          ) : isActive ? (
                            <Circle size={16} fill="currentColor" />
                          ) : (
                            <Circle size={16} />
                          )}
                        </S.StatusIcon>
                        <S.ExamName>{exam.name}</S.ExamName>
                      </S.ExamItem>
                    );
                  })
                )}
              </S.ExamListSection>
            </S.ExamListContainer>

            {/* Finish Set Button */}
            {examSetId && (
              <div
                style={{
                  padding: "16px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {!isRecordingStopped ? (
                  <button
                    onClick={stopScreenRecording}
                    disabled={
                      !(
                        allSectionsCompleted ||
                        (contextValue.isExamFinishedConditionMet &&
                          exams.length > 0 &&
                          exams.every(
                            (e) =>
                              String(e.examStudentId) === currentExamId ||
                              completedSectionIds.includes(
                                String(e.examStudentId) || "",
                              ),
                          ))
                      ) ||
                      isUploading ||
                      !trackingVideoUploaded
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor:
                        (allSectionsCompleted ||
                          (contextValue.isExamFinishedConditionMet &&
                            exams.length > 0 &&
                            exams.every(
                              (e) =>
                                String(e.examStudentId) === currentExamId ||
                                completedSectionIds.includes(
                                  String(e.examStudentId) || "",
                                ),
                            ))) &&
                        trackingVideoUploaded
                          ? "#ef4444"
                          : "#cbd5e1",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor:
                        (allSectionsCompleted ||
                          (contextValue.isExamFinishedConditionMet &&
                            exams.every(
                              (e) =>
                                String(e.examStudentId) === currentExamId ||
                                completedSectionIds.includes(
                                  String(e.examStudentId) || "",
                                ),
                            ))) &&
                        trackingVideoUploaded
                          ? "pointer"
                          : "not-allowed",
                      fontWeight: 600,
                    }}
                  >
                    {isUploading ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        <span>{t("examSetShellUI.screenRecordingSaving")}</span>
                      </div>
                    ) : !trackingVideoUploaded ? (
                      t("examSetShellUI.cameraUploadWaiting")
                    ) : (
                      t("examSetShellUI.endExamStopRecording")
                    )}
                  </button>
                ) : (
                  <button
                    onClick={finishExamSet}
                    disabled={!trackingVideoUploaded}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: trackingVideoUploaded
                        ? "#10b981"
                        : "#cbd5e1",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: trackingVideoUploaded ? "pointer" : "not-allowed",
                      fontWeight: 600,
                    }}
                  >
                    {trackingVideoUploaded
                      ? t("examSetShellUI.endExamSet")
                      : t("examSetShellUI.videoUploading")}
                  </button>
                )}
              </div>
            )}
            {/* Camera / Tracking Modal */}
            {!isCompletionPage &&
              contextValue.student &&
              currentExamId &&
              (!examSetId || isSetRecording) && (
                <div
                  style={{ marginTop: "auto", borderTop: "1px solid #e2e8f0" }}
                >
                  <HandAndGazeTrackingModal
                    school={contextValue.student.school}
                    studentId={contextValue.student.studentId.toString()}
                    examName={
                      examSetName ||
                      exams.find(
                        (e) => String(e.examStudentId) === currentExamId,
                      )?.name ||
                      "Exam"
                    }
                    examStudentId={
                      contextValue.examStudentId
                        ? Number(contextValue.examStudentId)
                        : null
                    }
                    calibrationData={
                      contextValue.calibrationData || DEFAULT_CALIBRATION_DATA
                    }
                    isExamFinished={allSectionsCompleted}
                    onCameraReady={() => contextValue.setIsCameraReady(true)}
                    onVideoUploaded={() =>
                      contextValue.setTrackingVideoUploaded(true)
                    }
                    onRecordingStart={() =>
                      contextValue.setIsTrackingRecording(true)
                    }
                    isRecordingDisabled={false}
                  />
                </div>
              )}
          </S.SidebarContent>
        </S.Sidebar>

        {/* Survey Modal */}
        {/* Survey Modal */}
        {showSurveyModal && (
          <SatisfactionSurveyModal onClose={handleSurveyClose} />
        )}

        {/* Fix 1: Setup Modal (Replaced IntroductionModal) */}
        {showIntroModal && (
          <SetupModal
            status={setupStatus}
            error={setupError}
            isMac={isMacOs()}
            isCameraReady={true}
            onReload={() => window.location.reload()}
            onConfirm={async () => {
              // 1. Browser/OS Check (Simplified from useExamSetup)
              if (isMacOs() && !isChrome()) {
                alert("Mac에서는 Chrome 브라우저를 사용해야 합니다.");
                return;
              }

              setSetupStatus("checking");

              try {
                // 2. Start Screen Recording
                const started = await startSetRecording();
                if (started) {
                  setSetupStatus("ready");
                  setShowIntroModal(false); // Close modal on success
                } else {
                  setSetupStatus("error");
                  setSetupError(t("assistantPage.setup.permissionCancelled"));
                }
              } catch (err) {
                console.error("Setup check failed", err);
                setSetupStatus("error");
                setSetupError(t("assistantPage.setup.permissionCancelled"));
              }
            }}
          />
        )}
      </S.ShellContainer>
    </ExamShellContext.Provider>
  );
};

export default ExamSetShellPage;

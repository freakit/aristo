import React from "react";
import { ArrowLeft, AlertTriangle, Download } from "lucide-react";
import RiskTimeline from "./RiskTimeline";
import RiskEventList from "./RiskEventList";
import ConversationList from "./ConversationList";
import ExamReportTemplate from "./ExamReportTemplate";
import { useExamReviewLogic } from "./hooks/useExamReviewLogic";
import * as S from "./Page.styles";
import { LoadingSpinner } from "@/common/styles/GlobalStyles";

const ExamReviewPage: React.FC = () => {
  const {
    exam,
    student,
    examLog,
    videoUrl,
    screenVideoUrl,
    viewMode,
    switchViewMode,
    currentTime,
    handleTimeUpdate,
    handleEventClick,
    handleDownloadReport,
    trackingRef,
    screenRef,
    reportRef,
    resolvedExamName,
    loading,
    error,
    navigate,
    qaList,
  } = useExamReviewLogic();

  const [activeTab, setActiveTab] = React.useState<"RISK" | "CONVERSATION">(
    "RISK"
  );

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <S.PageContainer>
        <AlertTriangle /> {error}
      </S.PageContainer>
    );

  return (
    <S.PageContainer>
      <S.Header>
        <S.BackButton onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </S.BackButton>
        <S.TitleSection>
          <S.Title>{exam?.name || "Exam Review"}</S.Title>
          <S.Subtitle>
            {student?.name} ({student?.registrationNumber})
          </S.Subtitle>
        </S.TitleSection>
        {examLog && (
          <S.Button
            onClick={handleDownloadReport}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <Download size={16} /> Download Report
          </S.Button>
        )}
      </S.Header>

      <S.ContentGrid>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <S.Button
              onClick={() => switchViewMode("TRACKING")}
              style={{
                background: viewMode === "TRACKING" ? "#2563eb" : "#e2e8f0",
                color: viewMode === "TRACKING" ? "white" : "#64748b",
              }}
            >
              Tracking Camera
            </S.Button>
            <S.Button
              onClick={() => switchViewMode("SCREEN")}
              style={{
                background: viewMode === "SCREEN" ? "#2563eb" : "#e2e8f0",
                color: viewMode === "SCREEN" ? "white" : "#64748b",
              }}
              disabled={!screenVideoUrl}
            >
              Screen Share {screenVideoUrl ? "" : "(Not Available)"}
            </S.Button>
          </div>
          <S.VideoSection>
            {videoUrl && (
              <S.StyledVideo
                key="tracking-video"
                ref={trackingRef}
                src={videoUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                style={{ display: viewMode === "TRACKING" ? "block" : "none" }}
              />
            )}

            {screenVideoUrl && (
              <S.StyledVideo
                key="screen-video"
                ref={screenRef}
                src={screenVideoUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                style={{ display: viewMode === "SCREEN" ? "block" : "none" }}
              />
            )}

            {viewMode === "TRACKING" && !videoUrl && (
              <div style={{ color: "white" }}>Tracking Video not found...</div>
            )}
            {viewMode === "SCREEN" && !screenVideoUrl && (
              <div style={{ color: "white" }}>Screen Video not found...</div>
            )}
          </S.VideoSection>
          {examLog && (
            <RiskTimeline
              duration={examLog.meta.totalDuration}
              currentTime={currentTime}
              events={examLog.events}
              onSeek={(t) => handleEventClick(t * 1000)}
            />
          )}
        </div>

        <S.Sidebar>
          <S.InfoCard>
            <S.InfoTitle>Session Info</S.InfoTitle>
            <div>
              Duration:{" "}
              {examLog?.meta.totalDuration
                ? Math.round(examLog.meta.totalDuration) + "s"
                : "-"}
            </div>
            <div>Events: {examLog?.events.length || 0}</div>
          </S.InfoCard>

          <S.InfoCard
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "12px",
              }}
            >
              <S.Button
                onClick={() => setActiveTab("RISK")}
                style={{
                  flex: 1,
                  background: activeTab === "RISK" ? "#333f66" : "transparent",
                  color: activeTab === "RISK" ? "white" : "#64748b",
                  border:
                    activeTab === "RISK"
                      ? "1px solid #333f66"
                      : "1px solid #e2e8f0",
                }}
              >
                Risk Events
              </S.Button>
              <S.Button
                onClick={() => setActiveTab("CONVERSATION")}
                style={{
                  flex: 1,
                  background:
                    activeTab === "CONVERSATION" ? "#333f66" : "transparent",
                  color: activeTab === "CONVERSATION" ? "white" : "#64748b",
                  border:
                    activeTab === "CONVERSATION"
                      ? "1px solid #333f66"
                      : "1px solid #e2e8f0",
                }}
              >
                Conversation
              </S.Button>
            </div>

            {activeTab === "RISK" ? (
              <>
                <S.InfoTitle>Risk Events</S.InfoTitle>
                {examLog && (
                  <RiskEventList
                    events={examLog.events}
                    currentTime={currentTime}
                    onSeek={(t) => handleEventClick(t)}
                  />
                )}
              </>
            ) : (
              <ConversationList qaList={qaList} />
            )}
          </S.InfoCard>
        </S.Sidebar>
      </S.ContentGrid>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {examLog && (
          <ExamReportTemplate
            ref={reportRef}
            examLog={examLog}
            student={student}
            examName={resolvedExamName || exam?.name || "Unknown Exam"}
          />
        )}
      </div>
    </S.PageContainer>
  );
};

export default ExamReviewPage;

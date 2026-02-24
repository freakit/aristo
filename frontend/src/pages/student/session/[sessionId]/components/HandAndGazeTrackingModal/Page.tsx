import React from "react";
import {
  Camera,
  Video,
  Square,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/common/styles/GlobalStyles";
import { useTranslation } from "@/common/i18n";
import { HandAndGazeTrackingModalProps } from "./types";
import { useTrackingLogic } from "./hooks/useTrackingLogic";
import * as S from "./Page.styles";

const HandAndGazeTrackingModal: React.FC<HandAndGazeTrackingModalProps> = (
  props,
) => {
  const { t } = useTranslation();
  const {
    videoRef,
    canvasRef,
    error,
    componentStatus,
    downloadUrl,
    recordingState,
    recordingCompleted,
    currentHandCount,
    gazeState,
    gazePoint,
    uiStatus,
    uploadStatus,
    trackingUploadProgress,
    isWebcamReady,
    isMediaPipeReady,
    startRecording,
    stopRecording,
    handleUpload,
    setUiStatus,
  } = useTrackingLogic(props);

  if (uiStatus === "closed") return null;

  return (
    <S.Overlay $uiStatus={uiStatus}>
      <S.ModalContainer>
        <S.Header>
          <S.HeaderLeft>
            <Camera size={20} color="#6366f1" />
            <S.Title>{t("trackingModal.title")}</S.Title>
          </S.HeaderLeft>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setUiStatus("closed")}
          >
            {t("common.close")}
          </Button>
        </S.Header>

        <S.Content>
          <S.VideoWrapper>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ display: "none" }}
            />
            <S.StyledCanvas ref={canvasRef} width={1280} height={720} />

            {!isWebcamReady && (
              <S.LoadingOverlay>
                <S.Spinner />
                <p>{t("trackingModal.camera.initializing")}</p>
              </S.LoadingOverlay>
            )}

            {isWebcamReady && !isMediaPipeReady && (
              <S.LoadingOverlay>
                <S.Spinner />
                <p>{t("trackingModal.mediapipe.loading")}</p>
              </S.LoadingOverlay>
            )}
          </S.VideoWrapper>

          <S.Sidebar>
            <S.StatusSection>
              <S.StatusItem>
                <S.StatusLabel>
                  {t("trackingModal.status.camera")}
                </S.StatusLabel>
                <S.StatusValue $active={isWebcamReady}>
                  {isWebcamReady
                    ? t("trackingModal.status.active")
                    : t("trackingModal.status.inactive")}
                </S.StatusValue>
              </S.StatusItem>
              <S.StatusItem>
                <S.StatusLabel>{t("trackingModal.status.hands")}</S.StatusLabel>
                <S.StatusValue $active={currentHandCount > 0}>
                  {currentHandCount} {t("trackingModal.status.detected")}
                </S.StatusValue>
              </S.StatusItem>
              <S.StatusItem>
                <S.StatusLabel>{t("trackingModal.status.gaze")}</S.StatusLabel>
                <S.StatusValue $active={gazeState === "tracking"}>
                  {gazeState === "tracking"
                    ? t("trackingModal.status.tracking")
                    : t("trackingModal.status.idle")}
                </S.StatusValue>
              </S.StatusItem>
            </S.StatusSection>

            <S.ControlsSection>
              {!recordingState.isRecording ? (
                <Button
                  variant="primary"
                  onClick={startRecording}
                  disabled={
                    !isWebcamReady || !isMediaPipeReady || recordingCompleted
                  }
                  style={{ width: "100%" }}
                >
                  <Video size={18} />
                  {t("trackingModal.controls.startRecording")}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={stopRecording}
                  style={{ width: "100%" }}
                >
                  <Square size={18} />
                  {t("trackingModal.controls.stopRecording")}
                </Button>
              )}

              {recordingCompleted && (
                <div style={{ marginTop: "12px" }}>
                  <Button
                    variant="success"
                    onClick={handleUpload}
                    disabled={
                      uploadStatus === "uploading" || uploadStatus === "success"
                    }
                    style={{ width: "100%" }}
                  >
                    <Upload size={18} />
                    {uploadStatus === "uploading"
                      ? `${t("trackingModal.controls.uploading")} (${trackingUploadProgress}%)`
                      : t("trackingModal.controls.uploadVideo")}
                  </Button>

                  {downloadUrl && (
                    <S.DownloadLink
                      href={downloadUrl}
                      download={`tracking_${props.studentId}.webm`}
                    >
                      {t("trackingModal.controls.downloadLocal")}
                    </S.DownloadLink>
                  )}
                </div>
              )}
            </S.ControlsSection>

            {error && (
              <S.ErrorBox>
                <AlertCircle size={16} />
                <span>{error}</span>
              </S.ErrorBox>
            )}

            {uploadStatus === "success" && (
              <S.SuccessBox>
                <CheckCircle size={16} />
                <span>{t("trackingModal.status.uploadSuccess")}</span>
              </S.SuccessBox>
            )}
          </S.Sidebar>
        </S.Content>

        <S.GazeIndicator
          $x={gazePoint.x}
          $y={gazePoint.y}
          $visible={recordingState.isRecording && gazePoint.onScreen}
        />
      </S.ModalContainer>
    </S.Overlay>
  );
};

export default HandAndGazeTrackingModal;

import React, { useState } from "react";
import { useTranslation } from "@/common/i18n";
import {
  useCalibrationLogic,
  CalibrationData,
} from "../../hooks/useCalibrationLogic";
import * as S from "./StandaloneCalibration.styles";

interface StandaloneCalibrationProps {
  studentId: string;
  onComplete: (data: CalibrationData) => void;
  onCancel: () => void;
}

const StandaloneCalibration: React.FC<StandaloneCalibrationProps> = ({
  studentId,
  onComplete,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const {
    videoRef,
    canvasRef,
    currentTarget,
    calibStats,
    error,
    cleanup,
    GridCols, // Fixed naming
    GridRows, // Fixed naming
    targetsLength,
  } = useCalibrationLogic({ studentId, onComplete });

  const handleCancelClick = () => setShowCancelConfirm(true);

  const handleConfirmCancel = () => {
    cleanup();
    onCancel();
  };

  return (
    <S.FullScreenOverlay>
      <S.VideoContainer>
        <S.StyledVideo ref={videoRef} playsInline muted />
        <S.StyledCanvas ref={canvasRef} />
      </S.VideoContainer>

      <S.CalibrationUI>
        <S.CalibrationStatus>
          <div>
            {t("trackingModal.calibration.statsCollected", {
              collected: calibStats.collected,
              required: calibStats.required,
            })}
          </div>
          <div>
            {t("trackingModal.calibration.statsPoints", {
              current: currentTarget ? currentTarget.idx + 1 : 0,
              total: targetsLength || 12,
            })}
          </div>
        </S.CalibrationStatus>

        <S.CancelButton onClick={handleCancelClick}>
          {t("common.cancel")}
        </S.CancelButton>

        {currentTarget && (
          <S.CalibrationDot
            style={{
              top: currentTarget.y,
              left: currentTarget.x,
            }}
          />
        )}

        <S.CalibrationText>
          {error ? (
            <span style={{ color: "#ef4444" }}>{error}</span>
          ) : (
            t("trackingModal.calibration.lookAtDot")
          )}
        </S.CalibrationText>
      </S.CalibrationUI>

      {showCancelConfirm && (
        <S.ConfirmDialog>
          <h3>{t("trackingModal.cancelConfirm.title")}</h3>
          <p>{t("trackingModal.cancelConfirm.message")}</p>
          <S.ButtonGroup>
            <S.Button onClick={() => setShowCancelConfirm(false)}>
              {t("common.continue")}
            </S.Button>
            <S.Button variant="primary" onClick={handleConfirmCancel}>
              {t("common.confirm")}
            </S.Button>
          </S.ButtonGroup>
        </S.ConfirmDialog>
      )}
    </S.FullScreenOverlay>
  );
};

export default StandaloneCalibration;

// src/components/SetupModal.tsx
import React from "react";
import { useTranslation } from "@/common/i18n";
import * as S from "./SetupModal.styles";

// --- Type Definitions ---
export type SetupStatus =
  | "pending"
  | "checking"
  | "ready"
  | "error"
  | "unsupported";

interface SetupModalProps {
  status: SetupStatus;
  error: string | null;
  isMac: boolean;
  onConfirm: () => void;
  onReload: () => void;
  isCameraReady?: boolean;
}

// --- Component ---
const SetupModal: React.FC<SetupModalProps> = ({
  status,
  error,
  isMac,
  onConfirm,
  onReload,
  isCameraReady = true,
}) => {
  const { t } = useTranslation();

  const getButtonProps = () => {
    switch (status) {
      case "error":
        return { textKey: "setupModal.buttons.reload", action: onReload };
      case "checking":
        return { textKey: "setupModal.buttons.checking", action: () => {} };
      case "pending":
      default:
        if (!isCameraReady) {
          return {
            textKey: "setupModal.buttons.cameraLoading",
            action: () => {},
          };
        }
        return { textKey: "setupModal.buttons.confirm", action: onConfirm };
    }
  };

  const { textKey, action } = getButtonProps();

  if (status === "unsupported") {
    return (
      <S.SetupOverlay>
        <S.ModalContainer>
          <S.SetupTitle>🚫 {t("unsupportedDevice.title")}</S.SetupTitle>
          <S.ErrorMessageContainer>
            <strong>{t("unsupportedDevice.subtitle")}</strong>
            <p style={{ marginTop: "8px" }}>
              {t("unsupportedDevice.explanation")}
            </p>
            <p>
              <strong>{t("unsupportedDevice.instructionBold")}</strong>
              {t("unsupportedDevice.instructionNormal")}
            </p>
          </S.ErrorMessageContainer>
        </S.ModalContainer>
      </S.SetupOverlay>
    );
  }

  return (
    <S.SetupOverlay>
      <S.ModalContainer>
        <S.SetupTitle>{t("setupModal.title")}</S.SetupTitle>
        <S.SetupList>
          <S.SetupListItem>
            <strong
              dangerouslySetInnerHTML={{
                __html: t("setupModal.sharingTitle"),
              }}
            />
            <p
              dangerouslySetInnerHTML={{
                __html: t("setupModal.windows.description"),
              }}
            />
          </S.SetupListItem>
        </S.SetupList>

        {status === "error" && error && (
          <S.ErrorMessageContainer>
            <strong>{t("setupModal.errorPrefix")}</strong> {error}
          </S.ErrorMessageContainer>
        )}

        <S.ConfirmButton
          onClick={action}
          disabled={
            status === "checking" || (status === "pending" && !isCameraReady)
          }
        >
          {t(textKey)}
        </S.ConfirmButton>
      </S.ModalContainer>
    </S.SetupOverlay>
  );
};

export default SetupModal;

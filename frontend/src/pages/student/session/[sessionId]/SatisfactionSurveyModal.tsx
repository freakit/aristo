// src/components/SatisfactionSurveyModal.tsx
import React from "react";
import { useTranslation } from "@/common/i18n";
import {
  ModalOverlay,
  ModalContent,
  IconWrapper,
  Title,
  Description,
  ButtonGroup,
  Button,
} from "./SatisfactionSurveyModal.styles";

const SURVEY_URL = "https://forms.gle/5ySKgbs6QLYuYGom9";

interface SatisfactionSurveyModalProps {
  onClose: () => void;
}

const SatisfactionSurveyModal: React.FC<SatisfactionSurveyModalProps> = ({
  onClose,
}) => {
  const { t } = useTranslation();

  const handleParticipate = () => {
    window.open(SURVEY_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <IconWrapper>✨</IconWrapper>
        <Title>{t("surveyModal.title")}</Title>
        <Description>
          {t("surveyModal.description")}
        </Description>
        <ButtonGroup>
          <Button onClick={handleSkip}>
            {t("surveyModal.skip")}
          </Button>
          <Button $primary onClick={handleParticipate}>
            {t("surveyModal.participate")}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SatisfactionSurveyModal;


import React from "react";
import styled from "styled-components";
import { useTranslation } from "@/common/i18n";
import { FiCheck } from "react-icons/fi";

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const Description = styled.p`
  font-size: 1rem;
  color: #475569;
  line-height: 1.5;
  margin: 0;
`;

const Button = styled.button`
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2563eb;
  }
`;

interface IntroductionModalProps {
  onConfirm: () => void;
}

export const IntroductionModal: React.FC<IntroductionModalProps> = ({
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <Overlay>
      <ModalContainer>
        <Title>{t("examSetShellUI.introductionModal.title")}</Title>
        <Description>
          {t("examSetShellUI.introductionModal.description")}
        </Description>
        <Button onClick={onConfirm}>
          <FiCheck />
          {t("examSetShellUI.introductionModal.confirmButton")}
        </Button>
      </ModalContainer>
    </Overlay>
  );
};

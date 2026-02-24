// src/components/HandAndGazeTrackingModal.styles.ts

import styled, { keyframes, css } from "styled-components";

/** 내부용 애니메이션 (필요 시 export 가능) */
const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
`;

/** 공용 스타일 컴포넌트들 */
export const ModalWrapper = styled.div`
  position: relative;
  width: 100%;
  background: rgba(30, 41, 59, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid #475569;
  z-index: 1001;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const WebcamArea = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #0f172a;
  border-bottom: 1px solid #475569;
`;

export const StyledCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
`;

export const StyledVideo = styled.video`
  display: none;
`;

export const Placeholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding: 20px;
  text-align: center;
`;

/** 경고 오버레이 타입 */
export type WarningType = "hand" | "gaze" | "unified";

export const WarningOverlay = styled.div<{ $type?: WarningType }>`
  position: absolute;
  ${(props) =>
    props.$type === "gaze"
      ? "top: 12px; right: 12px;"
      : `
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        box-sizing: border-box;
      `}
  z-index: 5;
  background: ${(props) =>
    props.$type === "gaze"
      ? "rgba(251, 146, 60, 0.9)"
      : "rgba(239, 68, 68, 0.8)"};
  color: #f8fafc;
  padding: ${(props) => (props.$type === "gaze" ? "6px 10px" : "10px")};
  border-radius: 12px;
  border: 1px solid
    ${(props) => (props.$type === "gaze" ? "#fed7aa" : "#fca5a5")};
  display: flex;
  flex-direction: ${(props) => (props.$type === "gaze" ? "row" : "column")};
  align-items: center;
  gap: 8px;
  text-align: center;
  font-size: ${(props) => (props.$type === "gaze" ? "12px" : "14px")};
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);

  ${(props) =>
    props.$type === "gaze" &&
    css`
      animation: ${pulse} 2s infinite;
    `}
`;

export const ControlsArea = styled.div`
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: #1e293b;
  min-height: 60px;
`;

/** 버튼 variant 타입 */
export type ButtonVariant = "primary" | "danger" | "warning" | "success";

export const ControlButton = styled.button<{ variant?: ButtonVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  text-decoration: none;

  ${(props) => {
    switch (props.variant) {
      case "danger":
        return css`
          background-color: #dc2626;
          &:hover {
            background-color: #ef4444;
          }
        `;
      case "warning":
        return css`
          background-color: #f59e0b;
          &:hover {
            background-color: #facc15;
          }
        `;
      case "success":
        return css`
          background-color: #16a34a;
          &:hover {
            background-color: #22c55e;
          }
        `;
      default:
        return css`
          background-color: #2563eb;
          &:hover {
            background-color: #3b82f6;
          }
        `;
    }
  }}

  &:disabled {
    background-color: #475569;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const RecIndicator = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  color: #f87171;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    background-color: #f87171;
    border-radius: 50%;
    animation: ${pulse} 1.5s infinite;
  }
`;

export const ErrorMessage = styled.div`
  background: #7f1d1d;
  color: #fecaca;
  padding: 10px;
  font-size: 10px;
  text-align: center;
`;

export const GazeIndicator = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 4;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

/** 시각 상태 타입 */
export type GazeUiState = "idle" | "in" | "out" | "closed";

export const GazeStatus = styled.div<{ $state: GazeUiState }>`
  color: ${({ $state }) =>
    $state === "in"
      ? "#22c55e"
      : $state === "out"
      ? "#ef4444"
      : $state === "closed"
      ? "#facc15"
      : "#94a3b8"};
`;

export const HandCountIndicator = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 4;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
`;

export const CalibrationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
`;

export const CalibrationDot = styled.div`
  width: 24px;
  height: 24px;
  background: #facc15;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 30px #facc15;
  position: absolute;
  animation: ${pulse} 1.5s infinite;
  z-index: 2002;
`;

export const CalibrationText = styled.p`
  font-size: 24px;
  text-align: center;
  max-width: 80%;
  line-height: 1.5;
  margin-top: 18px;
`;

export const CalibrationStatus = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 2001;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 12px;
  color: white;
  font-size: 14px;
`;

export const CalibrationCancelButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2001;
  background: rgba(239, 68, 68, 0.8);
  color: white;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.9);
  }
`;

export const CancelConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2500;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const CancelConfirmDialog = styled.div`
  background: #1e293b;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  text-align: center;
  color: white;
  border: 1px solid #475569;

  h3 {
    margin: 0 0 12px 0;
    color: #ef4444;
  }

  p {
    margin: 0 0 20px 0;
    color: #94a3b8;
  }
`;

export const CancelConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

export const CancelButton = styled.button`
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #ef4444;
  }
`;

export const ContinueButton = styled.button`
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #22c55e;
  }
`;

export const WarningButton = styled.button`
  background: #f87171;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: white;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #fecaca;
  }
`;

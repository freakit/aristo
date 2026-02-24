import styled from "styled-components";

export const FullScreenOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10000;
  display: flex;
  flex-direction: column;
`;

export const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
`;

export const StyledVideo = styled.video`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  visibility: hidden;
`;

export const StyledCanvas = styled.canvas`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  visibility: hidden;
`;

export const CalibrationDot = styled.div`
  position: fixed;
  width: 24px;
  height: 24px;
  background: rgba(239, 68, 68, 0.8);
  border: 3px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
  z-index: 10001;
  @keyframes pulse {
    0%,
    100% {
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.2);
    }
  }
`;

export const CalibrationUI = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10001;
`;

export const CalibrationStatus = styled.div`
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 20px 32px;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  text-align: center;
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const CalibrationText = styled.div`
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 16px 24px;
  border-radius: 8px;
  color: white;
  font-size: 18px;
  backdrop-filter: blur(4px);
`;

export const CancelButton = styled.button`
  position: absolute;
  top: 40px;
  right: 40px;
  padding: 12px 24px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.2s;
  &:hover {
    background: rgba(220, 38, 38, 1);
    transform: translateY(-2px);
  }
`;

export const ConfirmDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 10002;
  pointer-events: all;
  max-width: 400px;
  width: 90%;
  h3 {
    margin: 0 0 16px 0;
    font-size: 20px;
    color: #1e293b;
  }
  p {
    margin: 0 0 24px 0;
    color: #64748b;
    line-height: 1.6;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

export const Button = styled.button<{ variant?: "primary" | "secondary" }>`
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  ${(props) =>
    props.variant === "primary"
      ? `
    background: #10b981;
    color: white;
    &:hover { background: #059669; transform: translateY(-2px); }
  `
      : `
    background: #f1f5f9;
    color: #64748b;
    &:hover { background: #e2e8f0; }
  `}
`;

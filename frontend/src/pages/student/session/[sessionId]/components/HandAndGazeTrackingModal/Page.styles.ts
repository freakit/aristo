import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Overlay = styled.div<{ $uiStatus: string }>`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  width: 380px;
  max-width: 90vw;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${(props) => (props.$uiStatus === "out" ? 0.3 : 1)};
  transform: ${(props) =>
    props.$uiStatus === "out" ? "translateX(340px)" : "none"};
  pointer-events: ${(props) => (props.$uiStatus === "out" ? "none" : "auto")};

  &:hover {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

export const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: ${fadeIn} 0.4s ease-out;
`;

export const Header = styled.div`
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
`;

export const VideoWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* 4:3 Aspect Ratio */
  background: #000;
`;

export const StyledCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
`;

export const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  color: white;
  gap: 12px;

  p {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }
`;

export const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;

  @keyframes spinner {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Sidebar = styled.div`
  padding: 16px;
  background: white;
`;

export const StatusSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

export const StatusItem = styled.div`
  padding: 10px;
  background: #f1f5f9;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const StatusLabel = styled.div`
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const StatusValue = styled.div<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props) => (props.$active ? "#10b981" : "#64748b")};
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(props) => (props.$active ? "#10b981" : "#cbd5e1")};
    display: inline-block;
  }
`;

export const ControlsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const DownloadLink = styled.a`
  display: block;
  text-align: center;
  font-size: 12px;
  color: #6366f1;
  text-decoration: none;
  margin-top: 8px;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

export const ErrorBox = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  color: #dc2626;
  font-size: 12px;
  display: flex;
  align-items: start;
  gap: 8px;
  line-height: 1.4;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

export const SuccessBox = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 8px;
  color: #10b981;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
`;

export const GazeIndicator = styled.div<{
  $x: number;
  $y: number;
  $visible: boolean;
}>`
  position: fixed;
  top: ${(props) => props.$y}px;
  left: ${(props) => props.$x}px;
  width: 12px;
  height: 12px;
  background: #6366f1;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition:
    opacity 0.2s,
    transform 0.1s;
  opacity: ${(props) => (props.$visible ? 0.8 : 0)};
  display: ${(props) => (props.$visible ? "block" : "none")};
`;

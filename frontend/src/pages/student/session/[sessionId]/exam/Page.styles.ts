// src/pages/student/StudentAssistantPage.styles.ts

import styled, { keyframes, css } from "styled-components";
import {
  FullScreenLoadingOverlay,
  FullScreenLoadingContent,
  LoadingSpinnerLarge,
  LoadingMessage,
  LoadingSubMessage,
  ServerResponseLoadingOverlay,
  ServerResponseLoadingContent,
} from "@/common/components/ui/Loading";

export {
  FullScreenLoadingOverlay,
  FullScreenLoadingContent,
  LoadingSpinnerLarge,
  LoadingMessage,
  LoadingSubMessage,
  ServerResponseLoadingOverlay,
  ServerResponseLoadingContent,
};

/* ========== Animations ========== */
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

/* ========== Container ========== */
export const MobileContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
`;

/* ========== Header ========== */
export const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 240px;
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

export const HeaderTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-right: 80px;
`;

export const HeaderAction = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

export const TimerBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
`;

export const NextExamButton = styled.button`
  background-color: #ef4444;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #dc2626;
  }
  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

/* ========== Main Content Area (Split Layout) ========== */
export const MainContentArea = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr; /* 1:1 Ratio Change */
  gap: 0;
  height: calc(100vh - 60px - 80px);
  margin-top: 60px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
`;

/* ========== Left Column Container (New) ========== */
export const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
  overflow: hidden;
`;

/* ========== Left Panel (Scrollable Content) ========== */
export const LeftPanel = styled.div`
  flex: 1; /* Fills remaining space */
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f8f9fa;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
    &:hover {
      background: #9ca3af;
    }
  }
`;

/* ========== AI Script Bubble (New) ========== */
export const AIScriptBubble = styled.div`
  flex-shrink: 0;
  background: #f0f9ff; /* Light blue/white tint for speech bubble */
  border-top: 1px solid #e0f2fe;
  padding: 16px 24px;
  position: relative;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: inset 0 4px 6px -4px rgba(0, 0, 0, 0.05);
`;

export const ScriptContent = styled.div`
  font-size: 15px;
  line-height: 1.6;
  color: #0369a1;
  font-weight: 500;
`;

/* ========== Tab Interface ========== */
export const SectionTabs = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 20px;
`;

export const SectionTab = styled.button<{ $isActive: boolean }>`
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: ${(props) => (props.$isActive ? "#10b981" : "#6b7280")};
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${(props) => (props.$isActive ? "#10b981" : "transparent")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #10b981;
  }
`;

/* ========== Markdown & Attachments ========== */
export const MarkdownContainer = styled.div`
  line-height: 1.7;
  color: #374151;
  font-size: 15px;

  h1,
  h2,
  h3,
  h4,
  h5 {
    margin: 1.2em 0 0.6em 0;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.3;
  }
  p {
    margin-bottom: 1em;
  }
  ul,
  ol {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }
  code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }
  strong {
    font-weight: 600;
    color: #1a1a1a;
  }
`;

export const AttachmentSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
`;

export const AttachmentItem = styled.div`
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  display: block;
  text-decoration: none;
  color: #2563eb;
  font-size: 14px;

  &:hover {
    text-decoration: underline;
  }
`;

export const Image = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

/* ========== Right Panel (Q&A) ========== */
export const RightPanel = styled.div`
  background: #f9fafb;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
    &:hover {
      background: #9ca3af;
    }
  }
  position: relative;
`;

export const QATitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
`;

export const QAList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const QAItem = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

export const QuestionSection = styled.div`
  margin-bottom: 12px;
`;

export const AnswerSection = styled.div``;

export const QLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

export const ALabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

export const QText = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.6;
`;

export const AText = styled.div`
  font-size: 15px;
  color: #374151;
  line-height: 1.6;
`;

export const EmptyQAState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

export const EmptyQAIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

export const EmptyQATitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
`;

export const EmptyQADescription = styled.p`
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
`;

/* ========== Control Bar (Bottom Fixed) ========== */
export const ControlBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 200;
`;

export const StatusInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const StatusIcon = styled.div<{ $recording?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${(props) => (props.$recording ? "#ef4444" : "#10b981")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  position: relative;
  ${(props) =>
    props.$recording &&
    css`
      animation: ${pulse} 2s infinite;
    `}

  /* Speech bubble tail pointing up from icon to AIScriptBubble */
  &::after {
    content: "";
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%) translateY(-2px);
    width: 24px;
    height: 14px;
    background: linear-gradient(to top, rgb(187, 227, 212) 0%, #e5e7eb 100%);
    clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
  }
`;

export const StatusText = styled.div``;

export const StatusTitle = styled.div`
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  color: #1a1a1a;
`;

export const StatusDescription = styled.div`
  font-size: 13px;
  color: #6b7280;
`;

export const ControlButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ControlButton = styled.button<{
  $danger?: boolean;
  $primary?: boolean;
  $active?: boolean;
  isDisabled?: boolean;
}>`
  padding: 10px 24px;
  border: 1px solid
    ${(props) =>
      props.$danger
        ? "#ef4444"
        : props.$primary
          ? "#10b981"
          : props.$active
            ? "#cbd5e1"
            : "#e5e7eb"};
  border-radius: 6px;
  background: ${(props) =>
    props.$danger
      ? "#ef4444"
      : props.$primary
        ? "#10b981"
        : props.$active
          ? "#f1f5f9"
          : "#ffffff"};
  color: ${(props) =>
    props.$danger || props.$primary ? "#ffffff" : "#374151"};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.isDisabled &&
    `
    opacity: 0.5;
    cursor: not-allowed;
  `}

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$danger
        ? "#dc2626"
        : props.$primary
          ? "#059669"
          : props.$active
            ? "#e2e8f0"
            : "#f3f4f6"};
  }
`;

export const VADListeningIndicator = styled.div`
  color: #10b981;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${pulse} 1.5s infinite;
`;

export const VADNotListeningIndicator = styled.div`
  color: #9ca3af;
  font-weight: 600;
  font-size: 14px;
`;

export const RecordingIndicator = styled.div``;

export const RecordingBlock = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 8px;
  margin-right: 8px;
`;

/* ========== Loading States ========== */
/* ========== Loading States (Moved to common) ========== */
// Re-exported at the top of the file

/* ========== Error States ========== */
export const ErrorContainer = styled.div`
  padding: 24px;
  margin: 100px 20px 20px;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
`;

export const ErrorIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

export const ErrorMessage = styled.div`
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 16px;
  font-size: 16px;
`;

/* ========== Upload Overlay ========== */
export const UploadOverlay = styled(FullScreenLoadingOverlay)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
`;

export const UploadContent = styled(FullScreenLoadingContent)``;

export const UploadStatusContainer = styled.div`
  margin-top: 20px;
  width: 100%;
  text-align: left;
  font-size: 14px;
  color: #475569;
`;

export const UploadItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

/* ========== Warning Banner ========== */
export const WarningBanner = styled.div`
  position: fixed;
  bottom: 120px;
  left: 25%;
  width: 50%;
  background-color: #fefce8;
  color: #a16207;
  padding: 24px 20px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  border: 1px solid #fde047;
  border-radius: 8px;
  z-index: 101;
  animation: ${pulse} 2s infinite;
  box-shadow: 0 4px 20px rgba(253, 224, 71, 0.3);
`;

export const ForceCloseButton = styled.button`
  margin-top: 16px;
  background-color: #fbbf24;
  color: #78350f;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f59e0b;
  }
`;

// Compatibility Aliases (To prevent breakages if file names are mixed)
export const LeftContentArea = LeftPanel;
export const ControlsArea = ControlBar;

/* ========== Review Modal (New) ========== */
export const ReviewOverlay = styled(FullScreenLoadingOverlay)`
  background: rgba(0, 0, 0, 0.7);
`;

export const ReviewContent = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const ReviewTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const ReviewTimer = styled.span`
  font-size: 14px;
  color: #ef4444;
  font-weight: 600;
  background: #fee2e2;
  padding: 4px 8px;
  border-radius: 4px;
`;

export const TimerContainer = styled.div`
  width: 100%;
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
`;

export const TimerFill = styled.div<{ $progress: number }>`
  height: 100%;
  background-color: #ef4444;
  width: ${(props) => props.$progress}%;
  transition: width 1s linear;
`;

export const ReviewTextArea = styled.textarea`
  width: 100%;
  min-height: 240px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  background: #f9fafb;
  color: #1f2937;

  &:focus {
    outline: none;
    border-color: #2563eb;
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    color: #4b5563;
    cursor: default;
  }
`;

export const ReviewAudioPlayer = styled.audio`
  width: 100%;
  height: 40px;
`;

export const ReviewButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

export const ReviewWarningText = styled.p`
  font-size: 14px;
  color: #ef4444;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  background-color: #fee2e2;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #fecaca;
`;

/* ========== Image Modal (New) ========== */
export const ImageModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 0;
  animation: ${fadeIn} 0.2s ease-out;
  cursor: zoom-out;
`;

export const ImageModalContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ExpandedImage = styled.img`
  max-width: 95vw;
  max-height: 95vh;
  width: auto;
  height: auto;
  object-fit: contain;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  cursor: default;
  transition: all 0.2s ease-out;
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

/* ========== Status Indicator (New) ========== */
export const StatusIndicatorContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none; /* Let clicks pass through */
`;

export const StatusBadge = styled.div<{ $phase?: string }>`
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  ${(props) =>
    props.$phase === "LISTENING" &&
    css`
      background: rgba(16, 185, 129, 0.9); /* Green */
      border-color: #34d399;
      animation: ${pulse} 2s infinite;
    `}

  ${(props) =>
    props.$phase === "QUESTION_READING" &&
    css`
      background: rgba(59, 130, 246, 0.9); /* Blue */
      border-color: #60a5fa;
    `}

  ${(props) =>
    props.$phase === "PROCESSING_ANSWER" &&
    css`
      background: rgba(245, 158, 11, 0.9); /* Amber */
      border-color: #fbbf24;
    `}
    
   ${(props) =>
    props.$phase === "RECORDING_STARTED" &&
    css`
      background: rgba(239, 68, 68, 0.9); /* Red */
      border-color: #f87171;
    `}
`;

export const StatusPhaseText = styled.span`
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
`;

/* ========== Start Button (New) ========== */
export const StartButton = styled.button`
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${pulse} 2s infinite;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #9ca3af;
    color: #f3f4f6;
    cursor: not-allowed;
    box-shadow: none;
    animation: none;
    transform: none;
  }
`;

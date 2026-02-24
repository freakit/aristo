import styled, { keyframes } from "styled-components";

// Animations
export const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Overlay
export const FullScreenLoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${fadeIn} 0.3s ease-out;
`;

// Content Box
export const FullScreenLoadingContent = styled.div`
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 320px;
  width: 90%;
`;

// Spinner
export const LoadingSpinnerLarge = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin: 0 auto 24px auto;
`;

// Text
export const LoadingMessage = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
`;

export const LoadingSubMessage = styled.div`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
`;

export const ServerResponseLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 50%;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  animation: ${fadeIn} 0.3s ease-out;
  border-radius: 8px;
`;

export const ServerResponseLoadingContent = styled.div`
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 320px;
  width: 90%;
`;

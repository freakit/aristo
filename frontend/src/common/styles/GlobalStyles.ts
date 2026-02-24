// src/styles/GlobalStyles.ts

import styled, { createGlobalStyle, keyframes } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #f8f9fa;
    min-height: 100vh;
    color: #1a1a1a;
    line-height: 1.6;
  }

  button {
    border: none;
    background: none;
    cursor: pointer;
    outline: none;
    font-family: inherit;
  }

  input, textarea {
    border: none;
    outline: none;
    font-family: inherit;
  }

  /* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'); */
`;

// 애니메이션
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

export const Container = styled.div`
  width: 100%;
  min-width: 960px;
  min-height: 100vh;
  padding: 24px 8%;
  animation: ${fadeIn} 0.6s ease-out;
`;

export const MobileContainer = styled.div`
  width: 100%;
  min-width: 960px;
  min-height: 100vh;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #333f66;
  }
`;

export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) =>
    !["variant", "size", "isLoading"].includes(prop),
})<{
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "small" | "medium" | "large";
  isLoading?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  border: none;
  cursor: pointer;
  text-decoration: none;

  ${(props) => {
    switch (props.size) {
      case "small":
        return `padding: 8px 14px; font-size: 13px;`;
      case "large":
        return `padding: 14px 28px; font-size: 16px;`;
      default:
        return `padding: 10px 20px; font-size: 14px;`;
    }
  }}

  ${(props) => {
    switch (props.variant) {
      case "primary":
        return `
          background: #333f66;
          color: white;
          
          &:hover {
            background: #2a3555;
            transform: translateY(-1px);
          }
          
          &:active {
            transform: translateY(0);
          }
        `;
      case "success":
        return `
          background: #10b981;
          color: white;
          
          &:hover {
            background: #059669;
            transform: translateY(-1px);
          }
        `;
      case "danger":
        return `
          background: #ef4444;
          color: white;
          
          &:hover {
            background: #dc2626;
            transform: translateY(-1px);
          }
        `;
      case "ghost":
        return `
          background: transparent;
          color: #6b7280;
          border: 1.5px solid #d1d5db;
          
          &:hover {
            border-color: #333f66;
            color: #333f66;
            background: rgba(51, 63, 102, 0.04);
          }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1.5px solid #e5e7eb;
          
          &:hover {
            background: #e5e7eb;
            transform: translateY(-1px);
          }
        `;
    }
  }}

  ${(props) =>
    props.isLoading &&
    `
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 18px;
      height: 18px;
      margin: -9px 0 0 -9px;
      border: 1.5px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

export const Input = styled.input<{
  variant?: "default" | "filled" | "outline";
  hasError?: boolean;
}>`
  width: 100%;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;
  background: #ffffff;

  ${(props) => {
    switch (props.variant) {
      case "filled":
        return `
          padding: 12px 14px;
          background: #f9fafb;
          border: 1.5px solid transparent;
          
          &:focus {
            background: #ffffff;
            border-color: #333f66;
          }
        `;
      case "outline":
        return `
          padding: 11px 13px;
          border: 1.5px solid #d1d5db;
          
          &:focus {
            border-color: #333f66;
          }
        `;
      default:
        return `
          padding: 12px 14px;
          border: 1.5px solid #d1d5db;
          
          &:focus {
            border-color: #333f66;
          }
        `;
    }
  }}

  ${(props) =>
    props.hasError &&
    `
    border-color: #ef4444 !important;
  `}

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }
`;

export const Card = styled.div<{ hover?: boolean; clickable?: boolean }>`
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;

  ${(props) =>
    props.hover &&
    `
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: #d1d5db;
    }
  `}

  ${(props) =>
    props.clickable &&
    `
    cursor: pointer;
    
    &:active {
      transform: translateY(-1px);
    }
  `}

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #333f66;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  ${(props) =>
    props.hover &&
    `
    &:hover::before {
      opacity: 1;
    }
  `}
`;

export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: ${fadeIn} 0.2s ease-out;
`;

export const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: ${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e5e7eb;

  /* 커스텀 스크롤바 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;

    &:hover {
      background: #9ca3af;
    }
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 18px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }
`;

export const LoadingSpinner = styled.div<{
  size?: "small" | "medium" | "large";
}>`
  width: ${(props) => {
    switch (props.size) {
      case "small":
        return "18px";
      case "large":
        return "36px";
      default:
        return "28px";
    }
  }};
  height: ${(props) => {
    switch (props.size) {
      case "small":
        return "18px";
      case "large":
        return "36px";
      default:
        return "28px";
    }
  }};
  border: 3px solid #e5e7eb;
  border-top: 3px solid #333f66;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export const Badge = styled.span<{
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  size?: "small" | "medium";
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;

  ${(props) => {
    switch (props.size) {
      case "small":
        return `padding: 3px 10px; font-size: 11px;`;
      default:
        return `padding: 4px 12px; font-size: 12px;`;
    }
  }}

  ${(props) => {
    switch (props.variant) {
      case "primary":
        return `background: #ede9fe; color: #6d28d9;`;
      case "success":
        return `background: #d1fae5; color: #065f46;`;
      case "warning":
        return `background: #fef3c7; color: #92400e;`;
      case "danger":
        return `background: #fee2e2; color: #991b1b;`;
      case "info":
        return `background: #dbeafe; color: #1e40af;`;
      default:
        return `background: #f3f4f6; color: #374151;`;
    }
  }}
`;

export const Skeleton = styled.div<{ width?: string; height?: string }>`
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 2s infinite;
  border-radius: 4px;
  width: ${(props) => props.width || "100%"};
  height: ${(props) => props.height || "20px"};
`;

export const FloatingActionButton = styled(Button)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 0;
  box-shadow: 0 4px 12px rgba(51, 63, 102, 0.2);
  z-index: 999;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(51, 63, 102, 0.3);
  }
`;

export const Tooltip = styled.div<{ visible: boolean }>`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  visibility: ${(props) => (props.visible ? "visible" : "hidden")};
  transition: all 0.2s ease;
  z-index: 1000;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1f2937;
  }
`;

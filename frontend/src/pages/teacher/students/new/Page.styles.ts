import styled from "styled-components";
import { Container, Button, Input, Card } from "@/common/styles/GlobalStyles";

export const PageContainer = styled(Container)`
  padding-top: 120px;
  min-width: auto;
  max-width: 800px;
  margin: 0 auto;
`;

export const PageHeader = styled.div`
  text-align: center;
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
`;

export const HeaderIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #10b981;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
  margin: 0 auto 24px;
  box-shadow: 0 12px 35px rgba(16, 185, 129, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(transparent 0%, transparent 70%);
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-20px) rotate(180deg);
    }
  }
`;

export const PageTitle = styled.h1`
  font-size: 36px;
  font-weight: 800;
  background: #10b981;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 12px 0;
`;

export const PageSubtitle = styled.p`
  font-size: 18px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
`;

export const FormCard = styled(Card)`
  padding: 40px;
  background: #f3f4f6;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
`;

export const FormGrid = styled.div`
  display: grid;
  gap: 32px;
`;

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  font-weight: 700;
  color: #1e293b;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const RequiredMark = styled.span`
  color: #ef4444;
  font-weight: 700;
`;

export const StyledInput = styled(Input)<{ hasError?: boolean }>`
  font-size: 16px;
  padding: 12px 16px;

  ${(props) =>
    props.hasError &&
    `
    border-color: #ef4444 !important;
    background-color: #fef2f2;
  `}

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);

    ${(props) =>
      props.hasError &&
      `
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
    `}
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

export const Select = styled.select<{ hasError?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${(props) =>
    props.hasError &&
    `
    border-color: #ef4444 !important;
    background-color: #fef2f2;
  `}

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);

    ${(props) =>
      props.hasError &&
      `
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
    `}
  }

  &:hover {
    border-color: #cbd5e1;
  }
`;

export const TextArea = styled.textarea<{ hasError?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  background: #ffffff;
  color: #374151;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${(props) =>
    props.hasError &&
    `
    border-color: #ef4444 !important;
    background-color: #fef2f2;
    
    &:focus {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
    }
  `}

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

export const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "⚠️";
    font-size: 16px;
  }
`;

export const InfoCard = styled(Card)`
  padding: 24px;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  margin-bottom: 32px;
`;

export const InfoText = styled.p`
  margin: 0;
  color: #15803d;
  font-size: 15px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;

  &::before {
    content: "💡";
    font-size: 18px;
    margin-top: 2px;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 48px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const SuccessMessage = styled.div`
  color: #059669;
  font-size: 16px;
  font-weight: 600;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 12px;

  &::before {
    content: "✅";
    font-size: 20px;
  }
`;

export const GeneralErrorMessage = styled.div`
  color: #dc2626;
  font-size: 16px;
  font-weight: 600;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  border-radius: 12px;

  &::before {
    content: "⚠️";
    font-size: 20px;
  }
`;

export const Divider = styled.div`
  text-align: center;
  margin: 48px 0;
  color: #94a3b8;
  font-weight: 600;
  display: flex;
  align-items: center;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #e2e8f0;
  }

  &::before {
    margin-right: 1em;
  }

  &::after {
    margin-left: 1em;
  }
`;

export const CsvUploadTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  color: #1e293b;
  margin-bottom: 24px;
`;

export const CsvInputWrapper = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

export const CsvLabel = styled.label`
  flex: 1;
  padding: 12px 16px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  text-align: center;
  color: #64748b;
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    border-color: #10b981;
    color: #059669;
  }
`;

export const CsvResultCard = styled.div`
  margin-top: 24px;
  padding: 24px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
`;

export const ErrorList = styled.ul`
  margin-top: 12px;
  padding-left: 20px;
  color: #dc2626;

  li {
    margin-bottom: 4px;
  }
`;

// Re-export Button
export { Button };

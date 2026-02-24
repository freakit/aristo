import styled from "styled-components";
import { Container } from "@/common/styles/GlobalStyles";

export const PageContainer = styled(Container)`
  min-width: auto;
  height: 100vh;
  min-height: unset;
  overflow-y: auto;
`;

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }
`;

export const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  background: #10b981;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
`;

export const HeaderText = styled.div``;

export const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

export const PageSubtitle = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
`;

export const WelcomeSection = styled.div`
  margin-bottom: 32px;
  padding: 32px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: center;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #10b981;
  }
`;

export const WelcomeTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1a1a1a;
`;

export const WelcomeMessage = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0;
`;

// Calibration Section (v4.4 Original Design)
export const CalibrationSection = styled.div`
  margin-bottom: 32px;
  padding: 24px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const CalibrationInfo = styled.div`
  flex: 1;
`;

export const CalibrationTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1a1a1a;
`;

export const CalibrationDescription = styled.p`
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
  color: #6b7280;
`;

export const CalibrationButton = styled.button<{ $isCalibrated?: boolean }>`
  padding: 12px 24px;
  font-weight: 600;
  white-space: nowrap;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$isCalibrated ? "#10b981" : "#2563eb")};
  color: white;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$isCalibrated ? "#059669" : "#1d4ed8")};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "";
    display: block;
    width: 4px;
    height: 24px;
    background: #10b981;
    border-radius: 2px;
  }
`;

export const ExamGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
`;

export const ExamCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
    border-color: #10b981;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

export const ExamStatus = styled.div<{ $status: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${(props) => {
    switch (props.$status) {
      case "active":
        return `
          background: #d1fae5;
          color: #059669;
        `;
      case "completed":
        return `
          background: #f1f5f9;
          color: #64748b;
        `;
      case "upcoming":
        return `
          background: #e0f2fe;
          color: #0284c7;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

export const ExamTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
  line-height: 1.4;
`;

export const ExamInfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

export const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #64748b;

  svg {
    width: 18px;
    height: 18px;
    color: #94a3b8;
  }
`;

export const StartButton = styled.button`
  width: 100%;
  padding: 14px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  &:disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
  margin-bottom: 32px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #475569;
    margin: 16px 0 8px 0;
  }

  p {
    color: #94a3b8;
    margin: 0;
  }
`;

export const LogoutButton = styled.button`
  padding: 10px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #f8fafc;
    color: #ef4444;
    border-color: #fee2e2;
  }
`;

export const ErrorMessage = styled.div`
  padding: 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  margin-bottom: 24px;
  text-align: center;
  font-weight: 500;
`;

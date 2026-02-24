import styled from "styled-components";
import { Container, Button } from "@/common/styles/GlobalStyles";

export const PageContainer = styled(Container)`
  min-width: auto;
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

export const StatusSection = styled.div`
  margin-bottom: 32px;
  padding: 40px;
  background: #10b981;
  border-radius: 8px;
  color: white;
  text-align: center;
`;

export const StatusTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
`;

export const StatusText = styled.p`
  font-size: 16px;
  margin: 0;
  font-weight: 500;
  opacity: 0.95;
`;

export const ContentArea = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

export const Section = styled.div`
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 32px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

export const SectionIcon = styled.div`
  width: 48px;
  height: 48px;
  background: #10b981;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

export const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

export const UploadArea = styled.div<{ isDragOver: boolean }>`
  border: 2px dashed ${(props) => (props.isDragOver ? "#10b981" : "#e2e8f0")};
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;

  &:hover {
    border-color: #10b981;
    background: #f0fdf4;
  }
`;

export const UploadIcon = styled.div`
  font-size: 48px;
  color: #94a3b8;
  margin-bottom: 16px;
`;

export const UploadTitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

export const UploadDescription = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
`;

export const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 20px;
`;

export const FileIconWrapper = styled.div`
  color: #10b981;
`;

export const FileName = styled.div`
  flex: 1;
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
`;

export const FileSize = styled.div`
  font-size: 14px;
  color: #64748b;
`;

export const UploadButton = styled(Button)<{ isUploading?: boolean }>`
  width: 100%;
  margin-top: 16px;
  position: relative;
  overflow: hidden;

  ${(props) =>
    props.isUploading &&
    `
    background: #f59e0b;
    cursor: not-allowed;
  `}
`;

export const ProgressBar = styled.div<{ progress: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.95);
  width: ${(props) => props.progress}%;
  transition: width 0.3s ease;
`;

export const StatusMessage = styled.div<{ type: "success" | "error" | "info" }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-top: 16px;
  font-weight: 500;

  ${(props) => {
    switch (props.type) {
      case "success":
        return `
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        `;
      case "error":
        return `
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        `;
      default:
        return `
          background: #f0f9ff;
          color: #0369a1;
          border: 1px solid #bae6fd;
        `;
    }
  }}
`;

export const NavigationSection = styled.div`
  text-align: center;
`;

export const NavigationButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  width: 100%;
  margin-bottom: 16px;
  background: #6366f1;

  &:hover {
    background: #4f46e5;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
  }
`;

export const NavigationDescription = styled.p`
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  text-align: center;
`;

export const HiddenFileInput = styled.input`
  display: none;
`;

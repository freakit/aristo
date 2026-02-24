import styled from "styled-components";

export const ShellContainer = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;
`;

export const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
`;

export const Sidebar = styled.div<{ $visible: boolean }>`
  width: ${(props) => (props.$visible ? "240px" : "0px")};
  background-color: white;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  order: 2;
  height: 100vh;
  overflow: hidden;
  transition: width 0.3s ease;
`;

export const SidebarContent = styled.div`
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const ExamListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 3px;
  }
`;

export const ExamListSection = styled.div`
  margin-bottom: 24px;
`;

export const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
`;

export const ExamItem = styled.div<{ $active: boolean; $disabled: boolean }>`
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: ${(props) => (props.$active ? "#eff6ff" : "transparent")};
  border: 1px solid ${(props) => (props.$active ? "#bfdbfe" : "transparent")};
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.$disabled ? 0.6 : 1)};
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.$disabled ? "transparent" : props.$active ? "#eff6ff" : "#f8fafc"};
  }
`;

export const ExamName = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StatusIcon = styled.div<{
  $status: "completed" | "pending" | "in_progress";
}>`
  color: ${(props) =>
    props.$status === "completed"
      ? "#10b981"
      : props.$status === "in_progress"
      ? "#3b82f6"
      : "#cbd5e1"};
`;

export const TrackingModalContainer = styled.div`
  background-color: white;
`;

export const UploadButtonContainer = styled.div`
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const UploadButton = styled.button`
  width: 100%;
  padding: 10px;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export const UploadProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: #e2e8f0;
`;

export const EmptyStateContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const StartInstruction = styled.p`
  margin-top: 16px;
  color: #64748b;
  font-size: 16px;
`;

export const StartSetButton = styled.button`
  padding: 12px 24px;
  font-size: 18px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 20px;
  font-weight: 600;
  transition: background-color 0.2s;

  &:hover {
    background-color: #059669;
  }
`;

export const SelectSectionMessage = styled.p`
  font-size: 18px;
  color: #64748b;
`;

export const LoadingMessage = styled.div`
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
`;

export const CameraFloatingWrapper = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  z-index: 1000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

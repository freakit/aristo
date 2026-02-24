import styled from "styled-components";
import { Container, Button, Input, Card, Badge } from "@/common/styles/GlobalStyles";

export const PageContainer = styled(Container)`
  padding-top: 120px;
  min-width: auto;
`;

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
`;

export const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  background: #333f66;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
`;

export const HeaderText = styled.div``;

export const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

export const PageSubtitle = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 200px;
  }
`;

export const ContentArea = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

export const StudentSearch = styled(Card)`
  padding: 24px;
  height: fit-content;
  background: #f3f4f6;
  border: 1.5px solid #e2e8f0;
  position: sticky;
  top: 100px;
`;

export const MainContent = styled.div`
  min-width: 0;
`;

export const FormGroup = styled.div`
  margin-bottom: 24px;
`;

export const Label = styled.label`
  font-weight: 700;
  color: #1e293b;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

export const LabelIcon = styled.span`
  font-size: 16px;
`;

export const RequiredMark = styled.span`
  color: #ef4444;
  font-weight: 700;
`;

export const StyledInput = styled(Input)`
  font-size: 16px;
  padding: 16px 20px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 16px 20px;
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

  &:focus {
    outline: none;
    border-color: #333f66;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

export const SearchInput = styled(StyledInput)`
  margin-bottom: 16px;
`;

export const StudentList = styled.div`
  max-height: 320px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
`;

export const StudentItem = styled.div<{ isSelected: boolean }>`
  padding: 16px;
  border: 1.5px solid ${(props) => (props.isSelected ? "#333f66" : "#e2e8f0")};
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#f0f9ff" : "#ffffff")};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${(props) => (props.isSelected ? "#f0f9ff" : "#f8fafc")};
    border-color: #333f66;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: #333f66;
    opacity: ${(props) => (props.isSelected ? 1 : 0)};
    transition: opacity 0.3s ease;
  }
`;

export const StudentName = styled.div`
  font-weight: 700;
  color: #1e293b;
  font-size: 16px;
  margin-bottom: 4px;
`;

export const StudentInfo = styled.div`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SelectedCounter = styled(Badge)`
  margin-top: 16px;
  width: 100%;
  justify-content: center;
  padding: 12px;
  font-size: 14px;
`;

export const SectionContainer = styled(Card)`
  padding: 24px;
  margin-bottom: 20px;
  border: 1.5px solid #e2e8f0;
  position: relative;

  &:hover {
    border-color: #cbd5e1;
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
`;

export const SectionTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SectionNumber = styled.span`
  background: #333f66;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
`;

export const RemoveSectionButton = styled(Button)`
  padding: 8px 12px;
  font-size: 12px;
`;

export const SimpleAddButton = styled.button`
  padding: 6px 12px;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;

  &:hover {
    background-color: #e5e7eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const AddSectionButton = styled(Button)`
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  font-size: 16px;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #f1f5f9;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
  }
`;

export const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  border-radius: 12px;

  &::before {
    content: "\26A0\FE0F";
    font-size: 16px;
  }
`;

export const SuccessMessage = styled.div`
  color: #059669;
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 12px;

  &::before {
    content: "\2705";
    font-size: 16px;
  }
`;

// Re-export Button
export { Button };

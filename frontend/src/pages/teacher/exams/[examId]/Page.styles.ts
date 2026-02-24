import styled from "styled-components";
import { Button, Input, Card, Badge } from "@/common/styles/GlobalStyles";
import { PageContainer as SharedPageContainer } from "@/common/components/layout/PageLayout";

export const PageContainer = styled(SharedPageContainer)`
  padding-top: 120px;
  min-width: auto;
`;

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
`;

export const HeaderContent = styled.div`
  flex: 1;
`;

export const HeaderIcon = styled.div`
  width: 64px;
  height: 64px;
  background: #333f66;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  margin-bottom: 16px;
`;

export const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

export const PageSubtitle = styled.div`
  color: #64748b;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  line-height: 1.4;
`;

export const StatBadge = styled(Badge)`
  font-weight: 600;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 200px;
  }
`;

export const ModifiedTag = styled.span`
  font-size: 0.75rem;
  color: #e11d48;
  background: #ffe4e6;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  cursor: pointer;
  font-weight: 600;
  &:hover {
    background: #fecdd3;
  }
`;

export const ContentArea = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  min-height: 60vh;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

export const LeftPanel = styled(Card)`
  padding: 28px;
  height: fit-content;
  background: #f3f4f6;
  border: 1.5px solid #e2e8f0;
  position: sticky;
  top: 100px;
`;

export const RightPanel = styled.div`
  min-width: 0;
`;

export const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const SectionIcon = styled.span`
  width: 32px;
  height: 32px;
  background: #333f66;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
`;

export const StudentList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 24px;

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

export const StudentItem = styled(Card)<{ isSelected?: boolean }>`
  padding: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#f0f9ff" : "#ffffff")};
  border: 1.5px solid ${(props) => (props.isSelected ? "#333f66" : "#e2e8f0")};
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
    border-color: #333f66;
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

export const StudentHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: left;
`;

export const StudentName = styled.div`
  font-weight: 700;
  color: #1e293b;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StudentIcon = styled.span`
  font-size: 20px;
`;

export const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

export const ViewButton = styled.button`
  background: #333f66;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 18px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
`;

export const InfoItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const SearchInput = styled(Input)`
  margin-bottom: 20px;
`;

export const AddStudentSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #e2e8f0;
`;

export const AvailableStudentsList = styled.div`
  max-height: 200px;
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

export const AvailableStudentItem = styled.div<{ isSelected: boolean }>`
  padding: 16px;
  border: 1.5px solid ${(props) => (props.isSelected ? "#333f66" : "#e2e8f0")};
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#f0f9ff" : "white")};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${(props) => (props.isSelected ? "#f0f9ff" : "#f8fafc")};
    border-color: #333f66;
    transform: translateY(-2px);
  }
`;

export const AvailableStudentName = styled.div`
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
`;

export const AvailableStudentInfo = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

export const SectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const SectionItem = styled(Card)`
  padding: 24px;
  background: #f3f4f6;
  border: 1.5px solid #e2e8f0;

  &:hover {
    border-color: #cbd5e1;
    transform: translateY(-2px);
  }
`;

export const SectionItemTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
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

export const MarkdownContainer = styled.div`
  line-height: 1.8;
  color: #374151;
  font-size: 15px;

  & ul {
    padding-left: 1.5em;
    margin-bottom: 1.2em;
  }

  & ol {
    padding-left: 1.5em;
    margin-bottom: 1.2em;
  }

  & h1,
  & h2,
  & h3,
  & h4,
  & h5 {
    margin: 1.5em 0 0.8em 0;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.3;
  }

  & h1 {
    font-size: 1.8em;
  }
  & h2 {
    font-size: 1.5em;
  }
  & h3 {
    font-size: 1.3em;
  }
  & h4 {
    font-size: 1.1em;
  }

  & p {
    margin-bottom: 1em;
    line-height: 1.7;
  }

  & strong {
    font-weight: 700;
    color: #1e293b;
  }

  & em {
    font-style: italic;
    color: #475569;
  }

  & code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "Fira Code", monospace;
    font-size: 0.9em;
    color: #db2777;
  }

  & blockquote {
    border-left: 4px solid #333f66;
    padding-left: 16px;
    margin: 16px 0;
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    font-style: italic;
  }
`;

export const AttachmentList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

export const AttachmentItem = styled(Badge)`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
`;

// QA 愿???ㅽ??쇰뱾
export const QAContainer = styled.div`
  height: 100%;
`;

export const QAHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
`;

export const QAHeaderContent = styled.div`
  flex: 1;
`;

export const StudentNameHeader = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const QAStats = styled.div`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  line-height: 1.6;
`;

export const BackButton = styled(Button)`
  font-size: 14px;
  padding: 10px 16px;
`;

export const QAList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const QASetItem = styled(Card)`
  padding: 24px;
  background: #f3f4f6;
  border: 1.5px solid #e2e8f0;
  border-left: 4px solid #333f66;
  position: relative;

  &:hover {
    border-color: #cbd5e1;
    border-left-color: #333f66;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  }
`;

export const QASetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const QASetNumber = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #333f66;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f0f9ff;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid #bae6fd;
`;

export const QASetTimestamp = styled.div`
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
`;

export const QuestionSection = styled.div`
  margin-bottom: 20px;
`;

export const AnswerSection = styled.div``;

export const QLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #333f66;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "?쨼";
    font-size: 16px;
  }
`;

export const ALabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #059669;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "?뫅?랅윃?;
    font-size: 16px;
  }
`;

export const QText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.6;
  background: #eff6ff;
  padding: 16px 20px;
  border-radius: 12px;
  border-left: 4px solid #333f66;
  border: 1.5px solid #bae6fd;
`;

export const AText = styled.div`
  font-size: 15px;
  color: #374151;
  line-height: 1.7;
  background: #f0fdf4;
  padding: 16px 20px;
  border-radius: 12px;
  border-left: 4px solid #059669;
  border: 1.5px solid #bbf7d0;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
`;

export const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.7;
`;

export const EmptyTitle = styled.h4`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #374151;
`;

export const EmptyDescription = styled.p`
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 24px;
`;

export const LoadingText = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #64748b;
`;

// Re-export Button
export { Button };

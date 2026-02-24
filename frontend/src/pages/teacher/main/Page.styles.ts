import styled from "styled-components";
import { Button } from "@/common/styles/GlobalStyles";
import { Link } from "react-router-dom";

// 메인 컨테이너 (사이드바 레이아웃에 맞춤)
export const DashboardContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  min-height: 100vh;
`;

// 헤더 섹션
export const PageHeader = styled.div`
  margin-bottom: 32px;
`;

export const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

export const PageSubtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

// 통계 섹션
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

export const StatCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

export const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

export const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const StatIcon = styled.div`
  font-size: 20px;
`;

export const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 8px;
`;

export const StatChange = styled.div<{ positive?: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${(props) => (props.positive ? "#10b981" : "#6b7280")};
`;

// 콘텐츠 섹션 (2:1 비율)
export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 40px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

// 최근 시험 섹션
export const Section = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
`;

export const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
`;

export const ViewAllLink = styled(Link)`
  font-size: 14px;
  font-weight: 500;
  color: #333f66;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

// 최근 시험 아이템
export const RecentExamsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const ExamItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
  }
`;

export const ExamInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ExamName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ExamMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

export const ExamActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

export const SmallButton = styled(Button)`
  font-size: 12px;
  padding: 6px 12px;
`;

// 빠른 액션 섹션
export const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const ActionButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #333f66;
  }
`;

export const ActionIcon = styled.div`
  width: 40px;
  height: 40px;
  background: #333f66;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

export const ActionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ActionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
`;

export const ActionDescription = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

// 로딩 상태
export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 24px;
`;

export const LoadingText = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
`;

// 빈 상태
export const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
`;

export const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

export const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

export const EmptyDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
`;

// Re-export Button for use in Page.tsx
export { Button };

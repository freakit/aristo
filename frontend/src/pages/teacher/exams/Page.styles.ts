import styled from "styled-components";
import { Button, Input } from "@/common/styles/GlobalStyles";

// 메인 컨테이너
export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  min-height: 100vh;
`;

// 페이지 헤더
export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

export const HeaderLeft = styled.div``;

export const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
`;

export const PageSubtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

export const HeaderRight = styled.div`
  display: flex;
  gap: 12px;
`;

// 컨트롤 바 (검색 + 필터)
export const ControlBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const SearchWrapper = styled.div`
  flex: 1;
  max-width: 400px;
  position: relative;
`;

export const SearchInput = styled(Input)`
  padding-left: 40px;
  background: #ffffff;
`;

export const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 16px;
`;

export const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const FilterButton = styled.button<{ isActive: boolean }>`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid ${(props) => (props.isActive ? "#333f66" : "#e5e7eb")};
  background: ${(props) => (props.isActive ? "#333f66" : "#ffffff")};
  color: ${(props) => (props.isActive ? "#ffffff" : "#6b7280")};
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #333f66;
    color: ${(props) => (props.isActive ? "#ffffff" : "#333f66")};
  }
`;

// 테이블 컨테이너
export const TableContainer = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHead = styled.thead`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

export const TableHeader = styled.th`
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
`;

// 세트 구분용 헤더 행 스타일
export const SetHeaderRow = styled.tr`
  background-color: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;

  &:hover {
    background-color: #f3f4f6; /* hover 효과 제거 */
  }
`;

export const SetHeaderCell = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #333f66;
  background-color: #eff6ff; /* 연한 파란색 배경 */
  border-left: 4px solid #333f66; /* 왼쪽 강조선 */
`;

export const TableCell = styled.td`
  padding: 16px;
  font-size: 14px;
  color: #1a1a1a;
  vertical-align: middle;
`;

export const ExamName = styled.div`
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

export const ExamMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

export const SmallButton = styled(Button)`
  font-size: 12px;
  padding: 6px 12px;
`;

// 로딩 & 빈 상태
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

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

export const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.5;
`;

export const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
`;

export const EmptyDescription = styled.p`
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
`;

// 페이지네이션
export const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

export const PageButton = styled.button<{ isActive?: boolean }>`
  border: 1px solid ${(props) => (props.isActive ? "#333f66" : "#e5e7eb")};
  background-color: ${(props) => (props.isActive ? "#333f66" : "white")};
  color: ${(props) => (props.isActive ? "white" : "#6b7280")};
  border-radius: 6px;
  min-width: 36px;
  height: 36px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #333f66;
    color: white;
    border-color: #333f66;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
    background-color: #f9fafb;
  }
`;

// Re-export Button
export { Button };

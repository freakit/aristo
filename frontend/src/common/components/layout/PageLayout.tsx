import styled from "styled-components";

export const PageContainer = styled.div`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

export const PageHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
`;

export const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
`;

export const PageSubtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
`;

export const HeaderAction = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

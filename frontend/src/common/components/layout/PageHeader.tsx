// src/common/components/PageHeader.tsx

import React from 'react';
import styled from 'styled-components';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const Container = styled.div`
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

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  background: #333f66;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  box-shadow: 0 8px 25px rgba(51, 63, 102, 0.3);
`;

const HeaderText = styled.div``;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #64748b;
  margin: 4px 0 0 0;
  font-weight: 500;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
`;

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
}) => {
  return (
    <Container>
      <HeaderContent>
        {icon && <HeaderIcon>{icon}</HeaderIcon>}
        <HeaderText>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </HeaderText>
      </HeaderContent>
      {actions && <Actions>{actions}</Actions>}
    </Container>
  );
};

export default PageHeader;


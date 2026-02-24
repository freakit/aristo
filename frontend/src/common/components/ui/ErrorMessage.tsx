// src/common/components/ErrorMessage.tsx

import React from 'react';
import styled from 'styled-components';

interface ErrorMessageProps {
  message: string;
  variant?: 'inline' | 'block';
}

const InlineError = styled.span`
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
`;

const BlockError = styled.div`
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
  text-align: center;
`;

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  variant = 'inline',
}) => {
  if (variant === 'block') {
    return <BlockError>{message}</BlockError>;
  }
  return <InlineError>{message}</InlineError>;
};

export default ErrorMessage;


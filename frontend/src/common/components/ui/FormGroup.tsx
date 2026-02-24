// src/common/components/FormGroup.tsx

import React from 'react';
import styled from 'styled-components';

interface FormGroupProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const Label = styled.label<{ $required?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  
  ${props => props.$required && `
    &::after {
      content: ' *';
      color: #ef4444;
    }
  `}
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
`;

const FormGroup: React.FC<FormGroupProps> = ({
  label,
  htmlFor,
  error,
  required,
  children,
}) => {
  return (
    <Container>
      {label && (
        <Label htmlFor={htmlFor} $required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

export default FormGroup;


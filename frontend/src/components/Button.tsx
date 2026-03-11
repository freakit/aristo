import React from 'react'
import styled, { css } from 'styled-components'
import { theme } from '../styles/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const base = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: ${theme.fonts.sans};
  font-weight: 500;
  letter-spacing: 0.01em;
  border-radius: ${theme.radii.md};
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const variants = {
  primary: css`
    background: ${theme.colors.accent};
    color: #fff;
    border-color: ${theme.colors.accent};
    &:hover:not(:disabled) { background: ${theme.colors.accentHover}; border-color: ${theme.colors.accentHover}; }
  `,
  secondary: css`
    background: ${theme.colors.bgCard};
    color: ${theme.colors.textPrimary};
    border-color: ${theme.colors.border};
    &:hover:not(:disabled) { background: ${theme.colors.bgHover}; border-color: ${theme.colors.borderLight}; }
  `,
  ghost: css`
    background: transparent;
    color: ${theme.colors.textSecondary};
    border-color: transparent;
    &:hover:not(:disabled) { background: ${theme.colors.bgHover}; color: ${theme.colors.textPrimary}; }
  `,
  danger: css`
    background: transparent;
    color: ${theme.colors.error};
    border-color: ${theme.colors.error};
    &:hover:not(:disabled) { background: ${theme.colors.error}; color: #fff; }
  `,
}

const sizes = {
  sm: css`padding: 6px 12px; font-size: 13px; height: 32px;`,
  md: css`padding: 9px 18px; font-size: 14px; height: 40px;`,
  lg: css`padding: 12px 24px; font-size: 15px; height: 48px;`,
}

const StyledButton = styled.button<{ $variant: Variant; $size: Size; $fullWidth?: boolean }>`
  ${base}
  ${p => variants[p.$variant]}
  ${p => sizes[p.$size]}
  ${p => p.$fullWidth && 'width: 100%;'}
`

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </StyledButton>
  )
}

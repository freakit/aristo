import React from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

interface LogoProps {
  dark?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const Wrapper = styled.div<{ size: string }>`
  display: flex;
  align-items: center;
  gap: ${(p: any) => p.size === 'lg' ? '12px' : '8px'};
  cursor: pointer;
`

const Mark = styled.div<{ size: string; dark?: boolean }>`
  width: ${(p: any) => p.size === 'lg' ? '36px' : p.size === 'sm' ? '24px' : '30px'};
  height: ${(p: any) => p.size === 'lg' ? '36px' : p.size === 'sm' ? '24px' : '30px'};
  border: 2px solid ${(p: any) => p.dark ? theme.colors.black : theme.colors.white};
  border-radius: ${theme.radii.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &::after {
    content: 'A';
    font-family: ${theme.fonts.display};
    font-size: ${(p: any) => p.size === 'lg' ? '20px' : p.size === 'sm' ? '13px' : '16px'};
    font-weight: 300;
    color: ${(p: any) => p.dark ? theme.colors.black : theme.colors.white};
    font-style: italic;
  }
`

const LogoName = styled.span<{ size: string; dark?: boolean }>`
  font-family: ${theme.fonts.sans};
  font-size: ${(p: any) => p.size === 'lg' ? '22px' : p.size === 'sm' ? '14px' : '18px'};
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${(p: any) => p.dark ? theme.colors.black : theme.colors.white};
`

export const Logo: React.FC<LogoProps> = ({ dark = false, size = 'md' }) => {
  return (
    <Wrapper size={size}>
      <Mark size={size} dark={dark} />
      <LogoName size={size} dark={dark}>Aristo</LogoName>
    </Wrapper>
  )
}

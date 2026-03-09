import React from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: string
}

export const Card = styled.div<{ padding?: string }>`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  padding: ${p => p.padding || '24px'};
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${theme.colors.border};
`

export const CardTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  letter-spacing: -0.01em;
`

export const PageLayout = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 32px;
  min-height: calc(100vh - 60px);
`

export const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`

export const PageSubtitle = styled.p`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  margin-bottom: 32px;
`

export const Badge = styled.span<{ color?: 'blue' | 'green' | 'yellow' | 'gray' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  font-family: ${theme.fonts.mono};
  background: ${p => {
    switch(p.color) {
      case 'blue': return 'rgba(37,99,235,0.15)'
      case 'green': return 'rgba(22,163,74,0.15)'
      case 'yellow': return 'rgba(217,119,6,0.15)'
      default: return 'rgba(255,255,255,0.08)'
    }
  }};
  color: ${p => {
    switch(p.color) {
      case 'blue': return theme.colors.accentLight
      case 'green': return theme.colors.successLight
      case 'yellow': return '#F59E0B'
      default: return theme.colors.textSecondary
    }
  }};
`

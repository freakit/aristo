import React from 'react'
import styled from 'styled-components'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import { theme } from '../styles/theme'

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  height: 60px;
  background: ${theme.colors.bg};
  border-bottom: 1px solid ${theme.colors.border};
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 24px;
`

const Left = styled.div`
  display: flex;
  align-items: center;
  min-width: 160px;
`

const Center = styled.nav`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`

const Right = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 160px;
`

const LogoMark = styled.div`
  width: 28px; height: 28px;
  border: 1.5px solid rgba(255,255,255,0.7);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.fonts.display};
  font-size: 15px;
  font-style: italic;
  font-weight: 300;
  color: #fff;
  margin-right: 8px;
  flex-shrink: 0;
`

const LogoText = styled.span`
  font-size: 16px;
  font-weight: 500;
  color: ${theme.colors.textPrimary};
  letter-spacing: -0.01em;
`

const NavItem = styled.button<{ active?: boolean }>`
  padding: 6px 14px;
  border-radius: ${theme.radii.md};
  font-size: 13px;
  font-weight: 500;
  font-family: ${theme.fonts.sans};
  color: ${(p: any) => p.active ? theme.colors.textPrimary : theme.colors.textSecondary};
  background: ${(p: any) => p.active ? theme.colors.bgHover : 'transparent'};
  border: 1px solid ${(p: any) => p.active ? theme.colors.border : 'transparent'};
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: ${theme.colors.textPrimary};
    background: ${theme.colors.bgHover};
  }

  .step-num {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: ${(p: any) => p.active ? theme.colors.accent : theme.colors.bgCard};
    border: 1px solid ${(p: any) => p.active ? theme.colors.accent : theme.colors.border};
    color: ${(p: any) => p.active ? '#fff' : theme.colors.textMuted};
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${theme.fonts.mono};
    transition: all 0.15s;
    flex-shrink: 0;
  }
`

const LogoutBtn = styled.button`
  padding: 6px 14px;
  border-radius: ${theme.radii.md};
  font-size: 13px;
  font-weight: 500;
  font-family: ${theme.fonts.sans};
  color: ${theme.colors.textSecondary};
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { color: ${theme.colors.textPrimary}; background: ${theme.colors.bgHover}; }
`

const navItems = [
  { path: '/upload', label: 'Upload Materials', step: '1' },
  { path: '/aim', label: 'Set Goals', step: '2' },
  { path: '/study', label: 'Study', step: '3' },
]

export const AppHeader: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <Header>
      <Left>
        <div onClick={() => navigate('/upload')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <LogoMark>A</LogoMark>
          <LogoText>Aristo</LogoText>
        </div>
      </Left>

      <Center>
        {navItems.map(item => (
          <NavItem key={item.path} active={location.pathname === item.path} onClick={() => navigate(item.path)}>
            <span className="step-num">{item.step}</span>
            {item.label}
          </NavItem>
        ))}
      </Center>

      <Right>
        <LogoutBtn onClick={() => { logout(); navigate('/') }}>Log Out</LogoutBtn>
      </Right>
    </Header>
  )
}

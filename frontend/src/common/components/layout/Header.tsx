// src/components/Header.tsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@/common/styles/GlobalStyles";
import { useAuth } from "@/common/contexts/AuthContext";
import { useTranslation } from "@/common/i18n";

// 레이아웃 래퍼
const LayoutWrapper = styled.div`
  display: flex;
  min-height: 100vh;
`;

// 사이드바 (왼쪽 고정)
const Sidebar = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  z-index: 1000;

  @media (max-width: 768px) {
    display: none;
  }
`;

// 사이드바 헤더 (로고 영역)
const SidebarHeader = styled.div`
  padding: 24px 20px;
  border-bottom: 1px solid #f3f4f6;
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
`;

const Logo = styled.div`
  width: 36px;
  height: 36px;
  background: #333f66;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 24px;
    height: 24px;
    filter: brightness(0) invert(1);
  }
`;

const BrandName = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.3px;
`;

// 네비게이션 영역
const Navigation = styled.nav`
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
`;

const NavSection = styled.div`
  margin-bottom: 24px;
`;

const NavSectionTitle = styled.div`
  padding: 8px 20px;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NavLink = styled(Link)<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${(props) => (props.$isActive ? "#333f66" : "#6b7280")};
  background: ${(props) =>
    props.$isActive ? "rgba(51, 63, 102, 0.08)" : "transparent"};
  border-left: 3px solid
    ${(props) => (props.$isActive ? "#333f66" : "transparent")};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: #333f66;
    background: rgba(51, 63, 102, 0.04);
  }
`;

const NavIcon = styled.span`
  font-size: 16px;
  width: 20px;
  text-align: center;
`;

// 사이드바 푸터 (유저 정보)
const SidebarFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #1a1a1a;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.div`
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
`;

const LogoutButton = styled(Button)`
  width: 100%;
  justify-content: center;
`;

// 메인 컨텐츠 영역
const MainContent = styled.div`
  margin-left: 240px;
  flex: 1;
  min-height: 100vh;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

interface HeaderProps {
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const isActive = (path: string) => {
    if (path === "/main") {
      return location.pathname === "/" || location.pathname === "/main";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(t("header.logoutError"), error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <LayoutWrapper>
      {user && (
        <Sidebar>
          <SidebarHeader>
            <LogoLink to="/">
              <Logo>
                <img src="/logo_only.png" alt="ARISTO" />
              </Logo>
              <BrandName>ARISTO</BrandName>
            </LogoLink>
          </SidebarHeader>

          <Navigation>
            <NavSection>
              <NavSectionTitle>Main</NavSectionTitle>
              <NavLink to="/main" $isActive={isActive("/main")}>
                <NavIcon>{"\uD83C\uDFE0"}</NavIcon>
                {t("header.nav.home")}
              </NavLink>
              <NavLink to="/exams" $isActive={isActive("/exams")}>
                <NavIcon>{"\uD83D\uDCDD"}</NavIcon>
                {t("header.nav.exams")}
              </NavLink>
              <NavLink to="/students" $isActive={isActive("/students")}>
                <NavIcon>{"\uD83D\uDC64"}</NavIcon>
                {t("header.nav.students")}
              </NavLink>
              <NavLink to="/rag" $isActive={isActive("/rag")}>
                <NavIcon>{"\uD83D\uDDA5"}</NavIcon>
                RAG Settings
              </NavLink>
            </NavSection>
          </Navigation>

          <SidebarFooter>
            <UserCard>
              <UserAvatar>{getInitials(user.name)}</UserAvatar>
              <UserInfo>
                <UserName>{user.name}</UserName>
                <UserRole>{user.role}</UserRole>
              </UserInfo>
            </UserCard>
            <LogoutButton variant="ghost" onClick={handleLogout} size="small">
              {t("header.logout")}
            </LogoutButton>
          </SidebarFooter>
        </Sidebar>
      )}

      <MainContent>{children}</MainContent>
    </LayoutWrapper>
  );
};

export default Header;

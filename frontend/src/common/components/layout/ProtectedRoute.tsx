// src/components/ProtectedRoute.tsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "@/common/contexts/AuthContext";
import { LoadingSpinner } from "@/common/styles/GlobalStyles";
import { useTranslation } from "@/common/i18n"; // Import useTranslation
// 로딩 ?�면 ?��???
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8f9fa;
  gap: 24px;
`;

const LoadingText = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #64748b;
  text-align: center;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const Logo = styled.div`
  width: 48px;
  height: 48px;
  background: #333f66;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);

  img {
    width: 32px;
    height: 32px;
    filter: brightness(0) invert(1);
  }
`;

const BrandName = styled.div`
  font-size: 24px;
  font-weight: 700;
  background: #333f66;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

// ProtectedRoute component props
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation(); // Initialize the translation hook
  const location = useLocation();

  // While loading
  if (loading) {
    return (
      <LoadingContainer>
        <LogoContainer>
          <Logo>
            <img src="/logo_only.png" alt="ARISTO" />
          </Logo>
          <BrandName>ARISTO</BrandName>
        </LogoContainer>
        <LoadingSpinner size="large" />
        <LoadingText>{t("protectedRoute.loadingText")}</LoadingText>
      </LoadingContainer>
    );
  }

  // If not logged in, redirect to the login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in, render children
  return <div>{children}</div>;
};

export default ProtectedRoute;

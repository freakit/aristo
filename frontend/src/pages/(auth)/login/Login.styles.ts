import styled from "styled-components";
import { Button } from "@/common/styles/GlobalStyles";

// 로그인 컨테이너 (전체 화면 중앙 정렬)
export const LoginContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8f9fa;
`;

// 로그인 카드
export const LoginCard = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: relative;

  // 상단 보더 강조
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #333f66;
  }
`;

// 로고 영역
export const LogoSection = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

export const Logo = styled.div`
  width: 56px;
  height: 56px;
  background: #333f66;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  img {
    width: 36px;
    height: 36px;
    filter: brightness(0) invert(1);
  }
`;

export const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

export const Subtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

// 폼 영역
export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
`;

export const ErrorMessage = styled.div`
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
  text-align: center;
`;

export const SubmitButton = styled(Button)`
  width: 100%;
  justify-content: center;
  margin-top: 8px;
`;

// 추가 링크
export const Footer = styled.div`
  margin-top: 24px;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
`;

export const FooterText = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 0;
`;

export const FooterLink = styled.a`
  color: #333f66;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

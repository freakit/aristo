import styled, { keyframes } from "styled-components";
import { Container, Card, Button } from "@/common/styles/GlobalStyles";

export const modalFadeIn = keyframes`
  from { opacity: 0; } to { opacity: 1; }
`;

export const LoginContainer = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8f9fa;
`;

export const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #10b981;
  }
`;

export const LogoSection = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

export const BrandTitle = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: #1e293b;
`;

export const FormTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  margin-bottom: 24px;
`;

export const FormGroup = styled.div`
  margin-bottom: 24px;
`;

export const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
`;

export const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
`;

export const LoginButton = styled(Button)`
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
`;

export const FooterSection = styled.div`
  text-align: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
`;

export const FooterText = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0;
`;

export const FooterLink = styled.button`
  color: #10b981;
  font-weight: 600;
  text-decoration: none;
  border: none;
  background: none;
  cursor: pointer;
  font-size: inherit;
  &:hover {
    color: #059669;
    text-decoration: underline;
  }
`;

export const CheckboxWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  margin-top: 16px;
  gap: 8px;
`;

export const Checkbox = styled.input`
  margin: 0;
  flex-shrink: 0;
  margin-top: 2px;
`;

export const ConsentLabel = styled.label`
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const TermsLink = styled.a`
  color: #10b981;
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;

  &:hover {
    color: #059669;
    text-decoration: underline;
  }
`;

export const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: ${(props) => (props.$isOpen ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  animation: ${modalFadeIn} 0.3s ease-out;
`;

export const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

export const ModalTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 24px;
`;

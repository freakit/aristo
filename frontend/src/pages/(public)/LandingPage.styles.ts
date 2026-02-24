import styled, { keyframes, css } from "styled-components";
import { Link } from "react-router-dom";

// Animations
export const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Global Container (Solid Black)
export const LandingContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
  overflow-x: hidden;
`;

// Floating Header
export const Header = styled.header`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 1200px;
  height: 64px;
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-primary);
  border-radius: 100px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--text-secondary);
    background: rgba(10, 10, 10, 0.95);
  }
`;

export const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
`;

export const Logo = styled.div`
  width: 32px;
  height: 32px;
  background: var(--text-primary);
  border-radius: 6px; /* Slightly rounded square */
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 20px;
    height: 20px;
    filter: invert(1); /* Black logo on white background */
  }
`;

export const BrandInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const Title = styled.h1`
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
`;

// Right-Aligned Login Buttons
export const LoginButtons = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 568px) {
    display: none;
  }
`;

const ButtonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 100px; /* Pill shape */
  transition: all 0.2s ease;
  text-decoration: none;
  cursor: pointer;
`;

export const TeacherLoginButton = styled(Link)`
  ${ButtonBase}
  color: var(--text-secondary);
  background: transparent;

  &:hover {
    color: var(--text-primary);
  }
`;

export const StudentLoginButton = styled(Link)`
  ${ButtonBase}
  background: var(--text-primary);
  color: var(--bg-primary);
  border: 1px solid var(--text-primary);

  &:hover {
    background: transparent;
    color: var(--text-primary);
  }
`;

// Language Switcher (Optional, can be added to header)
export const LangButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  
  &:hover {
    color: var(--text-primary);
  }
`;


// Hero Section
export const HeroSection = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160px 5% 80px;
  position: relative;
  text-align: center;
`;

export const HeroContent = styled.div`
  max-width: 900px;
  z-index: 1;
  animation: ${fadeInUp} 0.8s ease-out;
`;

export const HeroTitle = styled.h1`
  font-size: 80px;
  font-weight: 800;
  margin-bottom: 32px;
  line-height: 1.1;
  letter-spacing: -3px;
  color: var(--text-primary);

  span {
    color: var(--accent-primary); /* Solid Blue */
  }

  @media (max-width: 768px) {
    font-size: 48px;
    letter-spacing: -1.5px;
  }
`;

export const HeroSubtitle = styled.p`
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 40px;
  color: var(--text-secondary);
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

export const HeroDescription = styled.div`
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 48px;
  
  b {
    color: var(--text-primary);
    font-weight: 600;
  }
`;

export const LoginCTAButtons = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;

  @media (max-width: 568px) {
    flex-direction: column;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }
`;

export const TeacherCTAButton = styled(Link)`
  ${ButtonBase}
  font-size: 16px;
  padding: 14px 32px;
  background: transparent;
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  border-radius: 8px; /* Standard Button Shape here */

  &:hover {
    border-color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const StudentCTAButton = styled(Link)`
  ${ButtonBase}
  font-size: 16px;
  padding: 14px 32px;
  background: var(--accent-primary);
  color: white;
  border-radius: 8px;

  &:hover {
    background: #1d4ed8; /* Darker Blue */
    transform: translateY(-2px);
  }
`;

// Endorsement Section (Professor)
export const EndorsementSection = styled.section`
  padding: 120px 5%;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-primary);
  border-bottom: 1px solid var(--border-primary);
`;

export const EndorsementContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

export const QuoteMark = styled.div`
  font-size: 60px;
  color: var(--accent-primary);
  line-height: 1;
  margin-bottom: 24px;
`;

export const EndorsementQuote = styled.blockquote`
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0 0 40px;
  letter-spacing: -1px;
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

export const ProfessorProfile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const ProfessorName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
`;

export const ProfessorTitle = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
`;


// Theme Enforcement for Visibility
const theme = {
  bgPrimary: "var(--bg-primary)",
  bgSecondary: "#1c1c1c", // Slightly lighter for contrast
  border: "#404040", // Lighter border for visibility
  textSecondary: "#a3a3a3"
};

// Features Section (Bento Grid)
export const FeaturesSection = styled.section`
  padding: 120px 5%;
  background: var(--bg-primary);
`;

export const FeaturesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

export const SectionHeader = styled.div`
  margin-bottom: 80px;
  text-align: left;
`;

export const SectionTitle = styled.h2`
  font-size: 48px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 16px;
  letter-spacing: -2px;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

export const SectionSubtitle = styled.p`
  font-size: 20px;
  color: var(--text-secondary);
  max-width: 600px;
`;

export const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  /* Simplified Grid for consistency */
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Bento Card
export const FeatureCard = styled.div<{ $colSpan?: number }>`
  background: ${theme.bgSecondary};
  border: 1px solid ${theme.border};
  border-radius: 24px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition: all 0.3s ease;
  min-height: 320px; /* Enforce height consistency */
  
  /* Only apply colspan on desktop */
  @media (min-width: 1025px) {
    grid-column: span ${props => props.$colSpan || 1};
  }

  &:hover {
    border-color: var(--text-primary);
    background: #252525;
    transform: translateY(-4px);
  }
`;

export const FeatureIcon = styled.div`
  font-size: 40px;
  margin-bottom: 24px;
  color: var(--text-primary);
`;

export const FeatureTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
`;

export const FeatureDescription = styled.p`
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
`;

// Tech Specs Section (Replaces Stats)
export const TechSpecsSection = styled.section`
  padding: 100px 5%;
  border-top: 1px solid ${theme.border};
  border-bottom: 1px solid ${theme.border};
  background: var(--bg-primary);
`;

export const TechSpecsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

export const TechSpecsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  text-align: center;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 60px 40px;
  }

  @media (max-width: 568px) {
    grid-template-columns: 1fr;
  }
`;

export const TechSpecItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const TechSpecValue = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: var(--accent-primary);
  margin-bottom: 12px;
  font-family: monospace; /* Tech vibe */
`;

export const TechSpecLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
`;

export const TechSpecDesc = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
`;


// CTA Section
export const CTASection = styled.section`
  padding: 160px 5%;
  background: var(--bg-primary);
  text-align: center;
`;

export const CTAContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

export const CTATitle = styled.h2`
  font-size: 56px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 24px;
  letter-spacing: -2px;
`;

export const CTADescription = styled.p`
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 48px;
`;

export const SecondaryButton = styled.button`
  ${ButtonBase}
  font-size: 16px;
  padding: 14px 32px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  
  &:hover {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }
`;

// Footer
export const Footer = styled.footer`
  padding: 80px 5% 40px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-primary);
`;

export const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

export const FooterBrand = styled.div`
  font-size: 120px;
  font-weight: 900;
  color: var(--border-primary);
  letter-spacing: -8px;
  line-height: 1;
  margin-bottom: 60px;
  user-select: none;
  
  @media (max-width: 768px) {
    font-size: 60px;
    letter-spacing: -4px;
  }
`;

export const FooterLinks = styled.div`
  display: flex;
  gap: 40px;
  margin-bottom: 40px;
`;

export const FooterLink = styled.a`
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text-primary);
  }
`;

export const FooterLinkRouter = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text-primary);
  }
`;

export const FooterText = styled.div`
  font-size: 14px;
  color: var(--border-primary);
`;


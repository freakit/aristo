import React from "react";
// import { Link } from "react-router-dom"; // Link는 Styles에서 사용하거나 직접 사용 가능
import { useTranslation } from "@/common/i18n";
import * as S from "./LandingPage.styles";

const LandingPage: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = language === "ko" ? "en" : "ko";
    setLanguage(nextLang);
  };

  return (
    <S.LandingContainer>
      <S.Header>
        <S.LogoSection>
          <S.Logo>
            <img src="/logo_only.png" alt="ARISTO" />
          </S.Logo>
          <S.BrandInfo>
            <S.Title>ARISTO</S.Title>
          </S.BrandInfo>
        </S.LogoSection>

        {/* Floating Headers typically have buttons on the right as per request */}
        <S.LoginButtons>
          <S.LangButton onClick={toggleLanguage}>
            {language === "ko" ? "English" : "한국어"}
          </S.LangButton>
          <S.TeacherLoginButton to="/login">
            {t("landing.teacherLogin")}
          </S.TeacherLoginButton>
          <S.StudentLoginButton to="/student/login">
            {t("landing.studentLogin")}
          </S.StudentLoginButton>
        </S.LoginButtons>
      </S.Header>

      <S.HeroSection>
        <S.HeroContent>
          <S.HeroTitle
            dangerouslySetInnerHTML={{ __html: t("landing.heroTitle") }}
          />
          <S.HeroSubtitle
             dangerouslySetInnerHTML={{ __html: t("landing.heroSubtitle") }}
          />
          <S.HeroDescription
            dangerouslySetInnerHTML={{ __html: t("landing.heroDescription") }}
          />

          <S.LoginCTAButtons>
            <S.TeacherCTAButton to="/login">
              {t("landing.teacherStart")}
            </S.TeacherCTAButton>
            <S.StudentCTAButton to="/student/login">
              {t("landing.studentStart")}
            </S.StudentCTAButton>
          </S.LoginCTAButtons>
        </S.HeroContent>
      </S.HeroSection>

      <S.EndorsementSection>
        <S.EndorsementContainer>
          <S.QuoteMark>“</S.QuoteMark>
          <S.EndorsementQuote>
            {t("landing.endorsementQuote")}
          </S.EndorsementQuote>
          <S.ProfessorProfile>
            <S.ProfessorName>{t("landing.endorsementName")}</S.ProfessorName>
            <S.ProfessorTitle>{t("landing.endorsementTitle")}</S.ProfessorTitle>
          </S.ProfessorProfile>
        </S.EndorsementContainer>
      </S.EndorsementSection>

      <S.FeaturesSection id="features">
        <S.FeaturesContainer>
          <S.SectionHeader>
            <S.SectionTitle>{t("landing.featuresTitle")}</S.SectionTitle>
            <S.SectionSubtitle>{t("landing.featuresSubtitle")}</S.SectionSubtitle>
          </S.SectionHeader>

          <S.FeaturesGrid>
            {/* Bento Grid Layout - ColSpan props can be adjusted in styles */}
            <S.FeatureCard $colSpan={2}>
              <S.FeatureIcon>🎤</S.FeatureIcon>
              <S.FeatureTitle>{t("landing.feature1Title")}</S.FeatureTitle>
              <S.FeatureDescription>{t("landing.feature1Desc")}</S.FeatureDescription>
            </S.FeatureCard>

            <S.FeatureCard>
              <S.FeatureIcon>🧠</S.FeatureIcon>
              <S.FeatureTitle>{t("landing.feature2Title")}</S.FeatureTitle>
              <S.FeatureDescription>{t("landing.feature2Desc")}</S.FeatureDescription>
            </S.FeatureCard>

            <S.FeatureCard>
              <S.FeatureIcon>🔗</S.FeatureIcon>
              <S.FeatureTitle>{t("landing.feature3Title")}</S.FeatureTitle>
              <S.FeatureDescription>{t("landing.feature3Desc")}</S.FeatureDescription>
            </S.FeatureCard>

            <S.FeatureCard $colSpan={2}>
              <S.FeatureIcon>🛡️</S.FeatureIcon>
              <S.FeatureTitle>{t("landing.feature4Title")}</S.FeatureTitle>
              <S.FeatureDescription>{t("landing.feature4Desc")}</S.FeatureDescription>
            </S.FeatureCard>

            <S.FeatureCard $colSpan={2}>
              <S.FeatureIcon>📊</S.FeatureIcon>
              <S.FeatureTitle>{t("landing.feature5Title")}</S.FeatureTitle>
              <S.FeatureDescription>{t("landing.feature5Desc")}</S.FeatureDescription>
            </S.FeatureCard>

            <S.FeatureCard>
              <S.FeatureIcon>🚀</S.FeatureIcon>
              <S.FeatureTitle>{t("landing.feature6Title")}</S.FeatureTitle>
              <S.FeatureDescription>{t("landing.feature6Desc")}</S.FeatureDescription>
            </S.FeatureCard>
          </S.FeaturesGrid>
        </S.FeaturesContainer>
      </S.FeaturesSection>

      <S.TechSpecsSection>
        <S.TechSpecsContainer>
          <S.SectionHeader style={{ textAlign: "center", marginBottom: "60px" }}>
             <S.SectionTitle>{t("landing.techSpecsTitle")}</S.SectionTitle>
          </S.SectionHeader>
          <S.TechSpecsGrid>
            <S.TechSpecItem>
              <S.TechSpecValue>{t("landing.techSpec1Value")}</S.TechSpecValue>
              <S.TechSpecLabel>{t("landing.techSpec1Label")}</S.TechSpecLabel>
              <S.TechSpecDesc>{t("landing.techSpec1Desc")}</S.TechSpecDesc>
            </S.TechSpecItem>
            <S.TechSpecItem>
              <S.TechSpecValue>{t("landing.techSpec2Value")}</S.TechSpecValue>
              <S.TechSpecLabel>{t("landing.techSpec2Label")}</S.TechSpecLabel>
              <S.TechSpecDesc>{t("landing.techSpec2Desc")}</S.TechSpecDesc>
            </S.TechSpecItem>
            <S.TechSpecItem>
              <S.TechSpecValue>{t("landing.techSpec3Value")}</S.TechSpecValue>
              <S.TechSpecLabel>{t("landing.techSpec3Label")}</S.TechSpecLabel>
              <S.TechSpecDesc>{t("landing.techSpec3Desc")}</S.TechSpecDesc>
            </S.TechSpecItem>
            <S.TechSpecItem>
              <S.TechSpecValue>{t("landing.techSpec4Value")}</S.TechSpecValue>
              <S.TechSpecLabel>{t("landing.techSpec4Label")}</S.TechSpecLabel>
              <S.TechSpecDesc>{t("landing.techSpec4Desc")}</S.TechSpecDesc>
            </S.TechSpecItem>
          </S.TechSpecsGrid>
        </S.TechSpecsContainer>
      </S.TechSpecsSection>

      <S.CTASection>
        <S.CTAContainer>
          <S.CTATitle>{t("landing.ctaTitle")}</S.CTATitle>
          <S.CTADescription
            dangerouslySetInnerHTML={{ __html: t("landing.ctaDescription") }}
          />
          <S.SecondaryButton
             as="button"
             onClick={() => window.open("https://freakit.co.kr", "_blank")}
          >
            {t("landing.secondaryButton")}
          </S.SecondaryButton>
        </S.CTAContainer>
      </S.CTASection>

      <S.Footer>
        <S.FooterContainer>
          <S.FooterBrand>ARISTO</S.FooterBrand>
          
          <S.FooterLinks>
            <S.FooterLinkRouter to="/terms">{t("landing.terms")}</S.FooterLinkRouter>
            <S.FooterLinkRouter to="/privacy">{t("landing.privacy")}</S.FooterLinkRouter>
            <S.FooterLink href="mailto:freakit2025@gmail.com">{t("landing.contact")}</S.FooterLink>
          </S.FooterLinks>
          
          <S.FooterText>
            {t("landing.copyright")}<br />
            Powered by KAIST Freakit
          </S.FooterText>
        </S.FooterContainer>
      </S.Footer>
    </S.LandingContainer>
  );
};

export default LandingPage;



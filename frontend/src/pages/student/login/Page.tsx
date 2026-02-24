// src/pages/student/StudentLoginPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Input, Button } from "@/common/styles/GlobalStyles";
import { useStudentLoginLogic } from "./hooks/useStudentLoginLogic";
import * as S from "./StudentLogin.styles";

const StudentLoginPage: React.FC = () => {
  const {
    t,
    formData,
    setFormData,
    signupData,
    setSignupData,
    pwdChangeData,
    setPwdChangeData,
    errors,
    isSubmitting,
    showInfoModal,
    setShowInfoModal,
    modalMessage,
    modalTitle,
    showSignupModal,
    setShowSignupModal,
    showPasswordChangeModal,
    setShowPasswordChangeModal,
    handleInputChange,
    handleConsentChange,
    handleLogin,
    handleSignup,
    handlePasswordChange,
    allConsentsChecked,
  } = useStudentLoginLogic();

  return (
    <div>
      <S.LoginContainer>
        <S.LoginCard>
          <S.LogoSection>
            <S.BrandTitle>{t("studentLogin.portalTitle")}</S.BrandTitle>
          </S.LogoSection>
          <S.FormTitle>{t("studentLogin.pageTitle")}</S.FormTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <S.FormGroup>
              <S.Label>{t("common.schoolLabel")}</S.Label>
              <Input
                name="school"
                type="text"
                onChange={(e) => handleInputChange(e, setFormData)}
                placeholder={t("common.schoolPlaceholder")}
                value={formData.school}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.studentIdLabel")}</S.Label>
              <Input
                name="registrationNumber"
                type="text"
                onChange={(e) => handleInputChange(e, setFormData)}
                placeholder={t("common.studentIdPlaceholder")}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.passwordLabel")}</S.Label>
              <Input
                name="password"
                type="password"
                onChange={(e) => handleInputChange(e, setFormData)}
                placeholder={t("studentLogin.passwordPlaceholder")}
              />
            </S.FormGroup>
            <S.LoginButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.loginInProgress") : t("common.login")}
            </S.LoginButton>
          </form>
          <S.FooterSection>
            <S.FooterText>
              <S.FooterLink
                onClick={() => {
                  setShowSignupModal(true);
                }}
              >
                {t("common.signUp")}
              </S.FooterLink>{" "}
              |{" "}
              <S.FooterLink onClick={() => setShowPasswordChangeModal(true)}>
                {t("common.passwordChange")}
              </S.FooterLink>
            </S.FooterText>
          </S.FooterSection>
        </S.LoginCard>
      </S.LoginContainer>

      {/* Signup Modal */}
      <S.ModalOverlay
        $isOpen={showSignupModal}
        onClick={() => setShowSignupModal(false)}
      >
        <S.ModalContent onClick={(e) => e.stopPropagation()}>
          <S.ModalTitle>{t("signupModal.title")}</S.ModalTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
          >
            <S.FormGroup>
              <S.Label>{t("common.schoolLabel")}</S.Label>
              <Input
                name="school"
                placeholder="ex) KAIST"
                value={formData.school}
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.studentIdLabel")}</S.Label>
              <Input
                name="registrationNumber"
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.nameLabel")}</S.Label>
              <Input
                name="name"
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.emailLabel")}</S.Label>
              <Input
                name="email"
                type="email"
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.phoneLabel")}</S.Label>
              <Input
                name="phoneNumber"
                type="tel"
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.passwordLabel")}</S.Label>
              <Input
                name="password"
                type="password"
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.passwordConfirmLabel")}</S.Label>
              <Input
                name="confirmPassword"
                type="password"
                onChange={(e) => handleInputChange(e, setSignupData)}
              />
              {errors.confirmPassword && (
                <S.ErrorMessage>{errors.confirmPassword}</S.ErrorMessage>
              )}
            </S.FormGroup>
            <S.CheckboxWrapper>
              <S.Checkbox
                id="consentTerms"
                name="terms"
                type="checkbox"
                checked={signupData.consent.terms}
                onChange={handleConsentChange}
              />
              <S.ConsentLabel htmlFor="consentTerms">
                {t("signupModal.consentTerms")}
                <S.TermsLink
                  as={Link}
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("signupModal.viewTerms")}
                </S.TermsLink>
              </S.ConsentLabel>
            </S.CheckboxWrapper>
            <S.CheckboxWrapper>
              <S.Checkbox
                id="consentPrivacy"
                name="privacy"
                type="checkbox"
                checked={signupData.consent.privacy}
                onChange={handleConsentChange}
              />
              <S.ConsentLabel htmlFor="consentPrivacy">
                {t("signupModal.consentPrivacy")}
                <S.TermsLink
                  as={Link}
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("signupModal.viewPrivacy")}
                </S.TermsLink>
              </S.ConsentLabel>
            </S.CheckboxWrapper>
            <S.CheckboxWrapper>
              <S.Checkbox
                id="consentCollection"
                name="collection"
                type="checkbox"
                checked={signupData.consent.collection}
                onChange={handleConsentChange}
              />
              <S.ConsentLabel htmlFor="consentCollection">
                {t("signupModal.consentCollection")}
                <S.TermsLink
                  as={Link}
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("signupModal.viewCollection")}
                </S.TermsLink>
              </S.ConsentLabel>
            </S.CheckboxWrapper>
            {errors.consent && (
              <S.ErrorMessage>{errors.consent}</S.ErrorMessage>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !allConsentsChecked}
              style={{ width: "100%", marginTop: "16px" }}
            >
              {t("signupModal.submitButton")}
            </Button>
          </form>
        </S.ModalContent>
      </S.ModalOverlay>

      {/* Password Change Modal */}
      <S.ModalOverlay
        $isOpen={showPasswordChangeModal}
        onClick={() => setShowPasswordChangeModal(false)}
      >
        <S.ModalContent onClick={(e) => e.stopPropagation()}>
          <S.ModalTitle>{t("passwordChangeModal.title")}</S.ModalTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePasswordChange();
            }}
          >
            <S.FormGroup>
              <S.Label>{t("common.schoolLabel")}</S.Label>
              <Input
                name="school"
                placeholder="ex) KAIST"
                value={formData.school}
                onChange={(e) => handleInputChange(e, setPwdChangeData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("common.studentIdLabel")}</S.Label>
              <Input
                name="registrationNumber"
                onChange={(e) => handleInputChange(e, setPwdChangeData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("passwordChangeModal.currentPasswordLabel")}</S.Label>
              <Input
                name="currentPassword"
                type="password"
                onChange={(e) => handleInputChange(e, setPwdChangeData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("passwordChangeModal.newPasswordLabel")}</S.Label>
              <Input
                name="newPassword"
                type="password"
                onChange={(e) => handleInputChange(e, setPwdChangeData)}
              />
            </S.FormGroup>
            <S.FormGroup>
              <S.Label>{t("passwordChangeModal.confirmNewPasswordLabel")}</S.Label>
              <Input
                name="confirmNewPassword"
                type="password"
                onChange={(e) => handleInputChange(e, setPwdChangeData)}
              />
              {errors.confirmNewPassword && (
                <S.ErrorMessage>{errors.confirmNewPassword}</S.ErrorMessage>
              )}
            </S.FormGroup>
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ width: "100%", marginTop: "16px" }}
            >
              {t("passwordChangeModal.submitButton")}
            </Button>
          </form>
        </S.ModalContent>
      </S.ModalOverlay>

      {/* Generic Info/Error Modal */}
      <S.ModalOverlay
        $isOpen={showInfoModal}
        onClick={() => setShowInfoModal(false)}
      >
        <S.ModalContent onClick={(e) => e.stopPropagation()}>
          <S.ModalTitle>{modalTitle}</S.ModalTitle>
          <p style={{ textAlign: "center", marginBottom: "24px" }}>
            {modalMessage}
          </p>
          <Button
            onClick={() => setShowInfoModal(false)}
            style={{ width: "100%" }}
          >
            {t("common.confirm")}
          </Button>
        </S.ModalContent>
      </S.ModalOverlay>
    </div>
  );
};

export default StudentLoginPage;

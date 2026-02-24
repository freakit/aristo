import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/common/services/api/login";
import { signup } from "@/common/services/api/signup";
import { changeStudentPassword } from "@/common/services/api/changeStudentPassword";
import { useTranslation } from "@/common/i18n";

export const useStudentLoginLogic = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    school: "KAIST",
    registrationNumber: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    school: "KAIST",
    registrationNumber: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    consent: {
      terms: false,
      privacy: false,
      collection: false,
    },
  });

  const [pwdChangeData, setPwdChangeData] = useState({
    school: "KAIST",
    registrationNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    stateSetter: React.Dispatch<any>
  ) => {
    const { name, value } = e.target;
    stateSetter((prev: any) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSignupData((prev) => ({
      ...prev,
      consent: {
        ...prev.consent,
        [name]: checked,
      },
    }));
    if (errors.consent) setErrors((prev) => ({ ...prev, consent: "" }));
  };

  const validateAndSubmit = async (
    validator: () => boolean,
    submitAction: () => Promise<void>
  ) => {
    if (!validator()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      await submitAction();
    } catch (err: any) {
      setModalTitle(t("common.errorTitle"));
      setModalMessage(err.message || t("common.genericError"));
      setShowInfoModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const response = await login({
        school: formData.school,
        registrationNumber: formData.registrationNumber,
        password: formData.password,
      });
      console.log(response);

      if (
        response.status === "success" &&
        response.user &&
        response.sessionId
      ) {
        const studentData = { ...response.user, sessionId: response.sessionId };
        localStorage.setItem("currentStudent", JSON.stringify(studentData));
        navigate(`/student/session/${response.sessionId}/list`);
      } else {
        throw new Error(response.message || t("common.loginFailed"));
      }
    } catch (err: any) {
      setModalTitle(t("common.errorTitle"));
      setModalMessage(err.message || t("common.loginError"));
      setShowInfoModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = () =>
    validateAndSubmit(
      () => {
        const { password, confirmPassword, consent } = signupData;
        if (password !== confirmPassword) {
          setErrors({
            confirmPassword: t("signupModal.passwordMismatchError"),
          });
          return false;
        }
        if (!consent.terms || !consent.privacy || !consent.collection) {
          setErrors({ consent: t("signupModal.consentError") });
          return false;
        }
        return true;
      },
      async () => {
        const { consent, confirmPassword, ...payload } = signupData;
        await signup(payload);
        setModalTitle(t("signupModal.successTitle"));
        setModalMessage(t("signupModal.successMessage"));
        setShowInfoModal(true);
        setShowSignupModal(false);
      }
    );

  const handlePasswordChange = () =>
    validateAndSubmit(
      () => {
        if (pwdChangeData.newPassword !== pwdChangeData.confirmNewPassword) {
          setErrors({
            confirmNewPassword: t("passwordChangeModal.passwordMismatchError"),
          });
          return false;
        }
        return true;
      },
      async () => {
        const { confirmNewPassword, ...payload } = pwdChangeData;
        await changeStudentPassword(payload);
        setModalTitle(t("common.successTitle"));
        setModalMessage(t("passwordChangeModal.successMessage"));
        setShowInfoModal(true);
        setShowPasswordChangeModal(false);
      }
    );

  const allConsentsChecked =
    signupData.consent.terms &&
    signupData.consent.privacy &&
    signupData.consent.collection;

  return {
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
  };
};

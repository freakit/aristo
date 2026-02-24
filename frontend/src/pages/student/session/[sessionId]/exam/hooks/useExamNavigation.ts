import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useExamNavigation = () => {
  const navigate = useNavigate();

  const handleReloadPage = useCallback(() => {
    window.location.reload();
  }, []);

  return { navigate, handleReloadPage };
};

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkLoginStatus } from "@/common/services/student/checkLoginStatus";

/**
 * 학생의 로그인 상태를 확인하고 세션이 만료되었거나 정보가 없으면 로그인 페이지로 이동시킵니다.
 */
export const useAuthStatus = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem("currentStudent");

      if (!stored) {
        console.log("No student data found in localStorage");
        navigate("/student/login");
        return;
      }

      try {
        const student = JSON.parse(stored);
        const sessionId = student.sessionId;

        if (!sessionId) {
          console.log("No sessionId found in student data");
          navigate("/student/login");
          return;
        }

        const res = await checkLoginStatus({
          school: student.school,
          registrationNumber: student.registrationNumber,
          sessionId: sessionId,
        });
        console.log("res", res);

        if (!res.success || !res.data?.isLoggedIn) {
          localStorage.removeItem("currentStudent");
          navigate("/student/login");
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        navigate("/student/login");
      }
    };

    checkAuth();
  }, [navigate]);
};

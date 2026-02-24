// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTranslation } from "@/common/i18n"; // Import useTranslation
import {
  professorLogin,
  professorLogout,
  checkProfessorStatus,
} from "@/common/services/teacher/professorApi";

/* ───── User / Context Types ───── */
export interface UserProfile {
  id: number; // DB users.id
  email: string;
  name: string;
  role: "교수";
  sessionId: string; // 서버에서 내려준 세션 토큰
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/* ───── Create Context ───── */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const { t } = useTranslation(); // Initialize hook for error message
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error(t("authContext.useAuthError"));
  return ctx;
};

/* ───── Provider ───── */
interface AuthProviderProps {
  children: React.ReactNode;
}
const LS_KEY = "currentProfessor";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { t } = useTranslation(); // Initialize hook for user data and errors
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // 앱 부팅 시 localStorage → 서버 상태 검증
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;

    const cached: UserProfile = JSON.parse(raw);
    setUser(cached);

    // 비동기 검증(무시 가능한 실패)
    (async () => {
      try {
        const status = await checkProfessorStatus(
          cached.email,
          cached.sessionId,
        );
        if (!status?.isLoggedIn) {
          localStorage.removeItem(LS_KEY);
          setUser(null);
        }
      } catch {
        // 네트워크 오류 등은 일단 무시(다음 액션에서 재검증)
      }
    })();
  }, []);

  /** Login */
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: serverUser, sessionId } = await professorLogin({
        email,
        password,
      });
      // 방어적 클라이언트 체크(서버에서도 이미 isStudent=0 검증 가정)
      if (!serverUser || serverUser.isStudent !== 0) {
        throw new Error(t("auth.notProfessorAccount"));
      }

      const profile: UserProfile = {
        id: serverUser.id,
        email: serverUser.email,
        name: serverUser.name ?? "",
        role: "교수",
        sessionId,
      };

      setUser(profile);
      localStorage.setItem(LS_KEY, JSON.stringify(profile));
    } finally {
      setLoading(false);
    }
  };

  /** Logout */
  const logout = async () => {
    setLoading(true);
    try {
      if (user?.email) {
        await professorLogout(user.email); // 서버 세션 정리
      }
    } catch {
      // 서버 실패 시에도 클라이언트 상태는 정리
    } finally {
      localStorage.removeItem(LS_KEY);
      setUser(null);
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, login, logout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

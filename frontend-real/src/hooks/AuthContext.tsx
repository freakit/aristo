/**
 * AuthContext.tsx
 *
 * - 로그인/회원가입은 더미 방식(클릭 즉시 상태 변경) 유지
 * - Firebase onAuthStateChanged로 실제 Firebase 유저가 있으면 그 토큰 사용
 * - 더미 로그인 상태에서는 토큰 없이 요청 (개발/테스트용)
 * - getIdToken(): 실제 Firebase 유저 있으면 토큰 반환, 없으면 null
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

interface AuthContextType {
  isLoggedIn: boolean
  firebaseUser: User | null
  login: () => void
  logout: () => void
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 더미 로그인 상태 (로그인 버튼 클릭으로 제어)
  const [isDummyLoggedIn, setIsDummyLoggedIn] = useState(false)
  // 실제 Firebase 유저 (있으면 토큰 제공 가능)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [firebaseLoading, setFirebaseLoading] = useState(true)

  // Firebase Auth 상태 감지 (실제 Google 로그인 된 경우)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user)
      setFirebaseLoading(false)
      // Firebase 유저가 있으면 자동으로 로그인 상태로 설정
      if (user) {
        setIsDummyLoggedIn(true)
      }
    })
    return unsubscribe
  }, [])

  const login = () => setIsDummyLoggedIn(true)
  const logout = () => {
    setIsDummyLoggedIn(false)
    // Firebase 유저가 있으면 Firebase에서도 로그아웃
    if (firebaseUser) {
      firebaseAuth.signOut()
    }
  }

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return null
    try {
      return await firebaseUser.getIdToken()
    } catch {
      return null
    }
  }, [firebaseUser])

  const isLoggedIn = isDummyLoggedIn || !!firebaseUser

  // Firebase 초기 상태 로딩 중에는 children 렌더링 대기
  if (firebaseLoading) return null

  return (
    <AuthContext.Provider value={{ isLoggedIn, firebaseUser, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

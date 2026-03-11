/**
 * AuthContext.tsx
 *
 * - signInWithPopup(googleProvider) for actual Google sign-in
 * - onAuthStateChanged to maintain login state
 * - getIdToken(): Returns Firebase ID token (for backend authentication)
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth'
import { firebaseAuth, googleProvider } from '../lib/firebase'

interface AuthContextType {
  isLoggedIn: boolean
  firebaseUser: User | null
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Detect Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    await signInWithPopup(firebaseAuth, googleProvider)
  }

  const logout = async () => {
    await signOut(firebaseAuth)
  }

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return null
    try {
      return await firebaseUser.getIdToken()
    } catch {
      return null
    }
  }, [firebaseUser])

  const isLoggedIn = !!firebaseUser

  if (loading) return null

  return (
    <AuthContext.Provider value={{ isLoggedIn, firebaseUser, signInWithGoogle, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

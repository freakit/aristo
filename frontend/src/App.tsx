import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { UploadPage } from './pages/UploadPage'
import { AimPage } from './pages/AimPage'
import { StudyPage } from './pages/StudyPage'
import { AuthProvider, useAuth } from './hooks/AuthContext'
import { GlobalStyles } from './styles/GlobalStyles'

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />
}

const AppRoutes: React.FC = () => {
  const { isLoggedIn } = useAuth()
  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Navigate to="/upload" replace /> : <LandingPage />} />
      <Route path="/upload" element={<PrivateRoute><UploadPage /></PrivateRoute>} />
      <Route path="/aim" element={<PrivateRoute><AimPage /></PrivateRoute>} />
      <Route path="/study" element={<PrivateRoute><StudyPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <GlobalStyles />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

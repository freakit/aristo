// src/App.tsx

import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
  Navigate,
} from "react-router-dom";
import { GlobalStyle } from "@/common/styles/GlobalStyles";
import { AuthProvider, useAuth } from "@/common/contexts/AuthContext";
import Header from "./common/components/layout/Header";
import ProtectedRoute from "./common/components/layout/ProtectedRoute";

import { I18nProvider } from "@/common/i18n/I18nProvider";
import GlobalLanguageSwitcher from "./common/components/ui/GlobalLanguageSwitcher";

// Pages - Public
import LandingPage from "./pages/(public)/LandingPage";
import TermsOfServicePage from "./pages/(public)/TermsOfServicePage";

// Pages - Auth
import LoginPage from "./pages/(auth)/login/Page";

// Pages - Student
import StudentLoginPage from "./pages/student/login/Page";
import ExamSetShellPage from "./pages/student/session/[sessionId]/Layout";
import StudentExamListPage from "./pages/student/session/[sessionId]/list/Page";
import StudentAssistantPage from "./pages/student/session/[sessionId]/exam/Page";
import ExamCompletionPage from "./pages/student/session/[sessionId]/exam/complete/Page";

// Pages - Teacher
import MainPage from "./pages/teacher/main/Page";
import ExamListPage from "./pages/teacher/exams/Page";
import ExamFormPage from "./pages/teacher/exams/new/Page";
import ExamDetailPage from "./pages/teacher/exams/[examId]/Page";
import ExamReviewPage from "./pages/teacher/exams/[examId]/review/[studentId]/Page";
import StudentListPage from "./pages/teacher/students/Page";
import StudentFormPage from "./pages/teacher/students/new/Page";
import RagPage from "./pages/teacher/rag/Page";

// ------------------------------------------------------------------
// Layout Components
// ------------------------------------------------------------------

const ProtectedLayout = () => (
  <Header>
    <Outlet />
  </Header>
);

const RootLayout = () => {
  const location = useLocation();
  const showSwitcherPaths = ["/", "/login", "/student/login"];
  const shouldShowSwitcher = showSwitcherPaths.includes(location.pathname);

  return (
    <div>
      {shouldShowSwitcher && <GlobalLanguageSwitcher />}
      <Outlet />
    </div>
  );
};

// ------------------------------------------------------------------
// Router Configuration
// ------------------------------------------------------------------

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  const router = createBrowserRouter([
    {
      element: <RootLayout />,
      children: [
        // --- Public Routes ---
        { path: "/terms", element: <TermsOfServicePage /> },
        { path: "/student/login", element: <StudentLoginPage /> },

        // --- Student Exam Shell Routes ---
        {
          path: "/student/session/:sessionId",
          element: <ExamSetShellPage />,
          children: [
            { path: "list", element: <StudentExamListPage /> },
            // All exams (single or set) use unified /exam route
            // examSetId and examStudentId stored in localStorage
            { path: "exam", element: <StudentAssistantPage /> },
            {
              path: "exam/complete",
              element: <ExamCompletionPage />,
            },
          ],
        },

        // Legacy Redirect (optional)
        {
          path: "/student/list/:sessionId",
          element: <Navigate to="/student/session/:sessionId/list" replace />,
        },

        // --- Non-Login Routes ---
        {
          path: "/",
          element: !user ? <LandingPage /> : <Navigate to="/exams" replace />,
        },
        {
          path: "/login",
          element: !user ? <LoginPage /> : <Navigate to="/exams" replace />,
        },

        // --- Protected Routes (Teacher) ---
        {
          element: (
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          ),
          children: [
            { path: "/main", element: <MainPage /> },
            { path: "/exams", element: <ExamListPage /> },
            { path: "/exams/new", element: <ExamFormPage /> },
            { path: "/exams/:examId", element: <ExamDetailPage /> },
            { path: "/exams/:examId/edit", element: <ExamFormPage /> },
            {
              path: "/exams/:examId/review/:studentId",
              element: <ExamReviewPage />,
            },
            { path: "/students", element: <StudentListPage /> },
            { path: "/students/new", element: <StudentFormPage /> },
            { path: "/rag", element: <RagPage /> },
          ],
        },
        // Fallback
        {
          path: "*",
          element: <Navigate to={user ? "/exams" : "/"} replace />,
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <GlobalStyle />
        <div className="App">
          <AppRouter />
        </div>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;

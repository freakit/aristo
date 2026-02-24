import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Student } from "@/common/types";
import apiClient from "@/common/services/apiClient";
import { logout } from "./hooks/logout";
import { getExamSetsForStudent } from "./hooks/getExamSets";
import { useAuthStatus } from "@/common/hooks/useAuthStatus";
import { useTranslation, getLocale } from "@/common/i18n";
import StandaloneCalibration from "./components/StandaloneCalibration/StandaloneCalibration";
import { CalibrationData } from "./hooks/useCalibrationLogic";
import { formatLocalDateTime } from "@/common/utils/formatLocalDateTime";
import * as S from "./Page.styles";
import { LoadingSpinner } from "@/common/styles/GlobalStyles";
import { FiClock, FiSettings, FiLogOut, FiCheck, FiX } from "react-icons/fi";

// --- Types ---
interface ExamSetSummary {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  examIds: number[];
  completedExamIds: number[];
  status: "active" | "completed" | "upcoming" | "expired";
  studentId: number;
}

const StudentSessionListPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State
  const [student, setStudent] = useState<Student | null>(null);
  const [examSets, setExamSets] = useState<ExamSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calibration State
  const [showCalibration, setShowCalibration] = useState(false);
  const [selectedExamSetId, setSelectedExamSetId] = useState<string | null>(
    null,
  );
  const [isCalibrated, setIsCalibrated] = useState(false);

  // Auth Status Check
  useAuthStatus();

  // Clear exam state from localStorage when entering list page
  // This prevents exam UI from showing on the list page
  useEffect(() => {
    localStorage.removeItem("examStudentId");
    localStorage.removeItem("examSetId");
  }, []);

  // Check Calibration Status Helper
  const checkCalibrationStatus = useCallback(() => {
    if (!student?.registrationNumber) return false;

    try {
      const calibKey = `gaze_calib_${student?.registrationNumber}`;
      const stored = localStorage.getItem(calibKey);
      if (!stored) return false;

      const parsed = JSON.parse(stored);

      // Screen size check
      if (
        parsed.screenWidth !== window.innerWidth ||
        parsed.screenHeight !== window.innerHeight
      ) {
        console.log("Screen size changed, calibration invalid");
        localStorage.removeItem(calibKey);
        return false;
      }

      // Expiry check (6 hours)
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > SIX_HOURS) {
        console.log("Calibration expired (>6h)");
        localStorage.removeItem(calibKey);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Failed to check calibration:", err);
      return false;
    }
  }, [student?.registrationNumber]);

  // Load Data
  useEffect(() => {
    console.log(
      "StudentSessionListPage: useEffect mounted, sessionId=",
      sessionId,
    );
    const fetchData = async () => {
      try {
        console.log("StudentSessionListPage: fetchData started");
        const studentData = localStorage.getItem("currentStudent");
        // console.log(studentData);
        if (!studentData) {
          throw new Error(t("login.errors.loginRequired"));
        }
        const parsedStudent = JSON.parse(studentData);
        // console.log(parsedStudent);

        // Session ID validation
        console.log("Session Check:", {
          stored: parsedStudent.sessionId,
          param: sessionId,
        });
        if (parsedStudent.sessionId.toString() !== sessionId) {
          throw new Error(t("examList.errors.invalidSession"));
        }

        setStudent(parsedStudent);
        // console.log(parsedStudent.studentId);

        // Fetch Exam Sets
        console.log("Fetching exam sets for:", parsedStudent.studentId);
        const sets = await getExamSetsForStudent(parsedStudent.studentId!);
        console.log("Fetched sets:", sets);
        setExamSets(sets);

        setLoading(false);
        console.log("StudentSessionListPage: Loading complete");
      } catch (err: any) {
        console.error("Failed to load data:", err);
        setError(err.message || t("examList.errors.loadFailed"));
        setLoading(false);
        if (err.message === t("login.errors.loginRequired")) {
          navigate("/student/login");
        }
      }
    };

    fetchData();
  }, [sessionId, navigate, t]);

  // Update calibration status when student loads
  useEffect(() => {
    if (student) {
      setIsCalibrated(checkCalibrationStatus());
    }
  }, [student, checkCalibrationStatus]);

  // Handlers
  const handleLogout = async () => {
    if (!student) return;
    try {
      await logout({
        school: student.school || "",
        registrationNumber: student.registrationNumber || "",
      });
      localStorage.removeItem("currentStudent");
      navigate("/student/login");
    } catch (err) {
      console.error("Logout failed:", err);
      // Navigate anyway
      localStorage.removeItem("currentStudent");
      navigate("/student/login");
    }
  };

  const handleStartExamSet = (examSetId: string) => {
    if (!checkCalibrationStatus()) {
      setSelectedExamSetId(examSetId);
      setShowCalibration(true);
      return;
    }
    enterExamSet(examSetId);
  };

  const handleCalibrationComplete = (data: CalibrationData) => {
    console.log("Calibration completed:", data);
    setShowCalibration(false);
    setIsCalibrated(true);
    if (selectedExamSetId) {
      enterExamSet(selectedExamSetId);
      setSelectedExamSetId(null);
    }
  };

  const handleCalibrationCancel = () => {
    setShowCalibration(false);
    setSelectedExamSetId(null);
  };

  const handleManualCalibrationStart = () => {
    setShowCalibration(true);
    setSelectedExamSetId(null);
  };

  const enterExamSet = async (examSetId: string) => {
    const set = examSets.find((s) => s.id === examSetId);
    if (!set) return;

    const nextExamId = set.examIds.find(
      (id) => !set.completedExamIds.includes(id),
    );

    if (nextExamId) {
      try {
        setLoading(true);
        // apiClient.post returns T directly, throws on error
        if (!student) throw new Error("Student data missing");
        const res = await apiClient.post<{ examStudentId: number }>(
          `/api/exams/student/enter`,
          {
            studentId: student.studentId,
            examId: nextExamId,
          },
        );

        if (res?.examStudentId) {
          // Store examStudentId and examSetId in localStorage for session management
          localStorage.setItem("examStudentId", String(res.examStudentId));
          localStorage.setItem("examSetId", examSetId);
          navigate(`/student/session/${sessionId}/exam`);
        } else {
          throw new Error("Failed to enter exam - no examStudentId");
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    } else {
      alert("All exams in this set are completed.");
    }
  };

  if (loading) {
    return (
      <S.PageContainer>
        <LoadingSpinner />
      </S.PageContainer>
    );
  }

  if (showCalibration && student) {
    return (
      <StandaloneCalibration
        studentId={student.registrationNumber}
        onComplete={handleCalibrationComplete}
        onCancel={handleCalibrationCancel}
      />
    );
  }

  return (
    <S.PageContainer>
      <S.PageHeader>
        <S.HeaderContent>
          <S.HeaderIcon>
            <FiClock />
          </S.HeaderIcon>
          <S.HeaderText>
            <S.PageTitle>{t("examList.title")}</S.PageTitle>
            <S.PageSubtitle>
              {t("examList.welcome", { name: student?.name })}
            </S.PageSubtitle>
          </S.HeaderText>
        </S.HeaderContent>

        <S.LogoutButton onClick={handleLogout}>
          <FiLogOut /> {t("common.logout")}
        </S.LogoutButton>
      </S.PageHeader>

      <S.WelcomeSection>
        <S.WelcomeTitle>{t("examList.readyTitle")}</S.WelcomeTitle>
        <S.WelcomeMessage>{t("examList.readyMessage")}</S.WelcomeMessage>
      </S.WelcomeSection>

      <S.CalibrationSection>
        <S.CalibrationInfo>
          <S.CalibrationTitle>
            {isCalibrated
              ? t("examList.calibration.titleComplete")
              : t("examList.calibration.titleNeeded")}
          </S.CalibrationTitle>
          <S.CalibrationDescription>
            {isCalibrated
              ? t("examList.calibration.descriptionComplete")
              : t("examList.calibration.descriptionNeeded")}
          </S.CalibrationDescription>
        </S.CalibrationInfo>
        <S.CalibrationButton
          onClick={handleManualCalibrationStart}
          $isCalibrated={isCalibrated}
        >
          {isCalibrated
            ? t("examList.calibration.recalibrate")
            : t("examList.calibration.start")}
        </S.CalibrationButton>
      </S.CalibrationSection>

      {error && (
        <S.ErrorMessage>
          <FiX style={{ marginRight: 8 }} /> {error}
        </S.ErrorMessage>
      )}

      {examSets.length === 0 ? (
        <S.EmptyState>
          <S.HeaderIcon
            style={{
              margin: "0 auto 16px",
              background: "#f1f5f9",
              color: "#94a3b8",
            }}
          >
            <FiCheck />
          </S.HeaderIcon>
          <h3>{t("examList.emptyTitle")}</h3>
          <p>{t("examList.emptyMessage")}</p>
        </S.EmptyState>
      ) : (
        <>
          <S.SectionTitle>{t("examList.availableExams")}</S.SectionTitle>
          <S.ExamGrid>
            {examSets.map((set) => {
              const isExpired = set.status === "expired";
              const isUpcoming = set.status === "upcoming";
              const isCompleted = set.status === "completed";
              const canEnter = set.status === "active";

              const progress = Math.round(
                (set.completedExamIds.length / set.examIds.length) * 100,
              );

              return (
                <S.ExamCard key={set.id}>
                  <S.CardHeader>
                    <S.ExamStatus $status={set.status}>
                      {t(`examList.status.${set.status}`)}
                    </S.ExamStatus>
                    {canEnter && <FiSettings style={{ color: "#cbd5e1" }} />}
                  </S.CardHeader>

                  <S.ExamTitle>{set.name}</S.ExamTitle>

                  <S.ExamInfoList>
                    <S.InfoItem>
                      <FiClock />
                      {set.startDate
                        ? formatLocalDateTime(set.startDate)
                        : "Always"}
                      {" ~ "}
                      {set.endDate
                        ? formatLocalDateTime(set.endDate)
                        : "Always"}
                    </S.InfoItem>
                    <S.InfoItem>
                      <FiCheck />
                      {t("examList.progress")}: {set.completedExamIds.length} /{" "}
                      {set.examIds.length} ({progress}%)
                    </S.InfoItem>
                  </S.ExamInfoList>

                  <S.StartButton
                    onClick={() => handleStartExamSet(set.id)}
                    disabled={!canEnter}
                  >
                    {isCompleted
                      ? t("examList.completed")
                      : isUpcoming
                        ? t("examList.upcoming")
                        : isExpired
                          ? t("examList.expired")
                          : t("examList.start")}
                  </S.StartButton>
                </S.ExamCard>
              );
            })}
          </S.ExamGrid>
        </>
      )}
    </S.PageContainer>
  );
};

export default StudentSessionListPage;

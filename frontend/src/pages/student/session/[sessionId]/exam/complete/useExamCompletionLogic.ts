import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { BlockBlobClient } from "@azure/storage-blob";
import { getExamSession } from "@/common/services/student/getExamSession";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { saveFileRecord } from "@/common/services/api/saveFileRecord";
import { Exam, Student, ExamStudentSession } from "@/common/types";
import { useAuthStatus } from "@/common/hooks/useAuthStatus";
import { useTranslation } from "@/common/i18n";

interface LocationState {
  verified?: boolean;
  exam?: Exam;
  student?: Student;
  session?: ExamStudentSession;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export const useExamCompletionLogic = () => {
  useAuthStatus();
  const { t } = useTranslation();
  const { sessionId } = useParams<{
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;

  // Get examStudentId from localStorage
  const storedExamStudentId = localStorage.getItem("examStudentId");

  const [exam, setExam] = useState<Exam | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!storedExamStudentId) {
        setError(t("completionPage.errors.invalidAccess"));
        return;
      }

      if (
        locationState?.verified &&
        locationState.exam &&
        locationState.student
      ) {
        console.log("✅ Using verified data from StudentAssistantPage");
        setExam(locationState.exam);
        setStudent(locationState.student);
        return;
      }
      console.log("⚠️ No verified state found, fetching session data from API");

      try {
        const sessionData = await getExamSession(storedExamStudentId);

        if (!sessionData) {
          setError(t("completionPage.errors.notFound"));
          return;
        }

        setExam({
          id: sessionData.examId,
          name: sessionData.examName,
          duration: sessionData.duration,
          createdAt: sessionData.examCreatedAt,
          updatedAt: sessionData.examUpdatedAt,
          visibleAt: new Date().toISOString(), // Dummy
          openAt: new Date().toISOString(),    // Dummy
          blockAt: new Date().toISOString(),   // Dummy
        } as Exam);

        setStudent({
          id: sessionData.userId.toString(),
          userId: sessionData.userId.toString(),
          studentId: sessionData.studentId,
          name: sessionData.studentName,
          school: sessionData.school,
          registrationNumber: sessionData.registrationNumber,
        } as Student);
      } catch (err) {
        console.error("데이터 로딩 실패:", err);
        setError(t("completionPage.errors.loadFailed"));
      }
    };

    loadData();
  }, [storedExamStudentId, t, locationState]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !student || !exam) return;

    setUploadStatus("uploading");
    setUploadProgress(0);
    setError(null);

    try {
      const fileExtension = selectedFile.name.split(".").pop() || "bin";
      const fileName = `additional_${student.school}_${student.registrationNumber}_${exam.name}.${fileExtension}`;

      const sasResponse = await getAzureSasToken(fileName);
      if (!sasResponse.success || !sasResponse.data) {
        throw new Error(
          sasResponse.error || t("completionPage.errors.sasUrlFailed"),
        );
      }
      const { sasUrl } = sasResponse.data;
      const blockBlobClient = new BlockBlobClient(sasUrl);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await blockBlobClient.uploadData(selectedFile, {
        blobHTTPHeaders: { blobContentType: selectedFile.type },
      });
      const permanentUrl = blockBlobClient.url.split("?")[0];
      await saveFileRecord({
        fileName,
        fileUrl: permanentUrl,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("success");
    } catch (err) {
      console.error("업로드 실패:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("completionPage.errors.unknownUploadError");
      setError(t("completionPage.uploadFailed", { error: errorMessage }));
      setUploadStatus("error");
      setUploadProgress(0);
    }
  };

  const handleBackToExamList = () => {
    if (sessionId) {
      navigate(`/student/session/${sessionId}/list`);
    } else {
      const studentData = localStorage.getItem("currentStudent");
      if (studentData) {
        try {
          const student = JSON.parse(studentData);
          const sId = student.id || student.userId || "default";
          navigate(`/student/session/${sId}/list`);
        } catch (e) {
          console.error("localStorage 파싱 오류:", e);
          navigate("/student/login");
        }
      } else {
        navigate("/student/login");
      }
    }
  };

  return {
    t,
    exam,
    student,
    selectedFile,
    setSelectedFile,
    uploadStatus,
    uploadProgress,
    isDragOver,
    error,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleUpload,
    handleBackToExamList,
  };
};

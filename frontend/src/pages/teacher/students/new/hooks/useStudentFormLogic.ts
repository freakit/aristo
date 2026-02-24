import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { Student } from "@/common/types";
import { signup } from "@/common/services/api/signup";
import { useTranslation } from "@/common/i18n";
import { addStudentsBulk, checkStudentExists } from "../api";

interface FormData {
  registrationNumber: string;
  name: string;
  school: string;
  email: string;
  phoneNumber: string;
  password: string;
  age: string;
  gender: "남성" | "여성";
  significant: string;
}

interface CsvResult {
  success: number;
  failed: number;
  errors: { rn: string; reason: string }[];
}

export const useStudentFormLogic = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    registrationNumber: "",
    name: "",
    school: "",
    email: "",
    phoneNumber: "",
    password: "",
    age: "",
    gender: "남성",
    significant: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const [generalError, setGeneralError] = useState<string>("");

  // CSV 업로드 상태
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (success) setSuccess("");
    if (generalError) setGeneralError("");
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.registrationNumber.trim())
      newErrors.registrationNumber = "학번을 입력해주세요.";
    if (!formData.name.trim()) newErrors.name = "성함을 입력해주세요.";
    if (!formData.school.trim()) newErrors.school = "학교명을 입력해주세요.";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "유효한 이메일 주소를 입력해주세요.";
    if (!formData.password.trim() || formData.password.length < 4)
      newErrors.password = "비밀번호를 4자 이상 입력해주세요.";
    const age = parseInt(formData.age);
    if (!formData.age || age <= 0 || age > 150)
      newErrors.age = "올바른 나이를 입력해주세요 (1-150).";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setGeneralError("");
    setSuccess("");
    try {
      const exists = await checkStudentExists(
        formData.registrationNumber.trim()
      );
      if (exists) {
        setErrors({ registrationNumber: "이미 존재하는 학번입니다." });
        setIsSubmitting(false);
        return;
      }
      const studentData: Partial<Omit<Student, "id">> = {
        ...formData,
        age: parseInt(formData.age),
      };
      await signup(studentData);
      setSuccess("학생이 성공적으로 등록되었습니다! 🎉");
      setTimeout(() => navigate("/students"), 2000);
    } catch (error) {
      console.error("학생 추가 오류:", error);
      setGeneralError("학생 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setCsvResult(null);
    }
  };

  const handleCsvUpload = () => {
    if (!csvFile) {
      alert(t("studentForm.selectCSVFile"));
      return;
    }
    setIsCsvUploading(true);
    setCsvResult(null);

    Papa.parse<any>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const requiredHeaders = [
          "registrationNumber",
          "name",
          "school",
          "email",
          "password",
        ];
        const headers = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h)
        );

        if (missingHeaders.length > 0) {
          alert(
            `CSV 파일에 필수 헤더가 없습니다: ${missingHeaders.join(", ")}`
          );
          setIsCsvUploading(false);
          return;
        }

        const studentsToUpload = results.data.map((row) => ({
          registrationNumber: row.registrationNumber?.trim(),
          name: row.name?.trim(),
          school: row.school?.trim(),
          email: row.email?.trim(),
          password: row.password?.trim(),
          phoneNumber: row.phoneNumber?.trim() || "",
          age: row.age ? parseInt(row.age.trim(), 10) : 0,
          gender: (row.gender?.trim() === "여성" ? "여성" : "남성") as
            | "남성"
            | "여성",
        }));

        try {
          const response = await addStudentsBulk(studentsToUpload);
          if (response.data) {
            setCsvResult({
              success: response.data.successCount,
              failed: response.data.failedCount,
              errors: response.data.errors.map((err) => ({
                rn: err.registrationNumber,
                reason: err.reason,
              })),
            });
          }
        } catch (error) {
          console.error(error);
          alert(t("studentForm.uploadError"));
        } finally {
          setIsCsvUploading(false);
          setCsvFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        alert(t("studentForm.csvParseError"));
        setIsCsvUploading(false);
      },
    });
  };

  const handleCancel = () => navigate("/students");

  return {
    formData,
    errors,
    isSubmitting,
    success,
    generalError,
    csvFile,
    isCsvUploading,
    csvResult,
    fileInputRef,
    handleInputChange,
    handleSubmit,
    handleFileChange,
    handleCsvUpload,
    handleCancel,
  };
};

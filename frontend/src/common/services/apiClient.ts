// src/services/apiClient.ts

import {
  Exam,
  Student,
  ExamStudentSession,
  QA,
  ExamSetCreatePayload,
  SectionInput,
  File as DbFile,
} from "@/common/types";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  status: "success" | "concurrent_login_detected";
  user?: Student;
  message?: string;
  sessionId?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public async get<T>(url: string, headers: HeadersInit = {}): Promise<T> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}${url}`, {
      method: "GET",
      headers,
    });
    const result = await this.handleResponse<T>(response);
    if (!result.success) throw new Error(result.error || `GET ${url} failed`);
    return result.data as T;
  }

  public async post<T>(
    url: string,
    body?: any,
    headers: HeadersInit = {},
  ): Promise<T> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}${url}`, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await this.handleResponse<T>(response);
    if (!result.success) throw new Error(result.error || `POST ${url} failed`);
    return result.data as T;
  }

  public async put<T>(
    url: string,
    body?: any,
    headers: HeadersInit = {},
  ): Promise<T> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}${url}`, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await this.handleResponse<T>(response);
    if (!result.success) throw new Error(result.error || `PUT ${url} failed`);
    return result.data as T;
  }

  public async delete<T>(url: string, headers: HeadersInit = {}): Promise<T> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}${url}`, {
      method: "DELETE",
      headers,
    });
    const result = await this.handleResponse<T>(response);
    if (!result.success)
      throw new Error(result.error || `DELETE ${url} failed`);
    return result.data as T;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  // --- Private Helper Methods ---

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toUtcIso(input?: string | null): string | null {
    if (!input) return null;
    const d = new Date(input);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  private normalizeExamMultiPayload(
    p: ExamSetCreatePayload,
  ): ExamSetCreatePayload {
    return {
      name: String(p.name ?? "").trim(),
      visibleAt: this.toUtcIso(p.visibleAt)!,
      studentIds: Array.isArray(p.studentIds)
        ? p.studentIds.filter(Boolean)
        : [],
      items: (p.items ?? [])
        .filter((it) => it?.title?.trim() && it?.content?.trim())
        .map((it) => ({
          title: String(it.title ?? "").trim(),
          content: String(it.content ?? ""),
          duration: Number(it.duration ?? 60),
          chapter: it.chapter == null ? null : Number(it.chapter),
          openAt: this.toUtcIso(it.openAt)!,
          blockAt: this.toUtcIso(it.blockAt)!,
          ragSourceIds: Array.isArray(it.ragSourceIds) ? it.ragSourceIds : [],
          attachmentFileIds: Array.isArray(it.attachmentFileIds)
            ? it.attachmentFileIds
            : [],
        })),
    };
  }

  private normalizeExamUpdatePayload(p: Partial<Exam> & any): any {
    const out: any = {};
    if (p.name !== undefined) out.name = String(p.name ?? "").trim();
    if (p.duration !== undefined) out.duration = Number(p.duration);
    if (p.chapter !== undefined)
      out.chapter =
        p.chapter == null || p.chapter === "" ? null : Number(p.chapter);
    if (p.visibleAt !== undefined) out.visibleAt = this.toUtcIso(p.visibleAt);
    if (p.openAt !== undefined) out.openAt = this.toUtcIso(p.openAt);
    if (p.blockAt !== undefined) out.blockAt = this.toUtcIso(p.blockAt);

    if (p.vectorIds !== undefined) {
      out.vectorIds = Array.isArray(p.vectorIds) ? p.vectorIds : [];
    }

    if (p.sections !== undefined) {
      const first =
        Array.isArray(p.sections) && p.sections.length > 0
          ? p.sections[0]
          : null;
      out.sections = first
        ? [
            {
              title: String(first.title ?? ""),
              content: String(first.content ?? ""),
              attachmentFileIds: Array.isArray(first.attachmentFileIds)
                ? first.attachmentFileIds
                : [],
            },
          ]
        : [];
    }

    if (p.studentIds !== undefined) {
      out.studentIds = Array.isArray(p.studentIds)
        ? p.studentIds.filter(Boolean)
        : [];
    }
    return out;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (response.status === 204) {
      return { success: true, data: undefined };
    }

    const responseText = await response.text();
    if (!responseText) {
      if (response.ok) {
        return { success: true, data: undefined };
      } else {
        return {
          success: false,
          error: `HTTP Error: ${response.status} with empty response body`,
        };
      }
    }

    try {
      const data = JSON.parse(responseText);
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP Error: ${response.status}`,
        };
      }
      return { success: true, data };
    } catch (error) {
      if (!response.ok) {
        return { success: false, error: responseText };
      }
      return { success: true, data: responseText as any };
    }
  }

  // 과거의 망령
  async forceLogin(loginData: {
    school: string;
    registrationNumber: string;
    password: string;
  }): Promise<LoginResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/login/force`,
      {
        method: "POST",
        body: JSON.stringify(loginData),
      },
    );
    const result = await this.handleResponse<LoginResponse>(response);
    if (!result.success || !result.data)
      throw new Error(result.error || "apiErrors.force_login_failed");
    return result.data;
  }
  // StudentExamListPage.tsx
  async logout(logoutData: {
    school: string;
    registrationNumber: string;
  }): Promise<ApiResponse<{ message: string }>> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/logout`,
      {
        method: "POST",
        body: JSON.stringify(logoutData),
      },
    );
    return this.handleResponse(response);
  }
  // 과거의 망령
  async localToOffsetIso(
    local: string,
    offsetMinutes = 9 * 60,
  ): Promise<string> {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
      throw new Error("Invalid datetime-local string");
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const oh = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(
      2,
      "0",
    );
    const om = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
    return `${local}:00${sign}${oh}:${om}`;
  }
  // 과거의 망령
  async formatKoDateTime(v?: string | null): Promise<string> {
    if (!v) return "";
    const d = new Date(v);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  }

  // useAuthStatus.tsx
  async checkLoginStatus(statusData: {
    school: string;
    registrationNumber: string;
    sessionId: string;
  }): Promise<ApiResponse<{ isLoggedIn: boolean }>> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/check-status`,
      {
        method: "POST",
        body: JSON.stringify(statusData),
      },
    );
    return this.handleResponse(response);
  }

  // --- Student API ---
  // ExamDetailPage.tsx, ExamFormPage.tsx, ExamReviewPage.tsx, MainPage.tsx, StudentListPage.tsx
  async getStudents(): Promise<Student[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/students`,
    );
    const result = await this.handleResponse<Student[]>(response);
    if (!result.success || !result.data)
      throw new Error(result.error || "apiErrors.student_list_fetch_failed");
    return result.data;
  }

  // 과거의 망령
  async getStudentByRegistrationNumber(
    registrationNumber: string,
  ): Promise<Student | null> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/students/by-reg/${registrationNumber}`,
    );
    const result = await this.handleResponse<Student>(response);
    if (!result.success)
      throw new Error(result.error || "apiErrors.student_info_fetch_failed");
    return result.data || null;
  }

  // --- Exam API ---
  // ExamListPage.tsx, MainPage.tsx, StudentListPage.tsx
  async getExams(): Promise<Exam[]> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/exams`);
    const result = await this.handleResponse<any[]>(response);
    if (!result.success || !result.data)
      throw new Error(result.error || "apiErrors.exam_list_fetch_failed");
    return result.data.map((exam) => ({
      ...exam,
      chapter: exam?.chapter == null ? null : Number(exam.chapter),
      createdAt: new Date(exam.createdAt),
      updatedAt: new Date(exam.updatedAt),
    }));
  }
  // 과거의 망령
  async getExamsForStudent(studentId: string): Promise<Exam[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/exams/for-student/${studentId}`,
    );
    const result = await this.handleResponse<any[]>(response);
    if (!result.success || !result.data)
      throw new Error(
        result.error || "apiErrors.exams_for_student_fetch_failed",
      );
    return result.data.map((exam) => ({
      ...exam,
      chapter: exam?.chapter == null ? null : Number(exam.chapter),
      createdAt: new Date(exam.createdAt),
      updatedAt: new Date(exam.updatedAt),
    }));
  }
  // ExamDetailPage.tsx, ExamFormPage.tsx, ExamReviewPage.tsx, StudentAssistantPage.tsx
  async getExamById(id: string): Promise<Exam | null> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/exams/${id}`,
    );
    const result = await this.handleResponse<any>(response);
    if (!result.success)
      throw new Error(result.error || "apiErrors.exam_info_fetch_failed");
    if (!result.data) return null;
    return {
      ...result.data,
      chapter:
        result.data?.chapter == null ? null : Number(result.data.chapter),
      createdAt: new Date(result.data.createdAt),
      updatedAt: new Date(result.data.updatedAt),
    };
  }
  // StudentExamListPage.tsx
  async getExamSetsForStudent(studentId: string): Promise<any[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/exams/sets/student/${studentId}`,
    );
    const result = await this.handleResponse<any[]>(response);
    if (!result.success || !result.data)
      throw new Error(
        result.error || "apiErrors.exam_sets_for_student_fetch_failed",
      );
    return result.data;
  }
  // ExamReviewPage.tsx, ExamSetShellPage.tsx
  async getExamSetSession(examSetId: string, studentId: string): Promise<any> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/exams/sets/${examSetId}/session?studentId=${studentId}`,
    );
    const result = await this.handleResponse<any>(response);
    if (!result.success || !result.data)
      throw new Error(
        result.error || "apiErrors.exam_set_session_fetch_failed",
      );
    return result.data;
  }
  // ExamDetailPage.tsx, ExamFormPage.tsx, StudentAssistantPage.tsx
  async getExamAttachments(examId: string | number): Promise<DbFile[]> {
    // 1) 팀의 표준에 맞추세요.
    // - fetchWithTimeout이 절대 URL을 요구하면 그대로 두고,
    // - 상대 경로가 표준이면 `${this.baseUrl}` 제거하고 '/api/...'만 넘기세요.
    const url = `${this.baseUrl}/api/exams/${examId}/attachments`;

    const response = await this.fetchWithTimeout(url);
    const parsed: any = await this.handleResponse<any>(response);

    // 2) 배열 그대로 오는 경우와 { success, data } 래핑된 경우 모두 수용
    const data: DbFile[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
        ? parsed.data
        : [];

    // 3) data가 배열이 아니면 에러
    if (!Array.isArray(data)) {
      throw new Error(parsed?.error || "apiErrors.attachment_fetch_failed");
    }

    // (선택) 필수 필드 보정/검증
    // return data.map(f => ({ id: Number(f.id), fileName: String(f.fileName ?? ""), fileUrl: String(f.fileUrl ?? "") }));

    return data;
  }
  // ExamDetailPage.tsx, ExamFormPage.tsx
  public async updateExam(
    id: number | string,
    payload: Partial<Exam> & {
      sections?: SectionInput[];
      studentIds?: string[];
    },
  ): Promise<Exam> {
    const body = this.normalizeExamUpdatePayload(payload);
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/exams/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
    const result = await this.handleResponse<Exam>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.exam_update_failed");
    }
    return result.data;
  }

  async addExamsMulti(payload: ExamSetCreatePayload): Promise<{ examSetId: number; examIds: number[] }> {
    // Normalize items to include vectorIds
    const normalizedItems = payload.items.map(item => ({
      title: String(item.title ?? ""),
      content: String(item.content ?? ""),
      duration: Number(item.duration),
      // ✅ 수정: chapter는 number | null이므로 빈 문자열 비교 제거
      chapter: item.chapter == null ? null : Number(item.chapter),
      openAt: this.toUtcIso(item.openAt),
      blockAt: this.toUtcIso(item.blockAt),
      attachmentFileIds: Array.isArray(item.attachmentFileIds) ? item.attachmentFileIds : [],
      vectorIds: Array.isArray(item.vectorIds) ? item.vectorIds : [],
    }));

    const body = {
      name: String(payload.name ?? "").trim(),
      visibleAt: this.toUtcIso(payload.visibleAt),
      items: normalizedItems,
      studentIds: Array.isArray(payload.studentIds) ? payload.studentIds.filter(Boolean) : [],
    };

    return await this.post<{ examSetId: number; examIds: number[] }>('/api/exams/multi', body);
  }

  // --- Exam Student Session API ---

  // ExamDetailPage.tsx
  async findExamStudentForTeacher(
    examId: string,
    studentId: string,
    opts?: { status?: "completed" | "in_progress" | "pending" },
  ): Promise<ExamStudentSession | null> {
    const params = new URLSearchParams({ examId, studentId });
    if (opts?.status) params.set("status", opts.status);

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/exams/student-exam?${params.toString()}`,
    );

    const result = await this.handleResponse<ExamStudentSession>(response);
    if (!result.success) {
      console.error("Failed to find exam student for teacher:", result.error);
      return null;
    }
    return result.data || null;
  }

  // --- Tree API ---
  // 과거의 망령
  async initTree(payload: {
    examStudentId: number;
    sectionId: number;
    baseQuestionNodeData: any;
  }) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/trees/init`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const result = await this.handleResponse<{
      rootNodeId: number;
      baseQuestionNodeId: number;
      bonusNodeId: number;
    }>(response);

    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.tree_init_failed");
    }
    return result.data;
  }
  // 과거의 망령
  async addNodeToTree(payload: { parentNodeId: number; newNodeData: any }) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/trees/nodes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const result = await this.handleResponse<any>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.node_add_failed");
    }
    return result.data;
  }
  // ExamDetailPage.tsx
  async getQAList(examStudentId: string): Promise<QA[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/trees/qa-list/${examStudentId}`,
    );
    const result = await this.handleResponse<QA[]>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.qa_list_fetch_failed");
    }
    return result.data;
  }
  // 과거의 망령
  async updateNodeAnswer(nodeId: number, studentAnswer: string) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/trees/nodes/${nodeId}/answer`,
      {
        method: "PATCH",
        body: JSON.stringify({ studentAnswer }),
      },
    );
    const result = await this.handleResponse<any>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.answer_update_failed");
    }
    return result.data;
  }
  // 과거의 망령
  async saveTreeJSON(payload: {
    examStudentId: number | string;
    sectionId: number | string;
    treeJson: any;
  }) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/trees/save`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const result = await this.handleResponse<any>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.tree_save_failed");
    }
    return result.data;
  }

  // ExamDetailPage.tsx
  async getAnswerChanges(examStudentId: string, turn: number) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/answer-changes/${examStudentId}/${turn}`,
    );
    const result = await this.handleResponse<any[]>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.answer_change_fetch_failed");
    }
    return result.data;
  }

  // --- File & Azure API ---
  // ExamReviewPage.tsx, ExamFormPage.tsx, ExamDetailPage.tsx, StudentAssistantPage.tsx, ExamSetShellPage.tsx, ExamCompletionPage.tsx, HandAndGazeTrackingModal.tsx, AnswerCorrectionModal.tsx
  async getAzureSasToken(
    fileName: string,
    options?: {
      folder?: "attachments" | "recordings" | "gazetrackings" | "answeraudios";
    },
  ): Promise<ApiResponse<{ sasUrl: string }>> {
    const folder = options?.folder || "recordings";
    const url = `${
      this.baseUrl
    }/api/azure/generate-sas-token?fileName=${encodeURIComponent(
      fileName,
    )}&folder=${folder}`;

    const response = await this.fetchWithTimeout(url);
    const result = await this.handleResponse<{ sasUrl: string }>(response);
    if (!result.success) {
      throw new Error(result.error || "apiErrors.sas_url_fetch_failed");
    }
    return result;
  }
  // ExamReviewPage.tsx, AnswerCorrectionModal.tsx
  async listBlobs(
    prefix: string,
    options?: {
      folder?: "attachments" | "recordings" | "gazetrackings" | "answeraudios";
    },
  ): Promise<ApiResponse<{ blobs: string[] }>> {
    const folder = options?.folder || "recordings";
    const url = `${
      this.baseUrl
    }/api/azure/list-blobs?folder=${folder}&prefix=${encodeURIComponent(
      prefix,
    )}`;

    const response = await this.fetchWithTimeout(url);
    const result = await this.handleResponse<{ blobs: string[] }>(response);
    if (!result.success) {
      throw new Error(result.error || "apiErrors.blob_list_fetch_failed");
    }
    return result;
  }
  // ExamFormPage.tsx, ExamSetShellPage.tsx, ExamCompletionPage.tsx, HandAndGazeTrackingModal.tsx
  async saveFileRecord(fileData: {
    fileName: string;
    fileUrl: string;
  }): Promise<DbFile> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/files`, {
      method: "POST",
      body: JSON.stringify(fileData),
    });
    const result = await this.handleResponse<DbFile>(response);
    if (!result.success || !result.data) {
      throw new Error(result.error || "apiErrors.file_record_save_failed");
    }
    return result.data;
  }
  // --- Professor API ---
  // AuthContext.tsx
  async professorLogin(payload: { email: string; password: string }) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/professor/login`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const result = await this.handleResponse<{
      status: "success";
      user: any;
      sessionId: string;
    }>(response);
    if (!result.success || !result.data)
      throw new Error(result.error || "로그인 실패");
    return result.data;
  }
  // 과거의 망령
  async professorSignup(payload: {
    name: string;
    email: string;
    password: string;
    age?: number;
    gender?: "남성" | "여성";
    phoneNumber?: string;
  }) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/professor/signup`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const result = await this.handleResponse<{ id: number }>(response);
    if (!result.success || !result.data)
      throw new Error(result.error || "회원가입 실패");
    return result.data;
  }
  // AuthContext.tsx
  async professorLogout(email: string) {
    await this.fetchWithTimeout(`${this.baseUrl}/api/auth/professor/logout`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }
  // AuthContext.tsx
  async checkProfessorStatus(email: string, sessionId: string) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/professor/check-status`,
      { method: "POST", body: JSON.stringify({ email, sessionId }) },
    );
    const result = await this.handleResponse<{ isLoggedIn: boolean }>(response);
    if (!result.success || !result.data) return { isLoggedIn: false };
    return result.data;
  }
  // 과거의 망령
  async changeProfessorPassword(data: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/auth/professor/password`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    const result = await this.handleResponse(response);
    if (!result.success) {
      throw new Error(result.error || "비밀번호 변경에 실패했습니다.");
    }
    return result;
  }
  // deepgramSpeechService.ts
  async getDeepgramKey(): Promise<string> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/deepgram/key`,
    );
    const result = await this.handleResponse<{ key: string }>(response);
    if (!result.success || !result.data?.key) {
      throw new Error(result.error || "Failed to fetch Deepgram key");
    }
    return result.data.key;
  }

  // Deepgram file-based STT (Nova-3)
  async speechToTextDeepgram(
    audioBlob: Blob,
  ): Promise<ApiResponse<{ transcript: string }>> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    const retries = 2;
    let delay = 1000;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/deepgram/stt`, {
          method: "POST",
          body: formData,
        });
        if (response.status >= 500 && i < retries) {
          console.warn(
            `[API Client] Deepgram STT server error ${response.status}. Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay *= 2;
          continue;
        }
        return await this.handleResponse(response);
      } catch (error) {
        console.error("[API Client] Deepgram STT request failed:", error);
        if (i < retries) {
          console.warn(
            `[API Client] Deepgram STT fetch failed. Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay *= 2;
          continue;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : "apiErrors.sttFailed",
        };
      }
    }
    return { success: false, error: "apiErrors.sttFailed" };
  }
}

const apiClient = new ApiClient();
export default apiClient;

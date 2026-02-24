import apiClient, { ApiResponse } from "@/common/services/apiClient";

export const sendAnswerToAI = async (
  userInput: string,
  studentInfo?: { school: string; registrationNumber: string; name: string; examStudentId?: number | string | null },
  examInfo?: { name: string; content?: string; chapter?: number; sectionId?: number | string | null },
  attachments?: Array<{
    kind: "image" | "file";
    url: string;
    fileName: string;
    mime?: string;
    sectionId?: number | string;
  }>,
  resumeAnswer?: string,
  sessionId?: string,
  ragSources?: string[]
): Promise<ApiResponse<{ nextQuestion: string; type: string; sessionId?: string }>> => {
  try {
    let endpoint = "";
    let body: any = {};

    if (userInput === "START_SESSION") {
      endpoint = "/api/question/start";
      body = { 
        student_info: studentInfo, 
        exam_info: examInfo, 
        attachments: attachments?.map(a => ({ url: a.url })) || [], 
        rag_sources: ragSources 
      };
    } else if (userInput === "CONTINUE_SESSION" || resumeAnswer) {
      endpoint = "/api/question/continue";
      body = { 
        student_info: studentInfo, 
        exam_info: examInfo, 
        attachments: attachments?.map(a => ({ url: a.url })) || [], 
        rag_sources: ragSources 
      };
    } else {
      endpoint = "/api/question/answer";
      const effectiveSessionId = sessionId || (studentInfo?.examStudentId as string);
      if (!effectiveSessionId) {
        throw new Error("Session ID is required for answering");
      }
      body = { session_id: effectiveSessionId, user_input: userInput };
    }

    const data = await apiClient.post<{ nextQuestion: string; type: string; session_id?: string; message?: string }>(
      endpoint,
      body
    );
    
    // Normalize response to include sessionId if backend returns session_id (snake_case)
    const normalizedData = {
        ...data,
        sessionId: data.session_id || ((data as any).sessionId),
        // Map 'message' from QuestionResponse to 'nextQuestion' for frontend compatibility if needed
        nextQuestion: (data as any).message || data.nextQuestion
    };

    return { success: true, data: normalizedData };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

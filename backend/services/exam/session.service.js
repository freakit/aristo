// backend/services/exam/session.service.js
// 시험 세션/토큰 관련 로직

const examRepository = require("../../repositories/exam.repository");
const logger = require("../../config/logger");

class ExamSessionService {
  /**
   * examStudentId로 세션 정보를 가져옵니다.
   */
  async getSessionInfoByExamStudentId(examStudentId) {
    const sessionInfo =
      await examRepository.findSessionInfoByExamStudentId(examStudentId);
    if (!sessionInfo) {
      const error = new Error(
        "Session not found. Please log out and reconnect.",
      );
      error.statusCode = 403;
      throw error;
    }
    // 시험이 pending 상태면 시작 처리
    if (sessionInfo.status === "pending") {
      await examRepository.startExam(sessionInfo.examStudentId);
      sessionInfo.status = "in_progress";
    }
    return sessionInfo;
  }

  /**
   * 학생 시험 입장 (examStudentId 반환)
   */
  async enterExam(studentId, examId) {
    const examStudentId = await examRepository.findExamStudentId(
      examId,
      studentId,
    );
    return { examStudentId };
  }

  /**
   * 시험 응시를 완료 처리합니다.
   */
  async completeExam(examStudentId) {
    logger.info({ examStudentId }, "Completing exam");

    const success = await examRepository.completeExam(examStudentId);

    if (!success) {
      logger.error({ examStudentId }, "Failed to complete exam");
      throw new Error("Failed to complete exam");
    }

    logger.info({ examStudentId }, "Exam completed successfully");
    return { success: true, message: "Exam completed successfully" };
  }

  /**
   * 교사용: examId + studentId로 최신 시험 응시 정보를 조회합니다.
   */
  async findExamStudentForTeacher(examId, studentId, status) {
    if (!examId || !studentId) {
      const err = new Error("examId and studentId are required");
      err.statusCode = 400;
      throw err;
    }
    const session = await examRepository.findExamStudentForTeacher(
      examId,
      studentId,
      status,
    );
    return session || null;
  }
}

module.exports = ExamSessionService;

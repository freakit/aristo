// backend/services/exam/crud.service.js
// 시험 CRUD 관련 로직

const examRepository = require("../../repositories/exam.repository");

class ExamCrudService {
  async createExam(examData) {
    const newExamId = await examRepository.create(examData);
    return { id: newExamId };
  }

  async getAllExams(uid) {
    const exams = await examRepository.findAll(uid);
    // ⭐️ studentUserIds를 studentCount로 변환
    return exams.map((exam) => {
      const studentIds = exam.studentUserIds
        ? exam.studentUserIds.split(",")
        : [];
      return {
        ...exam,
        studentCount: studentIds.length,
        studentUserIds: undefined, // 더 이상 필요없는 필드 제거
      };
    });
  }

  async getExamWithDetails(examId) {
    const exam = await examRepository.findById(examId);
    if (!exam) {
      const error = new Error("Exam not found");
      error.statusCode = 404;
      throw error;
    }

    const sections = await examRepository.findSectionsByExamId(examId);
    const studentIds = await examRepository.findStudentIdsByExamId(examId);

    return {
      ...exam,
      sections,
      studentIds,
      sectionCount: sections.length,
      studentCount: studentIds.length,
    };
  }

  async getExamsForStudent(studentId) {
    const exams = await examRepository.findAllByStudentId(studentId);

    const examsWithIdsPromises = exams.map(async (exam) => {
      try {
        const examStudentId = await examRepository.findExamStudentId(
          exam.id,
          studentId,
        );
        return {
          ...exam,
          examStudentId,
        };
      } catch (error) {
        // "이미 완료된 시험입니다" 에러는 정상적인 케이스로 보고, 목록에서 제외하기 위해 null 반환
        if (error.message === "Exam already completed") {
          return null;
        }
        // 그 외 예상치 못한 에러는 그대로 전파하여 문제를 인지할 수 있도록 함
        throw error;
      }
    });

    const results = await Promise.all(examsWithIdsPromises);

    // null로 처리된 (완료된) 시험들을 최종 목록에서 필터링
    return results.filter((exam) => exam !== null);
  }

  async updateExam(examId, examData) {
    await this.getExamWithDetails(examId);
    await examRepository.update(examId, examData);
    return { success: true, message: "Exam updated successfully" };
  }

  async getAttachmentsForExam(examId) {
    // 먼저 시험이 존재하는지 확인 (getExamWithDetails 재사용)
    await this.getExamWithDetails(examId);
    const attachments = await examRepository.findAttachmentsByExamId(examId);
    return attachments;
  }
}

module.exports = ExamCrudService;

// backend/services/exam/set.service.js
// ExamSet 관련 로직

const examRepository = require("../../repositories/exam.repository");
const studentRepository = require("../../repositories/student.repository");
const ExamSetRepository = require("../../repositories/exam/set.repository");

const examSetRepository = new ExamSetRepository();

class ExamSetService {
  /**
   * 섹션들을 개별 시험으로 일괄 생성
   */
  async createMultipleExams(setPayload) {
    const { name, visibleAt, items = [] } = setPayload || {};
    if (!name || !visibleAt || !Array.isArray(items) || items.length === 0) {
      const err = new Error(
        "Invalid request. (name/visibleAt/items are required)",
      );
      err.statusCode = 400;
      throw err;
    }

    // 레포지토리의 단일 트랜잭션 메서드를 호출
    const result = await examRepository.createExamSetWithExams(setPayload);
    return result; // { examSetId, examIds }
  }

  /**
   * 학생의 ExamSet 목록 조회
   */
  async getExamSetsForStudent(studentId) {
    return await examRepository.findAllExamSetsByStudentId(studentId);
  }

  /**
   * ExamSet 세션 정보 조회 (모든 하위 시험의 examStudentId 포함)
   */
  async getExamSetSession(examSetId, studentId) {
    const details = await examRepository.findExamSetDetails(
      examSetId,
      studentId,
    );
    if (!details) {
      const err = new Error("Exam set not found or not assigned.");
      err.statusCode = 404;
      throw err;
    }

    // 각 시험별 examStudentId 조회
    const itemsWithExamStudentIds = await Promise.all(
      details.items.map(async (item) => {
        try {
          const examStudentId = await examRepository.findExamStudentId(
            item.id,
            studentId,
          );
          return {
            ...item,
            examStudentId,
          };
        } catch (e) {
          // "이미 완료된 시험입니다" 에러가 발생해도 리스트에는 보여야 함
          if (e.message === "Exam already completed") {
            return item;
          }
          throw e;
        }
      }),
    );

    const studentInfo = await studentRepository.findById(studentId);

    return {
      ...details,
      exams: itemsWithExamStudentIds,
      student: studentInfo,
    };
  }

  /**
   * ExamSet 삭제
   */
  async deleteExamSet(examSetId) {
    return await examSetRepository.deleteExamSet(examSetId);
  }
}

module.exports = ExamSetService;

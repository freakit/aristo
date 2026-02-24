// backend/controllers/exam.controller.js

const examService = require("../services/exam.service");
const validateUtils = require("../utils/validate");

class ExamController {
  async createExam(req, res, next) {
    try {
      const examData = req.body;
      const newExam = await examService.createExam(examData);
      res.status(201).json(newExam);
    } catch (error) {
      next(error);
    }
  }

  async getAllExams(req, res, next) {
    try {
      const { uid } = req.query;
      const exams = await examService.getAllExams(uid);
      res.status(200).json(exams);
    } catch (error) {
      next(error);
    }
  }

  async getExamById(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await examService.getExamWithDetails(id);
      res.status(200).json(exam);
    } catch (error) {
      next(error);
    }
  }

  async getExamsForStudent(req, res, next) {
    try {
      const { studentId } = req.params;
      const exams = await examService.getExamsForStudent(studentId);
      res.status(200).json(exams);
    } catch (error) {
      next(error);
    }
  }

  async updateExam(req, res, next) {
    try {
      const { id } = req.params;
      const examData = req.body;
      const result = await examService.updateExam(id, examData);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/exams/multi
  // POST /api/exams/multi
  async createMultipleExams(req, res, next) {
    try {
      const payload = req.body;
      const { uid } = payload;
      if (
        !validateUtils.checkValidation(res, payload, [
          "name",
          "visibleAt",
          "items",
        ])
      )
        return;

      const result = await examService.createMultipleExams(payload);
      res.status(201).json(result); // { examIds: number[] }
    } catch (error) {
      next(error);
    }
  }

  /**
   * [신규] examStudentId로 세션 정보를 조회하고 시험을 시작 처리합니다.
   * GET /api/exams/session/:examStudentId
   */
  async getSessionInfoByExamStudentId(req, res, next) {
    try {
      const { examStudentId } = req.params;
      const sessionInfo =
        await examService.getSessionInfoByExamStudentId(examStudentId);
      res.status(200).json(sessionInfo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [신규] 특정 시험 응시를 완료 처리합니다.
   * PUT /api/exams/complete/:examStudentId
   */
  async completeExam(req, res, next) {
    try {
      const { examStudentId } = req.params;
      const result = await examService.completeExam(examStudentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [신규] 교사용: 학생의 시험 응시 정보를 조회합니다.
   * GET /api/exams/student-exam?examId=...&studentId=...&status=...
   */
  async findExamStudentForTeacher(req, res, next) {
    try {
      if (
        !validateUtils.checkValidation(res, req.query, ["examId", "studentId"])
      )
        return;

      const { examId, studentId, status } = req.query;
      const session = await examService.findExamStudentForTeacher(
        examId,
        studentId,
        status,
      );
      return res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [신규] 특정 시험의 첨부 파일 목록을 조회합니다.
   * GET /api/exams/:id/attachments
   */
  async getExamAttachments(req, res, next) {
    try {
      const { id } = req.params;
      const attachments = await examService.getAttachmentsForExam(id);
      res.status(200).json(attachments);
    } catch (error) {
      next(error);
    }
  }
  /**
   * [신규] 학생의 ExamSet 목록 조회
   * GET /api/exams/sets/student/:studentId
   */
  async getExamSetsForStudent(req, res, next) {
    try {
      const { studentId } = req.params;
      const sets = await examService.getExamSetsForStudent(studentId);
      res.status(200).json(sets);
    } catch (error) {
      next(error);
    }
  }

  /**
   * [신규] ExamSet 세션 정보 조회
   * GET /api/exams/sets/:examSetId/session?studentId=...
   */
  async getExamSetSession(req, res, next) {
    try {
      const { examSetId } = req.params;
      const { studentId } = req.query;

      if (!validateUtils.checkValidation(res, req.query, ["studentId"])) return;

      const session = await examService.getExamSetSession(examSetId, studentId);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }
  /**
   * [신규] 학생 시험 입장 (examStudentId 반환)
   * POST /api/exams/student/enter
   */
  async enterExam(req, res, next) {
    try {
      const { studentId, examId } = req.body;
      if (!studentId || !examId) {
        const err = new Error("studentId and examId are required.");
        err.statusCode = 400;
        throw err;
      }

      const result = await examService.enterExam(studentId, examId);
      res.status(200).json(result); // { examStudentId: ... }
    } catch (error) {
      next(error);
    }
  }

  /**
   * ExamSet 삭제
   * DELETE /api/exams/sets/:examSetId
   */
  async deleteExamSet(req, res, next) {
    try {
      const { examSetId } = req.params;
      const result = await examService.deleteExamSet(examSetId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExamController();

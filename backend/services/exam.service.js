// backend/services/exam.service.js
// Facade - 기존 API 호환성 유지

const ExamCrudService = require("./exam/crud.service");
const ExamSessionService = require("./exam/session.service");
const ExamSetService = require("./exam/set.service");

const crud = new ExamCrudService();
const session = new ExamSessionService();
const set = new ExamSetService();

// 기존 API와 동일한 인터페이스 유지
module.exports = {
  // CRUD
  createExam: crud.createExam.bind(crud),
  getAllExams: crud.getAllExams.bind(crud),
  getExamWithDetails: crud.getExamWithDetails.bind(crud),
  getExamsForStudent: crud.getExamsForStudent.bind(crud),
  updateExam: crud.updateExam.bind(crud),
  getAttachmentsForExam: crud.getAttachmentsForExam.bind(crud),

  // Session
  enterExam: session.enterExam.bind(session),
  getSessionInfoByExamStudentId:
    session.getSessionInfoByExamStudentId.bind(session),
  completeExam: session.completeExam.bind(session),
  findExamStudentForTeacher: session.findExamStudentForTeacher.bind(session),

  // ExamSet
  createMultipleExams: set.createMultipleExams.bind(set),
  getExamSetsForStudent: set.getExamSetsForStudent.bind(set),
  getExamSetSession: set.getExamSetSession.bind(set),
  deleteExamSet: set.deleteExamSet.bind(set),
};

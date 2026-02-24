// backend/repositories/exam.repository.js
// Facade - 기존 API 호환성 유지

const ExamCrudRepository = require("./exam/crud.repository");
const ExamSectionRepository = require("./exam/section.repository");
const ExamSetRepository = require("./exam/set.repository");
const ExamSessionRepository = require("./exam/session.repository");

const crud = new ExamCrudRepository();
const section = new ExamSectionRepository();
const set = new ExamSetRepository();
const session = new ExamSessionRepository();

module.exports = {
  // CRUD
  create: crud.create.bind(crud),
  findAll: crud.findAll.bind(crud),
  findById: crud.findById.bind(crud),
  findAllByStudentId: crud.findAllByStudentId.bind(crud),
  update: crud.update.bind(crud),

  // Section
  findSectionsByExamId: section.findSectionsByExamId.bind(section),
  findStudentIdsByExamId: section.findStudentIdsByExamId.bind(section),
  findAttachmentsByExamId: section.findAttachmentsByExamId.bind(section),

  // ExamSet
  createExamSetWithExams: set.createExamSetWithExams.bind(set),

  // Session (기존 exam-session.repository.js 통합)
  findExamStudentId: session.findExamStudentId.bind(session),
  findSessionInfoByExamStudentId:
    session.findSessionInfoByExamStudentId.bind(session),
  startExam: session.startExam.bind(session),
  completeExam: session.completeExam.bind(session),
  findExamStudentForTeacher: session.findExamStudentForTeacher.bind(session),
  findAllExamSetsByStudentId: session.findAllExamSetsByStudentId.bind(session),
  findExamSetDetails: session.findExamSetDetails.bind(session),
};

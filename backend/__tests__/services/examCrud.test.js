// backend/__tests__/services/examCrud.test.js

const mockCreate = jest.fn();
const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockFindSectionsByExamId = jest.fn();
const mockFindStudentIdsByExamId = jest.fn();
const mockFindAllByStudentId = jest.fn();
const mockFindExamStudentId = jest.fn();
const mockUpdate = jest.fn();
const mockFindAttachmentsByExamId = jest.fn();

jest.mock("../../repositories/exam.repository", () => ({
  create: mockCreate,
  findAll: mockFindAll,
  findById: mockFindById,
  findSectionsByExamId: mockFindSectionsByExamId,
  findStudentIdsByExamId: mockFindStudentIdsByExamId,
  findAllByStudentId: mockFindAllByStudentId,
  findExamStudentId: mockFindExamStudentId,
  update: mockUpdate,
  findAttachmentsByExamId: mockFindAttachmentsByExamId,
}));

const ExamCrudService = require("../../services/exam/crud.service");

describe("ExamCrudService", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExamCrudService();
  });

  // ── createExam ──────────────────────────────────────────────────────────────

  describe("createExam", () => {
    it("성공: 시험을 생성하고 id를 반환한다", async () => {
      mockCreate.mockResolvedValue(55);
      const result = await service.createExam({ title: "시험1" });
      expect(result).toEqual({ id: 55 });
    });
  });

  // ── getAllExams ─────────────────────────────────────────────────────────────

  describe("getAllExams", () => {
    it("성공: studentUserIds를 studentCount로 변환한다", async () => {
      mockFindAll.mockResolvedValue([
        { id: 1, title: "A", studentUserIds: "1,2,3" },
        { id: 2, title: "B", studentUserIds: null },
      ]);
      const result = await service.getAllExams("uid");
      expect(result[0].studentCount).toBe(3);
      expect(result[0].studentUserIds).toBeUndefined();
      expect(result[1].studentCount).toBe(0);
    });
  });

  // ── getExamWithDetails ─────────────────────────────────────────────────────

  describe("getExamWithDetails", () => {
    it("성공: 시험 상세를 sections, studentIds와 함께 반환한다", async () => {
      mockFindById.mockResolvedValue({ id: 1, title: "A" });
      mockFindSectionsByExamId.mockResolvedValue([{ id: 10 }]);
      mockFindStudentIdsByExamId.mockResolvedValue([101, 102]);

      const result = await service.getExamWithDetails(1);
      expect(result.sectionCount).toBe(1);
      expect(result.studentCount).toBe(2);
    });

    it("실패: 시험 없으면 404 에러", async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.getExamWithDetails(999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getExamsForStudent ─────────────────────────────────────────────────────

  describe("getExamsForStudent", () => {
    it("성공: 완료된 시험(Exam already completed)은 필터링한다", async () => {
      mockFindAllByStudentId.mockResolvedValue([
        { id: 1 }, // 완료됨
        { id: 2 }, // 정상
      ]);
      mockFindExamStudentId
        .mockRejectedValueOnce(
          Object.assign(new Error("Exam already completed"), {}),
        )
        .mockResolvedValueOnce(42);

      const result = await service.getExamsForStudent(99);
      expect(result).toHaveLength(1);
      expect(result[0].examStudentId).toBe(42);
    });

    it("실패: 예상치 못한 에러는 전파한다", async () => {
      mockFindAllByStudentId.mockResolvedValue([{ id: 1 }]);
      mockFindExamStudentId.mockRejectedValue(new Error("DB error"));
      await expect(service.getExamsForStudent(99)).rejects.toThrow("DB error");
    });
  });

  // ── updateExam ─────────────────────────────────────────────────────────────

  describe("updateExam", () => {
    it("성공: 시험을 업데이트한다", async () => {
      mockFindById.mockResolvedValue({ id: 1 });
      mockFindSectionsByExamId.mockResolvedValue([]);
      mockFindStudentIdsByExamId.mockResolvedValue([]);
      mockUpdate.mockResolvedValue();

      const result = await service.updateExam(1, { title: "수정된 시험" });
      expect(result.success).toBe(true);
    });

    it("실패: 시험 없으면 404 에러", async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.updateExam(999, {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getAttachmentsForExam ──────────────────────────────────────────────────

  describe("getAttachmentsForExam", () => {
    it("성공: 첨부파일 목록을 반환한다", async () => {
      mockFindById.mockResolvedValue({ id: 1 });
      mockFindSectionsByExamId.mockResolvedValue([]);
      mockFindStudentIdsByExamId.mockResolvedValue([]);
      mockFindAttachmentsByExamId.mockResolvedValue([
        { id: 5, url: "http://..." },
      ]);

      const result = await service.getAttachmentsForExam(1);
      expect(result).toHaveLength(1);
    });
  });
});

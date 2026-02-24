// backend/__tests__/services/examSet.test.js

// 공유 mock 함수: 모듈이 require되기 전에 선언해야 함
const mockDeleteExamSet = jest.fn();
const mockCreateExamSetWithExams = jest.fn();

jest.mock("../../repositories/exam/set.repository", () => {
  return jest.fn().mockImplementation(() => ({
    deleteExamSet: mockDeleteExamSet,
  }));
});

jest.mock("../../repositories/exam.repository", () => ({
  createExamSetWithExams: mockCreateExamSetWithExams,
  findAllExamSetsByStudentId: jest.fn(),
  findExamSetDetails: jest.fn(),
  findExamStudentId: jest.fn(),
}));

jest.mock("../../repositories/student.repository", () => ({
  findById: jest.fn(),
}));

// mock 등록 후 require
const ExamSetService = require("../../services/exam/set.service");

describe("ExamSetService", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExamSetService();
  });

  // ── deleteExamSet ──────────────────────────────────────────────────────────

  describe("deleteExamSet", () => {
    it("성공: repository.deleteExamSet을 올바른 id로 호출하고 결과를 반환한다", async () => {
      const mockResult = { deleted: true, examSetId: 42 };
      mockDeleteExamSet.mockResolvedValue(mockResult);

      const result = await service.deleteExamSet(42);

      expect(mockDeleteExamSet).toHaveBeenCalledTimes(1);
      expect(mockDeleteExamSet).toHaveBeenCalledWith(42);
      expect(result).toEqual(mockResult);
    });

    it("실패: repository가 404 에러를 던지면 서비스도 그대로 전파한다", async () => {
      const err = new Error("Exam set not found");
      err.statusCode = 404;
      mockDeleteExamSet.mockRejectedValue(err);

      await expect(service.deleteExamSet(9999)).rejects.toMatchObject({
        message: "Exam set not found",
        statusCode: 404,
      });
    });

    it("실패: DB 에러가 발생하면 그대로 전파한다", async () => {
      mockDeleteExamSet.mockRejectedValue(new Error("DB error"));

      await expect(service.deleteExamSet(1)).rejects.toThrow("DB error");
    });
  });

  // ── createMultipleExams ────────────────────────────────────────────────────

  describe("createMultipleExams", () => {
    it("name 누락 시 400 에러를 던진다", async () => {
      await expect(
        service.createMultipleExams({
          visibleAt: "2025-01-01T00:00:00Z",
          items: [{}],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("visibleAt 누락 시 400 에러를 던진다", async () => {
      await expect(
        service.createMultipleExams({ name: "test", items: [{}] }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("items 빈 배열이면 400 에러를 던진다", async () => {
      await expect(
        service.createMultipleExams({
          name: "test",
          visibleAt: "2025-01-01T00:00:00Z",
          items: [],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});

// backend/__tests__/services/examSession.test.js

const mockFindSessionInfoByExamStudentId = jest.fn();
const mockStartExam = jest.fn();
const mockFindExamStudentId = jest.fn();
const mockCompleteExam = jest.fn();
const mockFindExamStudentForTeacher = jest.fn();

jest.mock("../../repositories/exam.repository", () => ({
  findSessionInfoByExamStudentId: mockFindSessionInfoByExamStudentId,
  startExam: mockStartExam,
  findExamStudentId: mockFindExamStudentId,
  completeExam: mockCompleteExam,
  findExamStudentForTeacher: mockFindExamStudentForTeacher,
}));

jest.mock("../../config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const ExamSessionService = require("../../services/exam/session.service");

describe("ExamSessionService", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExamSessionService();
  });

  // ── getSessionInfoByExamStudentId ─────────────────────────────────────────

  describe("getSessionInfoByExamStudentId", () => {
    it("성공: 세션 정보를 반환한다", async () => {
      mockFindSessionInfoByExamStudentId.mockResolvedValue({
        examStudentId: 1,
        status: "in_progress",
      });
      const result = await service.getSessionInfoByExamStudentId(1);
      expect(result.status).toBe("in_progress");
      expect(mockStartExam).not.toHaveBeenCalled();
    });

    it("성공: pending 상태면 startExam을 호출하고 in_progress로 변경한다", async () => {
      const sessionInfo = { examStudentId: 1, status: "pending" };
      mockFindSessionInfoByExamStudentId.mockResolvedValue(sessionInfo);
      mockStartExam.mockResolvedValue();

      const result = await service.getSessionInfoByExamStudentId(1);
      expect(mockStartExam).toHaveBeenCalledWith(1);
      expect(result.status).toBe("in_progress");
    });

    it("실패: 세션 없으면 403 에러", async () => {
      mockFindSessionInfoByExamStudentId.mockResolvedValue(null);
      await expect(
        service.getSessionInfoByExamStudentId(999),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── enterExam ────────────────────────────────────────────────────────────

  describe("enterExam", () => {
    it("성공: examStudentId를 반환한다", async () => {
      mockFindExamStudentId.mockResolvedValue(77);
      const result = await service.enterExam(10, 20);
      expect(result).toEqual({ examStudentId: 77 });
      expect(mockFindExamStudentId).toHaveBeenCalledWith(20, 10);
    });
  });

  // ── completeExam ──────────────────────────────────────────────────────────

  describe("completeExam", () => {
    it("성공: 시험 완료 처리", async () => {
      mockCompleteExam.mockResolvedValue(true);
      const result = await service.completeExam(1);
      expect(result.success).toBe(true);
    });

    it("실패: completeExam이 falsy를 반환하면 에러", async () => {
      mockCompleteExam.mockResolvedValue(false);
      await expect(service.completeExam(1)).rejects.toThrow(
        "Failed to complete exam",
      );
    });
  });

  // ── findExamStudentForTeacher ─────────────────────────────────────────────

  describe("findExamStudentForTeacher", () => {
    it("성공: 세션 정보를 반환한다", async () => {
      mockFindExamStudentForTeacher.mockResolvedValue({ id: 5 });
      const result = await service.findExamStudentForTeacher(1, 2, "completed");
      expect(result).toEqual({ id: 5 });
    });

    it("실패: examId 누락 시 400 에러", async () => {
      await expect(
        service.findExamStudentForTeacher(null, 2),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("성공: 결과 없으면 null 반환", async () => {
      mockFindExamStudentForTeacher.mockResolvedValue(null);
      const result = await service.findExamStudentForTeacher(1, 2);
      expect(result).toBeNull();
    });
  });
});

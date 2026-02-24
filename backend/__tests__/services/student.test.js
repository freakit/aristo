// backend/__tests__/services/student.test.js

const mockFindAll = jest.fn();
const mockFindByRegistrationNumber = jest.fn();

jest.mock("../../repositories/student.repository", () => ({
  findAll: mockFindAll,
  findByRegistrationNumber: mockFindByRegistrationNumber,
}));

const studentService = require("../../services/student.service");

beforeEach(() => jest.clearAllMocks());

// ── getAllStudents ────────────────────────────────────────────────────────────

describe("StudentService.getAllStudents", () => {
  it("성공: 학생 목록을 반환한다", async () => {
    mockFindAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await studentService.getAllStudents();
    expect(result).toHaveLength(2);
  });
});

// ── getStudentByRegistrationNumber ───────────────────────────────────────────

describe("StudentService.getStudentByRegistrationNumber", () => {
  it("성공: 학생을 반환한다", async () => {
    mockFindByRegistrationNumber.mockResolvedValue({ id: 1, name: "홍길동" });
    const result =
      await studentService.getStudentByRegistrationNumber("2024001");
    expect(result.name).toBe("홍길동");
  });

  it("실패: 학생 없으면 404 에러", async () => {
    mockFindByRegistrationNumber.mockResolvedValue(null);
    await expect(
      studentService.getStudentByRegistrationNumber("9999"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── checkStudentExists ───────────────────────────────────────────────────────

describe("StudentService.checkStudentExists", () => {
  it("학생이 있으면 exists: true", async () => {
    mockFindByRegistrationNumber.mockResolvedValue({ id: 1 });
    const result = await studentService.checkStudentExists("2024001");
    expect(result).toEqual({ exists: true });
  });

  it("학생이 없으면 exists: false", async () => {
    mockFindByRegistrationNumber.mockResolvedValue(null);
    const result = await studentService.checkStudentExists("9999");
    expect(result).toEqual({ exists: false });
  });
});

// backend/__tests__/services/auth.test.js

// uuid는 ESM 패키지라 Jest가 직접 파싱 불가 → mock 처리
jest.mock("uuid", () => ({ v4: jest.fn().mockReturnValue("mock-uuid-1234") }));

const mockFindStudentByLoginInfo = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindProfessorByEmail = jest.fn();
const mockUpdateSessionId = jest.fn();
const mockCreateStudent = jest.fn();
const mockCreateProfessor = jest.fn();
const mockUpdateUserPassword = jest.fn();

jest.mock("../../repositories/auth.repository", () => ({
  findStudentByLoginInfo: mockFindStudentByLoginInfo,
  findUserByEmail: mockFindUserByEmail,
  findProfessorByEmail: mockFindProfessorByEmail,
  updateSessionId: mockUpdateSessionId,
  createStudent: mockCreateStudent,
  createProfessor: mockCreateProfessor,
  updateUserPassword: mockUpdateUserPassword,
}));

// bcrypt는 실제 해싱 대신 항상 통과하도록 모킹
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcrypt = require("bcrypt");
const authService = require("../../services/auth.service");

const HASHED_PW = "$2b$10$hashedpassword";

beforeEach(() => {
  jest.clearAllMocks();
  bcrypt.compare.mockResolvedValue(true);
  bcrypt.hash.mockResolvedValue(HASHED_PW);
  mockUpdateSessionId.mockResolvedValue();
});

// ── login (student) ──────────────────────────────────────────────────────────

describe("AuthService.login (student)", () => {
  const fakeStudent = { id: 1, password: HASHED_PW, name: "홍길동" };

  it("성공: 학번/학교로 로그인 시 sessionId를 반환한다", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(fakeStudent);

    const result = await authService.login({
      school: "서울대",
      registrationNumber: "2024001",
      password: "pw",
    });

    expect(result.status).toBe("success");
    expect(result.sessionId).toBeDefined();
    expect(result.user.password).toBeUndefined();
  });

  it("실패: 유저가 없으면 404 에러", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(null);

    await expect(
      authService.login({
        school: "X",
        registrationNumber: "0",
        password: "pw",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("실패: 비밀번호 불일치 시 401 에러", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(fakeStudent);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      authService.login({
        school: "서울대",
        registrationNumber: "2024001",
        password: "wrong",
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("성공: 이메일로 로그인", async () => {
    mockFindUserByEmail.mockResolvedValue(fakeStudent);

    const result = await authService.login({
      email: "test@test.com",
      password: "pw",
    });
    expect(result.status).toBe("success");
  });
});

// ── logout ───────────────────────────────────────────────────────────────────

describe("AuthService.logout", () => {
  it("성공: 유저가 있으면 sessionId null로 초기화", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue({ id: 1 });

    const result = await authService.logout({
      school: "X",
      registrationNumber: "0",
    });
    expect(mockUpdateSessionId).toHaveBeenCalledWith(1, null);
    expect(result.message).toBe("Logout completed");
  });

  it("성공: 유저가 없어도 에러 없이 완료", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(null);

    const result = await authService.logout({
      school: "X",
      registrationNumber: "0",
    });
    expect(mockUpdateSessionId).not.toHaveBeenCalled();
    expect(result.message).toBe("Logout completed");
  });
});

// ── checkLoginStatus ─────────────────────────────────────────────────────────

describe("AuthService.checkLoginStatus", () => {
  it("세션 일치 시 isLoggedIn: true", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue({ sessionId: "abc" });
    const result = await authService.checkLoginStatus({
      school: "X",
      registrationNumber: "0",
      sessionId: "abc",
    });
    expect(result).toEqual({ isLoggedIn: true });
  });

  it("유저 없으면 isLoggedIn: false", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(null);
    const result = await authService.checkLoginStatus({
      school: "X",
      registrationNumber: "0",
      sessionId: "abc",
    });
    expect(result).toEqual({ isLoggedIn: false });
  });
});

// ── signupStudent ────────────────────────────────────────────────────────────

describe("AuthService.signupStudent", () => {
  it("성공: 새로운 학생을 생성한다", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(null);
    mockCreateStudent.mockResolvedValue(99);

    const result = await authService.signupStudent({
      school: "X",
      registrationNumber: "0",
      password: "pw",
    });
    expect(result).toEqual({ id: 99 });
    expect(mockCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({ password: HASHED_PW }),
    );
  });

  it("실패: 이미 등록된 학생이면 409 에러", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue({ id: 1 });

    await expect(
      authService.signupStudent({
        school: "X",
        registrationNumber: "0",
        password: "pw",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ── loginProfessor ───────────────────────────────────────────────────────────

describe("AuthService.loginProfessor", () => {
  const fakeProfessor = { id: 2, password: HASHED_PW, name: "교수님" };

  it("성공: 교수 로그인", async () => {
    mockFindProfessorByEmail.mockResolvedValue(fakeProfessor);
    const result = await authService.loginProfessor({
      email: "prof@univ.ac.kr",
      password: "pw",
    });
    expect(result.status).toBe("success");
  });

  it("실패: email 누락 시 400 에러", async () => {
    await expect(
      authService.loginProfessor({ password: "pw" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("실패: 교수 없으면 404 에러", async () => {
    mockFindProfessorByEmail.mockResolvedValue(null);
    await expect(
      authService.loginProfessor({ email: "x@x.com", password: "pw" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── signupProfessor ──────────────────────────────────────────────────────────

describe("AuthService.signupProfessor", () => {
  it("성공: 교수 생성", async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateProfessor.mockResolvedValue(10);
    const result = await authService.signupProfessor({
      email: "p@p.com",
      password: "pw",
      name: "김교수",
    });
    expect(result).toEqual({ id: 10 });
  });

  it("실패: 필드 누락 시 400 에러", async () => {
    await expect(
      authService.signupProfessor({ email: "p@p.com" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("실패: 이미 사용 중인 이메일이면 409 에러", async () => {
    mockFindUserByEmail.mockResolvedValue({ id: 1 });
    await expect(
      authService.signupProfessor({
        email: "p@p.com",
        password: "pw",
        name: "김교수",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ── changePassword ───────────────────────────────────────────────────────────

describe("AuthService.changePassword", () => {
  it("성공: 비밀번호 변경", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue({
      id: 1,
      password: HASHED_PW,
    });
    const result = await authService.changePassword({
      school: "X",
      registrationNumber: "0",
      currentPassword: "old",
      newPassword: "new",
    });
    expect(result.message).toBe("Password changed successfully");
    expect(mockUpdateUserPassword).toHaveBeenCalledWith(1, HASHED_PW);
  });

  it("실패: 유저 없으면 404", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue(null);
    await expect(
      authService.changePassword({
        school: "X",
        registrationNumber: "0",
        currentPassword: "old",
        newPassword: "new",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("실패: 현재 비밀번호 불일치 시 401", async () => {
    mockFindStudentByLoginInfo.mockResolvedValue({
      id: 1,
      password: HASHED_PW,
    });
    bcrypt.compare.mockResolvedValue(false);
    await expect(
      authService.changePassword({
        school: "X",
        registrationNumber: "0",
        currentPassword: "wrong",
        newPassword: "new",
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

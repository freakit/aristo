// backend/services/auth.service.js

const authRepository = require("../repositories/auth.repository");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid"); // uuid 라이브러리 임포트
const saltRounds = 10;

class AuthService {
  async login(loginData) {
    const { email, school, registrationNumber, password } = loginData;
    let user;

    if (school && registrationNumber) {
      user = await authRepository.findStudentByLoginInfo(
        school,
        registrationNumber,
      );
    } else if (email) {
      user = await authRepository.findUserByEmail(email);
    }

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error = new Error("Incorrect password");
      error.statusCode = 401;
      throw error;
    }

    // 새로운 세션 ID를 생성합니다.
    const newSessionId = uuidv4();

    // DB에 새로운 세션 ID를 업데이트합니다.
    await authRepository.updateSessionId(user.id, newSessionId);

    // 응답 데이터에서 비밀번호와 기존 세션ID를 제외합니다.
    const { password: _, sessionId: __, ...userData } = user;

    // 클라이언트에게 유저 정보와 함께 '새로운' 세션 ID를 반환합니다.
    return { status: "success", user: userData, sessionId: newSessionId };
  }

  /**
   * forceLogin은 이제 일반 login과 동일하게 동작합니다.
   * 새 기기에서 로그인하면 무조건 새 세션 ID가 발급되어 기존 세션을 무효화시킵니다.
   */
  async forceLogin(loginData) {
    return this.login(loginData);
  }

  async logout(logoutData) {
    const { school, registrationNumber } = logoutData;
    const user = await authRepository.findStudentByLoginInfo(
      school,
      registrationNumber,
    );

    if (user) {
      // 로그아웃 시 DB의 세션 ID를 null로 초기화합니다.
      await authRepository.updateSessionId(user.id, null);
    }
    return { message: "Logout completed" };
  }

  async checkLoginStatus(studentInfo) {
    const {
      school,
      registrationNumber,
      sessionId: clientSessionId,
    } = studentInfo;
    const user = await authRepository.findStudentByLoginInfo(
      school,
      registrationNumber,
    );

    // 유저 정보가 없거나, DB 또는 클라이언트 측에 세션 ID가 없으면 로그인되지 않은 상태입니다.
    if (!user || !user.sessionId || !clientSessionId) {
      return { isLoggedIn: false };
    }

    // DB에 저장된 세션 ID와 클라이언트가 보낸 세션 ID를 비교하여 일치 여부를 반환합니다.
    const isLoggedIn = user.sessionId === clientSessionId;
    return { isLoggedIn };
  }

  async signupStudent(studentData) {
    const existingStudent = await authRepository.findStudentByLoginInfo(
      studentData.school,
      studentData.registrationNumber,
    );
    if (existingStudent) {
      const error = new Error("Student already registered");
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(studentData.password, saltRounds);

    const newUserData = {
      ...studentData,
      password: hashedPassword,
    };

    const newUserId = await authRepository.createStudent(newUserData);
    return { id: newUserId };
  }

  async changePassword(passwordData) {
    const { school, registrationNumber, currentPassword, newPassword } =
      passwordData;

    // 1. 사용자 정보 확인
    const user = await authRepository.findStudentByLoginInfo(
      school,
      registrationNumber,
    );
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. 기존 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      const error = new Error("Current password is incorrect");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // 3. 새 비밀번호 해싱
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. DB에 새 비밀번호 업데이트
    await authRepository.updateUserPassword(user.id, hashedNewPassword);

    return { message: "Password changed successfully" };
  }

  // 교수 로그인
  async loginProfessor({ email, password }) {
    if (!email || !password) {
      const err = new Error("Email and password are required");
      err.statusCode = 400;
      throw err;
    }

    // 교수만 조회 (isStudent=0)
    const user = await authRepository.findProfessorByEmail(email);
    if (!user) {
      const err = new Error("Professor account not found");
      err.statusCode = 404;
      throw err;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const err = new Error("Incorrect password");
      err.statusCode = 401;
      throw err;
    }

    const newSessionId = uuidv4();
    await authRepository.updateSessionId(user.id, newSessionId);

    const { password: _, sessionId: __, ...userData } = user;
    return { status: "success", user: userData, sessionId: newSessionId };
  }

  // 교수 회원가입
  async signupProfessor(payload) {
    const { email, password, name, age, gender, phoneNumber } = payload || {};
    if (!email || !password || !name) {
      const err = new Error("Name, email, and password are required");
      err.statusCode = 400;
      throw err;
    }

    // 이메일 중복 체크(교수/학생 무관 전체)
    const exist = await authRepository.findUserByEmail(email);
    if (exist) {
      const err = new Error("Email already in use");
      err.statusCode = 409;
      throw err;
    }

    const hashed = await bcrypt.hash(password, saltRounds);
    const newId = await authRepository.createProfessor({
      password: hashed,
      name,
      age,
      gender,
      email,
      phoneNumber,
    });
    return { id: newId };
  }

  // 교수 로그아웃
  async logoutProfessor({ email }) {
    if (!email) return { message: "Done" };
    const user = await authRepository.findProfessorByEmail(email);
    if (user) await authRepository.updateSessionId(user.id, null);
    return { message: "Logout completed" };
  }

  // 교수 로그인 상태 확인
  async checkProfessorLoginStatus({ email, sessionId }) {
    const user = await authRepository.findProfessorByEmail(email);
    if (!user || !user.sessionId || !sessionId) return { isLoggedIn: false };
    return { isLoggedIn: user.sessionId === sessionId };
  }

  // 교수 비밀번호 변경 (email + currentPassword + newPassword)
  async changeProfessorPassword(data) {
    const { email, currentPassword, newPassword } = data || {};
    if (!email || !currentPassword || !newPassword) {
      const err = new Error(
        "Email, current password, and new password are required",
      );
      err.statusCode = 400;
      throw err;
    }

    // 1) 교수 계정 확인 (isStudent = 0)
    const user = await authRepository.findProfessorByEmail(email);
    if (!user) {
      const err = new Error("Professor account not found");
      err.statusCode = 404;
      throw err;
    }

    // 2) 기존 비밀번호 확인
    const ok = await bcrypt.compare(currentPassword, user.password || "");
    if (!ok) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 401;
      throw err;
    }

    // 3) 새 비밀번호 해싱 후 저장
    const hashed = await bcrypt.hash(newPassword, saltRounds);
    await authRepository.updateUserPassword(user.id, hashed);

    return { message: "Password changed successfully" };
  }
}

module.exports = new AuthService();

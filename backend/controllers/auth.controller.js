// backend/controllers/auth.controller.js

const authService = require("../services/auth.service");
const logger = require("../config/logger");

class AuthController {
  async signup(req, res, next) {
    try {
      const studentData = req.body;
      const newUser = await authService.signupStudent(studentData);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  }

  // ✅ 아래 login 함수의 catch 블록이 수정되었습니다.
  async login(req, res, next) {
    try {
      const loginData = req.body;
      const result = await authService.login(loginData);
      res.status(200).json(result);
    } catch (error) {
      // statusCode가 404 또는 401인 경우는 예상된 로그인 실패입니다.
      if (error.statusCode === 404 || error.statusCode === 401) {
        // 심각한 에러 로그 대신, 간단한 정보성 로그를 남깁니다.
        logger.error({ error: error.message }, "Login attempt failed");
        // 클라이언트에게는 에러 상태와 메시지를 정상적으로 전달합니다.
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        // 그 외의 예상치 못한 에러(DB 접속 오류 등)는 기존처럼 에러 핸들러로 전달합니다.
        next(error);
      }
    }
  }

  async forceLogin(req, res, next) {
    try {
      const loginData = req.body;
      const result = await authService.forceLogin(loginData);
      res.status(200).json(result);
    } catch (error) {
      // forceLogin도 동일하게 처리해주는 것이 좋습니다.
      if (error.statusCode === 404 || error.statusCode === 401) {
        logger.error({ error: error.message }, "Force login attempt failed");
        res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      } else {
        next(error);
      }
    }
  }

  async logout(req, res, next) {
    try {
      const logoutData = req.body;
      const result = await authService.logout(logoutData);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async checkStatus(req, res, next) {
    try {
      const studentInfo = req.body;
      const status = await authService.checkLoginStatus(studentInfo);
      res.status(200).json(status);
    } catch (error) {
      res.status(200).json({ isLoggedIn: false });
    }
  }

  async changePassword(req, res, next) {
    try {
      await authService.changePassword(req.body);
      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 추가: 교수 회원가입
  async signupProfessor(req, res, next) {
    try {
      const result = await authService.signupProfessor(req.body);
      res.status(201).json(result);
    } catch (error) {
      // 중복 등 예상 가능한 에러는 상태코드 전달
      if ([400, 409].includes(error.statusCode)) {
        return res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // 추가: 교수 로그인
  async loginProfessor(req, res, next) {
    try {
      const result = await authService.loginProfessor(req.body);
      res.status(200).json(result);
    } catch (error) {
      if (
        error.statusCode === 404 ||
        error.statusCode === 401 ||
        error.statusCode === 400
      ) {
        logger.error({ error: error.message }, "Professor login failed");
        return res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // 추가: 교수 로그아웃
  async logoutProfessor(req, res, next) {
    try {
      const result = await authService.logoutProfessor(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // 추가: 교수 로그인 상태 확인
  async checkProfessorStatus(req, res, next) {
    try {
      const status = await authService.checkProfessorLoginStatus(req.body);
      res.status(200).json(status);
    } catch (error) {
      res.status(200).json({ isLoggedIn: false });
    }
  }

  async changeProfessorPassword(req, res, next) {
    try {
      await authService.changeProfessorPassword(req.body);
      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

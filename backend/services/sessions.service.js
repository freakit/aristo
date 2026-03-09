// backend/services/sessions.service.js
const sessionsRepository = require("../repositories/sessions.repository");

class SessionsService {
  async createSession({ uid, title, vectorDocIds, vectorKeys, studyGoals }) {
    return sessionsRepository.createSession({ uid, title, vectorDocIds, vectorKeys, studyGoals });
  }

  async getSessions(uid, { limit, before } = {}) {
    return sessionsRepository.getSessionsByUid(uid, {
      limit: limit ? parseInt(limit) : 20,
      before: before || null,
    });
  }

  // 존재 확인 + 소유권 확인을 서비스에서 처리
  async getSession(sessionId, uid) {
    const session = await sessionsRepository.getSessionById(sessionId);
    if (!session) {
      const err = new Error("세션을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }
    if (session.uid !== uid) {
      const err = new Error("접근 권한이 없습니다.");
      err.statusCode = 403;
      throw err;
    }
    const messages = await sessionsRepository.getMessages(sessionId);
    return { ...session, messages };
  }

  async endSession(sessionId, uid) {
    const session = await sessionsRepository.getSessionById(sessionId);
    if (!session) {
      const err = new Error("세션을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }
    if (session.uid !== uid) {
      const err = new Error("접근 권한이 없습니다.");
      err.statusCode = 403;
      throw err;
    }
    return sessionsRepository.endSession(sessionId);
  }

  async deleteSession(sessionId, uid) {
    const session = await sessionsRepository.getSessionById(sessionId);
    if (!session) {
      const err = new Error("세션을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }
    if (session.uid !== uid) {
      const err = new Error("접근 권한이 없습니다.");
      err.statusCode = 403;
      throw err;
    }
    await sessionsRepository.deleteSession(sessionId);
  }
}

module.exports = new SessionsService();

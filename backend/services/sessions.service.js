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

  // Existence check + ownership check handled in service layer
  async getSession(sessionId, uid) {
    const session = await sessionsRepository.getSessionById(sessionId);
    if (!session) {
      const err = new Error("Session not found.");
      err.statusCode = 404;
      throw err;
    }
    if (session.uid !== uid) {
      const err = new Error("Access denied.");
      err.statusCode = 403;
      throw err;
    }
    const messages = await sessionsRepository.getMessages(sessionId);
    return { ...session, messages };
  }

  async endSession(sessionId, uid) {
    const session = await sessionsRepository.getSessionById(sessionId);
    if (!session) {
      const err = new Error("Session not found.");
      err.statusCode = 404;
      throw err;
    }
    if (session.uid !== uid) {
      const err = new Error("Access denied.");
      err.statusCode = 403;
      throw err;
    }
    return sessionsRepository.endSession(sessionId);
  }

  async deleteSession(sessionId, uid) {
    const session = await sessionsRepository.getSessionById(sessionId);
    if (!session) {
      const err = new Error("Session not found.");
      err.statusCode = 404;
      throw err;
    }
    if (session.uid !== uid) {
      const err = new Error("Access denied.");
      err.statusCode = 403;
      throw err;
    }
    await sessionsRepository.deleteSession(sessionId);
  }
}

module.exports = new SessionsService();

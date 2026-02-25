// backend/controllers/sessions.controller.js
const sessionsRepository = require("../repositories/sessions.repository");
const logger = require("../config/logger");

class SessionsController {
  // POST /api/sessions
  async createSession(req, res, next) {
    try {
      const uid = req.uid;
      const { title, vectorDocIds } = req.body;
      const session = await sessionsRepository.createSession({
        uid,
        title,
        vectorDocIds,
      });
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sessions
  async getSessions(req, res, next) {
    try {
      const uid = req.uid;
      const { limit, before } = req.query;
      const sessions = await sessionsRepository.getSessionsByUid(uid, {
        limit: limit ? parseInt(limit) : 20,
        before: before || null,
      });
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sessions/:sessionId
  async getSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await sessionsRepository.getSessionById(sessionId);

      if (!session) {
        const err = new Error("세션을 찾을 수 없습니다.");
        err.statusCode = 404;
        return next(err);
      }
      if (session.uid !== req.uid) {
        const err = new Error("접근 권한이 없습니다.");
        err.statusCode = 403;
        return next(err);
      }

      const messages = await sessionsRepository.getMessages(sessionId);
      res.json({ ...session, messages });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/sessions/:sessionId/end
  async endSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await sessionsRepository.getSessionById(sessionId);

      if (!session) {
        const err = new Error("세션을 찾을 수 없습니다.");
        err.statusCode = 404;
        return next(err);
      }
      if (session.uid !== req.uid) {
        const err = new Error("접근 권한이 없습니다.");
        err.statusCode = 403;
        return next(err);
      }

      const updated = await sessionsRepository.endSession(sessionId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/sessions/:sessionId
  async deleteSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await sessionsRepository.getSessionById(sessionId);

      if (!session) {
        const err = new Error("세션을 찾을 수 없습니다.");
        err.statusCode = 404;
        return next(err);
      }
      if (session.uid !== req.uid) {
        const err = new Error("접근 권한이 없습니다.");
        err.statusCode = 403;
        return next(err);
      }

      await sessionsRepository.deleteSession(sessionId);
      res.json({ message: "삭제 완료" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SessionsController();

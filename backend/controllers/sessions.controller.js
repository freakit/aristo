// backend/controllers/sessions.controller.js
const sessionsService = require("../services/sessions.service");

class SessionsController {
  // POST /api/sessions
  async createSession(req, res, next) {
    try {
      const { title, vectorDocIds } = req.body;
      const session = await sessionsService.createSession({
        uid: req.uid,
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
      const { limit, before } = req.query;
      const sessions = await sessionsService.getSessions(req.uid, {
        limit,
        before,
      });
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sessions/:sessionId
  async getSession(req, res, next) {
    try {
      const session = await sessionsService.getSession(
        req.params.sessionId,
        req.uid,
      );
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/sessions/:sessionId/end
  async endSession(req, res, next) {
    try {
      const updated = await sessionsService.endSession(
        req.params.sessionId,
        req.uid,
      );
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/sessions/:sessionId
  async deleteSession(req, res, next) {
    try {
      await sessionsService.deleteSession(req.params.sessionId, req.uid);
      res.json({ message: "삭제 완료" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SessionsController();

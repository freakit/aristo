// backend/controllers/auth.controller.js
const authService = require("../services/auth.service");

class AuthController {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { name } = req.body;
      const uid = req.uid;
      const { profile, created } = await authService.registerUser({
        uid,
        name,
      });
      res.status(created ? 201 : 200).json(profile);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async me(req, res, next) {
    try {
      const profile = await authService.getProfile(req.uid);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

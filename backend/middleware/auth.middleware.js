// backend/middleware/auth.middleware.js
const { auth } = require("../config/firebase");

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Firebase ID Token verification middleware
 * - Production: Authorization: Bearer <idToken> header required
 * - Development: Even if token is missing or invalid, passes with uid='dummy-user' (supports dummy login)
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // No token provided
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (IS_DEV) {
      req.uid = "dummy-user";
      req.email = "dummy@dev.local";
      return next();
    }
    return res.status(401).json({ error: "Authentication token is missing." });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    if (IS_DEV) {
      // Development: pass as dummy user even if token is invalid
      req.uid = "dummy-user";
      req.email = "dummy@dev.local";
      return next();
    }
    return res.status(401).json({ error: "Invalid token." });
  }
}

module.exports = { verifyFirebaseToken };

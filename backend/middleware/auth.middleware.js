// backend/middleware/auth.middleware.js
const { auth } = require("../config/firebase");

/**
 * Firebase ID Token 검증 미들웨어
 * Authorization: Bearer <idToken> 헤더 필요
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "인증 토큰이 없습니다." });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
  }
}

module.exports = { verifyFirebaseToken };

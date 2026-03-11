// backend/middleware/auth.middleware.js
const { auth } = require("../config/firebase");

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Firebase ID Token 검증 미들웨어
 * - 프로덕션: Authorization: Bearer <idToken> 헤더 필수
 * - 개발 환경: 토큰이 없거나 잘못되어도 uid='dummy-user' 로 통과 (더미 로그인 지원)
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // 토큰이 없는 경우
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (IS_DEV) {
      req.uid = "dummy-user";
      req.email = "dummy@dev.local";
      return next();
    }
    return res.status(401).json({ error: "인증 토큰이 없습니다." });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    if (IS_DEV) {
      // 개발 환경: 토큰이 잘못되어도 더미 유저로 통과
      req.uid = "dummy-user";
      req.email = "dummy@dev.local";
      return next();
    }
    return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
  }
}

module.exports = { verifyFirebaseToken };

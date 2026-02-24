// backend/utils/validate.js

/**
 * 필수 필드 검증 헬퍼
 * @param {Object} body - 요청 바디
 * @param {Array<string>} fields - 필수 필드 목록
 * @returns {string|null} - 누락된 필드가 없으면 null, 있으면 에러 메시지
 */
exports.validateRequired = (body, fields) => {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
};

/**
 * 컨트롤러용 검증 미들웨어 래퍼 (선택적)
 * 사용법: if (check(res, body, ['id', 'name'])) return;
 */
exports.checkValidation = (res, body, fields) => {
  const error = exports.validateRequired(body, fields);
  if (error) {
    res.status(400).json({ error });
    return false; // 검증 실패
  }
  return true; // 검증 성공
};

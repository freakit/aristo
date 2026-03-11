// backend/utils/validate.js

/**
 * Required field validation helper
 * @param {Object} body - Request body
 * @param {Array<string>} fields - Required field list
 * @returns {string|null} - null if no missing fields, otherwise error message
 */
exports.validateRequired = (body, fields) => {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
};

/**
 * Controller-level validation middleware wrapper (optional)
 * Usage: if (check(res, body, ['id', 'name'])) return;
 */
exports.checkValidation = (res, body, fields) => {
  const error = exports.validateRequired(body, fields);
  if (error) {
    res.status(400).json({ error });
    return false; // validation failed
  }
  return true; // validation passed
};

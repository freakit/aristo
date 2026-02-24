// backend/services/ai-proxy.service.js
// Facade - 기존 API 호환성 유지

const AIProxyService = require("./ai-proxy/proxy.service");

module.exports = new AIProxyService();

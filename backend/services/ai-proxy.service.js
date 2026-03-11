// backend/services/ai-proxy.service.js
// facade - maintain legacy API compatibility

const AIProxyService = require("./ai-proxy/proxy.service");

module.exports = new AIProxyService();

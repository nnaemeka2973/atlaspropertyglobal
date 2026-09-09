const rateLimit = require('express-rate-limit');
const xss = require('xss');

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

function sanitizeInput(value) {
  if (typeof value !== 'string') return value;
  return xss(value.trim());
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const sanitized = {};
    Object.keys(req.body).forEach((key) => {
      const value = req.body[key];
      sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
    });
    req.body = sanitized;
  }
  next();
}

module.exports = {
  aiRateLimiter,
  sanitizeBody,
  sanitizeInput,
};

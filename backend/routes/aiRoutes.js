const express = require('express');
const { chat } = require('../controllers/aiAssistantController');
const { aiRateLimiter, sanitizeBody } = require('../middleware/security');

const router = express.Router();

router.post('/chat', aiRateLimiter, sanitizeBody, chat);

module.exports = router;

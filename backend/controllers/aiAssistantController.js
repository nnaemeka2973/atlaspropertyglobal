const aiAssistantService = require('../services/aiAssistantService');
const { sanitizeBody } = require('../middleware/security');

async function chat(req, res) {
  try {
    const { message, propertyContext = {}, conversationHistory = [], userId } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'A message is required.' });
    }

    const result = await aiAssistantService.createConversationTurn({
      userId,
      message: String(message).trim(),
      propertyContext,
      conversationHistory,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('ai chat error', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to process request.' });
  }
}

module.exports = {
  chat,
};

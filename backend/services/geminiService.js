const axios = require('axios');
const { buildSystemPrompt, buildUserPrompt } = require('../helpers/aiPromptBuilder');

function buildLocalFallbackReply({ message = '', userContext = {}, propertyContext = {} } = {}) {
  const text = String(message || '').toLowerCase();
  const propertyTitle = propertyContext?.title || propertyContext?.address || propertyContext?.propertyId || '';
  const hasProperty = Boolean(propertyTitle);

  if (text.includes('mortgage') || text.includes('finance') || text.includes('payment')) {
    return 'I can help you compare mortgage options, estimate monthly payments, and explain affordability in simple terms.';
  }

  if (text.includes('tour') || text.includes('schedule') || text.includes('visit') || text.includes('showing')) {
    return 'I can help you arrange a showing or connect you with an agent for the next available tour.';
  }

  if (text.includes('contact') || text.includes('agent') || text.includes('message')) {
    return 'I can guide you to the right contact flow for agents, support, or scheduling.';
  }

  if (text.includes('property') || text.includes('listing') || text.includes('home') || text.includes('search')) {
    if (hasProperty) {
      return `I can help you explore ${propertyTitle} and compare similar options based on price, location, beds, and amenities.`;
    }
    return 'I can help you browse listings, compare homes, and narrow options by price, location, and features.';
  }

  return 'I can help with listings, mortgage questions, tours, and contacting the team. Tell me what you need and I will guide you.';
}

class GeminiService {
  constructor() {
    this.apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();
    this.model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  }

  async generateReply({ message, userContext = {}, propertyContext = {}, conversationHistory = [] }) {
    if (!this.apiKey) {
      return {
        ok: false,
        text: buildLocalFallbackReply({ message, userContext, propertyContext }),
        fallback: true,
      };
    }

    const systemPrompt = buildSystemPrompt({ userContext, propertyContext, conversationHistory });
    const userPrompt = buildUserPrompt(message, { propertyContext });

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 700,
          },
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const candidate = response?.data?.candidates?.[0];
      const text = candidate?.content?.parts?.map((item) => item.text).join('')?.trim();

      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }

      return { ok: true, text, fallback: false };
    } catch (error) {
      const messageText = error?.response?.data?.error?.message || error.message || 'AI generation failed.';
      return {
        ok: false,
        text: `${buildLocalFallbackReply({ message, userContext, propertyContext })} ${messageText ? `\n\n${messageText}` : ''}`.trim(),
        fallback: true,
      };
    }
  }
}

module.exports = new GeminiService();

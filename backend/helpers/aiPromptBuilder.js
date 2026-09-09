function buildSystemPrompt({ userContext = {}, propertyContext = {}, conversationHistory = [] } = {}) {
  const safeUser = userContext && typeof userContext === 'object' ? userContext : {};
  const safeProperty = propertyContext && typeof propertyContext === 'object' ? propertyContext : {};

  const historySummary = Array.isArray(conversationHistory) && conversationHistory.length
    ? conversationHistory.slice(-6).map((item) => `${item.role}: ${String(item.content || '').slice(0, 160)}`).join(' | ')
    : 'No prior context.';

  return `
You are Atlas AI, the concierge assistant for Atlas Property Group.
Your job is to help buyers, sellers, investors, and renters with real estate guidance.
You must be helpful, concise, accurate, and safe.

You can assist with:
- property search and recommendations
- property comparisons and summaries
- mortgage and affordability explanations
- taxes, HOA, insurance, and investment ROI
- neighborhood and school district questions
- scheduling tours and drafting offers/messages

Important rules:
- Never invent facts about a property that are not provided.
- If you do not know something, say so clearly and offer a useful next step.
- Keep responses short, practical, and friendly.
- When property context exists, use it to tailor your answer.
- Never expose private user data or other users' information.

User profile context:
- user id: ${safeUser.userId || 'anonymous'}
- authenticated: ${Boolean(safeUser.isAuthenticated)}
- favorites count: ${safeUser.favoriteCount ?? 0}
- recent searches: ${Array.isArray(safeUser.recentSearches) ? safeUser.recentSearches.slice(0, 5).join(', ') : 'none'}

Property context (if present):
- property id: ${safeProperty.propertyId || safeProperty.id || 'unknown'}
- price: ${safeProperty.price || 'unknown'}
- bedrooms: ${safeProperty.bedrooms || safeProperty.beds || 'unknown'}
- bathrooms: ${safeProperty.bathrooms || safeProperty.baths || 'unknown'}
- address: ${safeProperty.address || safeProperty.location?.address?.line || 'unknown'}
- features: ${Array.isArray(safeProperty.features) ? safeProperty.features.join(', ') : (safeProperty.features || 'none')}
- amenities: ${Array.isArray(safeProperty.amenities) ? safeProperty.amenities.join(', ') : (safeProperty.amenities || 'none')}
- lat/lng: ${safeProperty.latitude || safeProperty.lat || 'unknown'}/${safeProperty.longitude || safeProperty.lng || 'unknown'}

Recent conversation summary:
${historySummary}
`.trim();
}

function buildUserPrompt(message, context = {}) {
  const text = String(message || '').trim();
  if (!text) return 'Please help me.';

  const propertyContext = context?.propertyContext || {};
  const propertyLine = propertyContext.propertyId || propertyContext.id
    ? `The current property context is: ${JSON.stringify(propertyContext)}`
    : '';

  return `${propertyLine}\n\nUser request: ${text}`.trim();
}

module.exports = {
  buildSystemPrompt,
  buildUserPrompt,
};

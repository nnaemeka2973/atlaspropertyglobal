const geminiService = require('./geminiService');
const supabase = require('../config/supabase');

async function getUserContext(userId) {
  if (!userId) return { userId: null, isAuthenticated: false, favoriteCount: 0, recentSearches: [] };

  try {
    const [favoritesRes, searchesRes] = await Promise.all([
      supabase.from('favorites').select('property_id').eq('user_id', userId).limit(10),
      supabase.from('saved_searches').select('query').eq('user_id', userId).limit(5),
    ]);

    const favorites = favoritesRes.error ? [] : (favoritesRes.data || []);
    const searches = searchesRes.error ? [] : (searchesRes.data || []);

    return {
      userId,
      isAuthenticated: true,
      favoriteCount: favorites.length,
      recentSearches: searches.map((item) => item.query).filter(Boolean),
    };
  } catch (error) {
    return { userId, isAuthenticated: true, favoriteCount: 0, recentSearches: [] };
  }
}

async function createConversationTurn({ userId, message, propertyContext = {}, conversationHistory = [] }) {
  const userContext = await getUserContext(userId);
  const result = await geminiService.generateReply({
    message,
    userContext,
    propertyContext,
    conversationHistory,
  });

  return {
    reply: result.text,
    ok: result.ok,
    fallback: result.fallback,
  };
}

module.exports = {
  createConversationTurn,
  getUserContext,
};

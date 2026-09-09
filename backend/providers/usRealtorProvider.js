require('dotenv').config();

const { CACHE_TTL } = require('../services/cacheService');
const { cachedProviderRequest } = require('./providerUtils');

const RAPID_API_KEY = (process.env.RAPID_API_KEY || '').trim();
const US_REALTOR_HOST = (process.env.US_REALTOR_HOST || 'us-realtor.p.rapidapi.com').trim();

function unwrap(payload) {
    if (!payload) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) return payload.data;
    return payload;
}

async function getRecommendations(advertiserId, options = {}) {
    const id = String(advertiserId || options.advertiserId || options.advertiser_id || '1721302');

    return cachedProviderRequest({
        provider: 'us-realtor',
        endpoint: 'api/v1/agents/recommendation',
        params: { advertiserId: id },
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => {
            const url = `https://${US_REALTOR_HOST}/api/v1/agents/recommendation?advertiserId=${encodeURIComponent(id)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': US_REALTOR_HOST
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || `RapidAPI returned ${response.status}`);
            }

            const recommendations = unwrap(data) || [];
            return recommendations.map((entry, index) => ({
                ...entry,
                advertiserId: id,
                source: 'us-realtor',
                source_id: entry?.source_id || 'RDC',
                display_name: entry?.display_name || entry?.name || `Agent ${index + 1}`,
                photo: entry?.photo || null,
                relation: entry?.relation || 'SELLER',
                comment: entry?.comment || '',
                id: entry?.id || `${id}-${index}`
            }));
        }
    });
}

module.exports = {
    getRecommendations,
    getProperties: getRecommendations
};


require('dotenv').config();
const axios = require('axios');
const { CACHE_TTL } = require('../services/cacheService');
const { cachedProviderRequest } = require('./providerUtils');

const RAPID_API_KEY = (process.env.REALTOR16_API_KEY || process.env.RAPID_API_KEY || '').trim();
const REALTOR16_HOST = (process.env.REALTOR16_API_HOST || 'realtor16.p.rapidapi.com').trim();

function unwrap(payload) {
    if (!payload) return payload;
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) return payload.data;
    return payload;
}

async function getProperties(filters = {}) {
    const location = String(filters.city || filters.location || filters.address || 'houston ,tx');
    const searchRadius = typeof filters.search_radius !== 'undefined' ? filters.search_radius : 0;

    const query = `location=${encodeURIComponent(location)}&search_radius=${encodeURIComponent(searchRadius)}`;

    return cachedProviderRequest({
        provider: 'realtor-16',
        endpoint: `search/forsale?${query}`,
        params: { location, search_radius: searchRadius },
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => {
            const url = `https://${REALTOR16_HOST}/search/forsale?${query}`;

            try {
                console.log(`[R16] Requesting: ${url}`);
                console.log(`[R16] API Key loaded: ${RAPID_API_KEY ? 'YES' : 'NO'}`);
                
                const resp = await axios.get(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-rapidapi-key': RAPID_API_KEY,
                        'x-rapidapi-host': REALTOR16_HOST
                    },
                    timeout: 15000
                });

                console.log(`[R16] Response status: ${resp.status}`);
                console.log(`[R16] Response type: ${typeof resp.data}`);
                
                if (!resp || typeof resp.status === 'undefined') {
                    throw new Error('No response from realtor16');
                }

                if (resp.status < 200 || resp.status >= 300) {
                    throw new Error(resp.data?.message || `RapidAPI returned ${resp.status}`);
                }

                // Check if response contains error in body
                if (resp.data?.error || resp.data?.message?.includes('exceeded') || resp.data?.message?.includes('quota')) {
                    console.error('[R16] Error in response body:', resp.data?.message || resp.data?.error);
                    throw new Error(resp.data?.message || resp.data?.error || 'Unknown error in response');
                }

                const results = unwrap(resp.data);
                console.log(`[R16] Extracted results: ${Array.isArray(results) ? results.length : typeof results}`);
                
                return results;
            } catch (err) {
                console.error(`[R16] Fetch error: ${err.message}`);
                if (err.response) {
                    console.error(`[R16] Response status: ${err.response.status}`);
                    console.error(`[R16] Response data sample:`, JSON.stringify(err.response.data).substring(0, 200));
                    throw new Error(err.response.data?.message || `HTTP ${err.response.status}`);
                }
                throw err;
            }
        }
    });
}

module.exports = { getProperties };

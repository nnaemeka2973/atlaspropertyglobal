const providerManager = require('../providers/providerManager');
const realtyProvider = require('../providers/realtyProvider');
const usRealtorProvider = require('../providers/usRealtorProvider');

function normalizeListResponse(response) {
    if (!response) return response;
    return response?.data?.home_search && !response.home_search
        ? response.data
        : response;
}

async function getProperties(filters = {}) {
    console.log('🌍 Live request');

    const data = normalizeListResponse(await providerManager.getProperties(filters));

    return data || {
        home_search: {
            results: [],
            count: 0,
            metadata: {
                failures: ['no-data']
            }
        },
        metadata: {
            failures: ['no-data']
        }
    };
}

async function getAutocomplete(query) {
    return providerManager.autocomplete(query);
}

async function getPropertyDetails(id) {
    return providerManager.getPropertyDetails(id);
}

async function getPropertyPhotos(id) {
    return providerManager.getPropertyPhotos(id);
}

async function getSimilarHomes(id) {
    return providerManager.getSimilarHomes(id);
}

async function getAgentListings(fulfillmentId) {
    if (!fulfillmentId) return null;
    try {
        const resp = await realtyProvider.getAgentListings(fulfillmentId);
        return resp;
    } catch (e) {
        console.error('[SERVICE] getAgentListings failed:', e && e.message);
        return null;
    }
}

async function getAgentRecommendations(advertiserId) {
    const id = advertiserId || '1721302';
    try {
        const resp = await usRealtorProvider.getRecommendations(id);
        return resp;
    } catch (e) {
        console.error('[SERVICE] getAgentRecommendations failed:', e && e.message);
        return [];
    }
}

module.exports = {
    getProperties,
    getAutocomplete,
    getPropertyDetails,
    getPropertyPhotos,
    getSimilarHomes,
    getAgentListings,
    getAgentRecommendations
};

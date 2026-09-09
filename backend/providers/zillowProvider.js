require('dotenv').config();

const axios = require('axios');
const { CACHE_TTL } = require('../services/cacheService');
const { cachedProviderRequest } = require('./providerUtils');

// Accept either a dedicated ZILLOW_API_KEY or fall back to the shared RAPID_API_KEY / RAPIDAPI_KEY
const ZILLOW_API_KEY = (process.env.ZILLOW_API_KEY || process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY || '').trim();
// Default host to the RapidAPI Zillow mapping used in probes, allow override
const ZILLOW_API_HOST = (process.env.ZILLOW_API_HOST || 'real-estate-zillow-com.p.rapidapi.com').trim();
const ZILLOW_API_URL = (process.env.ZILLOW_API_URL || '').trim();
const REQUEST_TIMEOUT = Number(process.env.ZILLOW_REQUEST_TIMEOUT || 10000);
const ZILLOW_AUTOCOMPLETE_HOST = (process.env.ZILLOW_AUTOCOMPLETE_HOST || 'zillw-real-estate-api2.p.rapidapi.com').trim();
const ZILLOW_AUTOCOMPLETE_URL = (process.env.ZILLOW_AUTOCOMPLETE_URL || 'https://zillw-real-estate-api2.p.rapidapi.com/autocomplete/index.php').trim();

function toText(value) {
  return value == null ? '' : String(value);
}

function normalizeProperty(item, defaultStatus = 'for_sale') {
  const address = item?.address || {};
  return {
    id: toText(item?.zpid || item?.id || item?.listing_id || ''),
    provider: 'zillow',
    title: toText(item?.title || item?.streetAddress || `${address.city || ''} ${address.state || ''}`.trim()),
    address: toText(item?.address?.streetAddress || item?.streetAddress || ''),
    city: toText(item?.address?.city || item?.city || ''),
    state: toText(item?.address?.state || item?.state || ''),
    zipCode: toText(item?.address?.zipcode || item?.zipcode || ''),
    price: item?.price || item?.listPrice || item?.amount || '',
    bedrooms: item?.bedrooms || item?.beds || '',
    bathrooms: item?.bathrooms || item?.baths || '',
    sqft: item?.livingArea || item?.sqft || item?.area || '',
    propertyType: item?.propertyType || item?.homeType || '',
    status: item?.status || defaultStatus,
    image: item?.imgSrc || item?.image || item?.photo || '',
    images: [item?.imgSrc || item?.image || item?.photo || ''].filter(Boolean),
    description: item?.description || ''
  };
}

function extractResults(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.properties)) return payload.properties;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.homes)) return payload.homes;
  if (payload?.data && typeof payload.data === 'object') return extractResults(payload.data);
  if (payload?.results && typeof payload.results === 'object' && !Array.isArray(payload.results)) return extractResults(payload.results);
  return [];
}

async function getProperties(filters = {}) {
  if (!ZILLOW_API_KEY) {
    return { home_search: { results: [] }, metadata: { provider: 'zillow', error: 'missing-key' } };
  }

  const location = filters.city || filters.location || filters.zip || filters.address || 'new york';
  // Use the RapidAPI Zillow mapping endpoint (sale search per user request)
  const base = ZILLOW_API_URL || `https://${ZILLOW_API_HOST}`;
  const listingTypes = filters.listing_types || 'agent';
  const url = `${base}/v1/search/sale?location_or_rid=${encodeURIComponent(location)}&listing_types=${encodeURIComponent(listingTypes)}&property_types=house&sort=relevant&page=1&doz=7`;

  return cachedProviderRequest({
    provider: 'zillow',
    endpoint: 'v1/search/sale',
    params: { location },
    ttlSeconds: CACHE_TTL.search,
    fetcher: async () => {
      const maxAttempts = 3;
      let attempt = 0;
      let lastErr = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          const response = await axios.get(url, {
            headers: {
              'x-rapidapi-key': ZILLOW_API_KEY,
              'x-rapidapi-host': ZILLOW_API_HOST,
              'Content-Type': 'application/json'
            },
            timeout: REQUEST_TIMEOUT
          });

          if (!response || typeof response.status === 'undefined' || response.status < 200 || response.status >= 300) {
            lastErr = new Error(response?.data?.message || `HTTP ${response?.status}`);
            throw lastErr;
          }

          const results = extractResults(response.data).map((item) => normalizeProperty(item, 'sold'));
          return { home_search: { results }, metadata: { provider: 'zillow' } };
        } catch (err) {
          lastErr = err;
          const backoff = 200 * attempt;
          await new Promise((res) => setTimeout(res, backoff));
        }
      }

      throw lastErr || new Error('Zillow fetch failed');
    }
  });
}

async function autocomplete(query = '', opts = {}) {
  const searchTerm = String(query || '').trim();
  if (!searchTerm || !ZILLOW_API_KEY) {
    return [];
  }

  const maxResults = Number(opts.maxResults || 6);
  const userSearchContext = opts.userSearchContext || opts.user_search_context || 'FOR_SALE';

  try {
    const response = await fetch(ZILLOW_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': ZILLOW_API_KEY,
        'x-rapidapi-host': ZILLOW_AUTOCOMPLETE_HOST,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: searchTerm,
        user_search_context: userSearchContext,
        max_results: Number.isFinite(maxResults) && maxResults > 0 ? maxResults : 6
      })
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Zillow autocomplete failed with status ${response.status}`);
    }

    const parsed = text ? JSON.parse(text) : null;
    if (!parsed) return [];

    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.results)) return parsed.results;
    if (Array.isArray(parsed?.data)) return parsed.data;
    if (Array.isArray(parsed?.suggestions)) return parsed.suggestions;

    return [];
  } catch (error) {
    console.error('[zillowProvider] autocomplete failed:', error && error.message ? error.message : error);
    return [];
  }
}

module.exports = {
  getProperties,
  autocomplete
};

require('dotenv').config();

const axios = require('axios');
const { CACHE_TTL } = require('../services/cacheService');
const { cachedProviderRequest } = require('./providerUtils');

const UNOFFICIAL_REDFIN_API_HOST_DEFAULT = 'unofficial-redfin.p.rapidapi.com';
const UNOFFICIAL_REDFIN_API_URL_DEFAULT = `https://${UNOFFICIAL_REDFIN_API_HOST_DEFAULT}`;
const REQUEST_TIMEOUT_DEFAULT = 10000;

function getApiConfig() {
    const apiKey = (process.env.UNOFFICIAL_REDFIN_API_KEY || process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY || '').trim();
    const apiHost = (process.env.UNOFFICIAL_REDFIN_API_HOST || UNOFFICIAL_REDFIN_API_HOST_DEFAULT).trim();
    const apiUrl = (process.env.UNOFFICIAL_REDFIN_API_URL || `https://${apiHost}`).trim();
    const timeout = Number(process.env.UNOFFICIAL_REDFIN_REQUEST_TIMEOUT || REQUEST_TIMEOUT_DEFAULT);

    return {
        apiKey,
        apiHost,
        apiUrl,
        timeout
    };
}

function toText(value) {
    return value == null ? '' : String(value);
}

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function getValue(source, paths, fallback = '') {
    for (const path of paths) {
        let current = source;
        const parts = path.split('.');
        let found = true;

        for (const part of parts) {
            if (current && Object.prototype.hasOwnProperty.call(current, part)) {
                current = current[part];
            } else {
                found = false;
                break;
            }
        }

        if (found && current !== undefined && current !== null) {
            return current;
        }
    }

    return fallback;
}

function extractResults(payload) {
    if (!payload) return [];

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.properties)) return payload.properties;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload?.data && typeof payload.data === 'object') {
        return extractResults(payload.data);
    }

    return [];
}

function normalizeProperty(item = {}) {
    const address = item?.address || item?.location?.address || {};
    const price = getValue(item, ['price', 'list_price', 'listPrice', 'amount', 'price_value', 'priceValue'], '');
    const bedrooms = getValue(item, ['beds', 'bedrooms', 'bed_count', 'bedCount'], '');
    const bathrooms = getValue(item, ['baths', 'bathrooms', 'bath_count', 'bathCount'], '');
    const sqft = getValue(item, ['sqft', 'living_area', 'squareFeet', 'area'], '');
    const imageCandidates = asArray(getValue(item, ['image', 'photo', 'imageUrl', 'image_url', 'photos', 'images'], []));
    const primaryImage = toText(imageCandidates[0] || item?.thumbnail || item?.photo || '');

    return {
        id: toText(getValue(item, ['id', 'property_id', 'listing_id', 'mls_id'], item?.id || '')),
        provider: 'unofficial-redfin',
        title: toText(getValue(item, ['title', 'name', 'address', 'street_address', 'streetAddress', 'address.line'], '')),
        address: toText(getValue(address, ['street', 'street_address', 'line'], getValue(item, ['address', 'streetAddress'], ''))),
        city: toText(getValue(address, ['city'], getValue(item, ['city'], ''))),
        state: toText(getValue(address, ['state'], getValue(item, ['state'], ''))),
        zipCode: toText(getValue(address, ['zip', 'postal_code', 'postalCode'], getValue(item, ['zip'], ''))),
        price,
        bedrooms,
        bathrooms,
        sqft,
        status: toText(getValue(item, ['status', 'property_status', 'listing_status'], '')),
        image: primaryImage,
        images: imageCandidates.map((img) => toText(img)).filter(Boolean),
        description: toText(getValue(item, ['description', 'summary', 'publicRemarks'], ''))
    };
}

async function getProperties(filters = {}) {
    if (!UNOFFICIAL_REDFIN_API_KEY) {
        return {
            home_search: {
                results: []
            },
            metadata: {
                provider: 'unofficial-redfin',
                error: 'missing-key'
            }
        };
    }

    const location = filters.location || filters.city || filters.address || filters.postal_code || filters.zip || 'Miami';
    const regionId = filters.region_id || filters.regionId || filters.locationId || location;
    const regionType = filters.region_type || filters.regionType || 6;
    const params = {
        location,
        region_id: regionId,
        region_type: regionType,
        sf: filters.sf || '1,2,3,5,6,7',
        uipt: filters.uipt || '1,2,3,4,7,8',
        num_homes: filters.num_homes || filters.numHomes || 50,
        status: filters.status || '9'
    };

    const { apiKey, apiHost, apiUrl, timeout } = getApiConfig();

    return cachedProviderRequest({
        provider: 'unofficial-redfin',
        endpoint: 'properties/list',
        params,
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => {
            const response = await axios.get(`${apiUrl}/properties/list`, {
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': apiHost,
                    'Content-Type': 'application/json'
                },
                params,
                timeout
            });

            const results = extractResults(response.data).map(normalizeProperty);
            return {
                home_search: {
                    results
                },
                metadata: {
                    provider: 'unofficial-redfin'
                }
            };
        }
    });
}

module.exports = {
    getProperties
};

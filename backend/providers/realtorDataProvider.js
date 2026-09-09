require('dotenv').config();

const axios = require('axios');
const { CACHE_TTL } = require('../services/cacheService');
const { buildProviderResponse, extractListings, cachedProviderRequest } = require('./providerUtils');

const REALTOR_DATA_API_KEY = (process.env.REALTOR_DATA_API_KEY || process.env.RAPID_API_KEY || '').trim();
const REALTOR_DATA_API_HOST = (process.env.REALTOR_DATA_API_HOST || 'realtor-data3.p.rapidapi.com').trim();
const REALTOR_DATA_API_URL = (process.env.REALTOR_DATA_API_URL || `https://${REALTOR_DATA_API_HOST}`).trim();
const PROVIDER_NAME = 'realtor-data';

function toText(value) {
    return value == null ? '' : String(value);
}

function normalizeRealtorDataProperty(item = {}) {
    const address = item?.location?.address || item?.address || {};
    const streetParts = [
        address.line,
        address.street_number,
        address.street_name,
        address.street_suffix,
        address.unit
    ].filter(Boolean);
    const streetAddress = streetParts.join(' ').trim();
    const city = address.city || item?.city || '';
    const state = address.state_code || address.state || item?.state || '';
    const postalCode = address.postal_code || item?.zip || item?.postalCode || '';
    const realtorUrl = toText(item?.href || item?.permalink || item?.raw?.href || item?.raw?.permalink || item?.raw?.url || '');
    const title = item?.title || item?.name || streetAddress || `${city} ${state}`.trim();
    const primaryImage = toText(
        item?.primary_photo?.href ||
        item?.primary_photo?.url ||
        item?.photos?.[0]?.href ||
        item?.photos?.[0]?.url ||
        item?.image ||
        item?.photo ||
        ''
    );
    const images = [];

    if (Array.isArray(item?.photos)) {
        for (const photo of item.photos) {
            if (!photo) continue;
            if (typeof photo === 'object') {
                if (photo.href) images.push(toText(photo.href));
                else if (photo.url) images.push(toText(photo.url));
            } else {
                images.push(toText(photo));
            }
        }
    }

    if (Array.isArray(item?.images)) {
        for (const photo of item.images) {
            if (!photo) continue;
            if (typeof photo === 'object') {
                if (photo.href) images.push(toText(photo.href));
                else if (photo.url) images.push(toText(photo.url));
            } else {
                images.push(toText(photo));
            }
        }
    }

    const uniqueImages = Array.from(new Set(images));
    if (primaryImage && !uniqueImages.includes(primaryImage)) {
        uniqueImages.unshift(primaryImage);
    }

    const featureList = [];
    if (Array.isArray(item?.details)) {
        for (const detail of item.details) {
            if (detail?.text) {
                if (Array.isArray(detail.text)) {
                    featureList.push(...detail.text.map(toText));
                } else {
                    featureList.push(toText(detail.text));
                }
            }
        }
    }

    return {
        id: toText(item?.property_id || item?.id || item?.listing_id || ''),
        property_id: toText(item?.property_id || item?.id || item?.listing_id || ''),
        listing_id: toText(item?.listing_id || item?.id || item?.property_id || ''),
        providerPropertyId: toText(item?.property_id || item?.id || item?.listing_id || ''),
        realtorUrl,
        provider: PROVIDER_NAME,
        title: toText(title),
        address: toText(streetAddress),
        city: toText(city),
        state: toText(state),
        zipCode: toText(postalCode),
        list_price: item?.list_price ?? item?.price_value ?? item?.price ?? null,
        price: item?.list_price ?? item?.price_value ?? item?.price ?? null,
        price_value: Number(item?.list_price ?? item?.price_value ?? item?.price ?? 0) || null,
        status: toText(item?.status || item?.property_status || item?.listing_status || 'for_sale'),
        permalink: realtorUrl,
        description: {
            text: toText(item?.description?.text || item?.description?.summary || item?.description?.name || item?.description || ''),
            beds: item?.description?.beds ?? item?.description?.beds_min ?? item?.beds ?? item?.bedrooms ?? null,
            baths: item?.description?.baths ?? item?.description?.baths_full_calc ?? item?.baths ?? item?.bathrooms ?? null,
            sqft: item?.description?.sqft ?? item?.description?.living_area ?? item?.description?.lot_sqft ?? item?.sqft ?? item?.living_area ?? null,
            type: toText(item?.description?.type || item?.type || 'Residential')
        },
        location: {
            address: {
                line: toText(streetAddress),
                city: toText(city),
                state_code: toText(state),
                postal_code: toText(postalCode),
                country: toText(address.country || 'USA'),
                coordinate: {
                    lat: Number(item?.location?.address?.coordinate?.lat ?? item?.raw?.location?.address?.coordinate?.lat ?? null) || null,
                    lon: Number(item?.location?.address?.coordinate?.lon ?? item?.raw?.location?.address?.coordinate?.lon ?? null) || null
                }
            }
        },
        latitude: Number(item?.location?.address?.coordinate?.lat ?? item?.raw?.location?.address?.coordinate?.lat ?? null) || null,
        longitude: Number(item?.location?.address?.coordinate?.lon ?? item?.raw?.location?.address?.coordinate?.lon ?? null) || null,
        primary_photo: { href: primaryImage },
        photos: uniqueImages.map((href) => ({ href })),
        images: uniqueImages.map((href) => ({ href })),
        features: Array.from(new Set(featureList.filter(Boolean))),
        agent: item?.consumer_advertisers?.[0] || item?.advertisers?.[0] || null,
        consumer_advertisers: item?.consumer_advertisers || item?.advertisers || [],
        advertisers: item?.advertisers || item?.consumer_advertisers || [],
        raw: item
    };
}

function getRealtorUrl(listing = {}) {
    return toText(listing.href || listing.permalink || listing.realtorUrl || listing.raw?.href || listing.raw?.permalink || listing.raw?.url || '');
}

function buildFormattedAddress(listing = {}) {
    const address = listing.location?.address || listing.address || listing.raw?.location?.address || {};
    const line = toText(address.line || address.street_line || address.street_address || address.street_number && address.street_name ? `${address.street_number} ${address.street_name}${address.street_suffix ? ` ${address.street_suffix}` : ''}` : '');
    const city = toText(address.city || listing.city || '');
    const state = toText(address.state || address.state_code || listing.state || '');
    const zip = toText(address.postal_code || address.postalCode || address.zip || listing.zipCode || '');
    if (!line || !city || !state) return '';
    return `${line}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`.trim();
}

function findListingById(payload, id) {
    const candidates = extractListings(payload);
    if (!Array.isArray(candidates)) return null;
    const normalizedId = String(id);
    return candidates.find((item) => {
        const values = [item?.id, item?.property_id, item?.listing_id, item?.listingId, item?.raw?.property_id, item?.raw?.listing_id, item?.raw?.id];
        return values.some((value) => value != null && String(value) === normalizedId);
    }) || null;
}

async function resolveRealtorListingById(id) {
    if (!id) return null;
    const response = await getProperties({ property_id: id, listing_id: id, id });
    return findListingById(response, id);
}

async function fetchRealtorDetail(endpoint, params) {
    return cachedProviderRequest({
        provider: PROVIDER_NAME,
        endpoint,
        params,
        ttlSeconds: CACHE_TTL.details,
        fetcher: async () => {
            const response = await axios.get(`${REALTOR_DATA_API_URL}/${endpoint}`, {
                headers: {
                    'x-rapidapi-key': REALTOR_DATA_API_KEY,
                    'x-rapidapi-host': REALTOR_DATA_API_HOST,
                    'Content-Type': 'application/json'
                },
                params,
                timeout: 20000,
                validateStatus: (status) => status >= 200 && status < 500
            });

            console.log('[DETAILS] HTTP status:', response.status);
            if (response.status !== 200) {
                throw new Error(`Realtor Data ${endpoint} returned ${response.status}`);
            }

            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Realtor Data returned invalid detail payload');
            }

            return response.data;
        }
    });
}

async function getPropertyDetails(propertyOrId) {
    if (!REALTOR_DATA_API_KEY) {
        return null;
    }

    let listing = null;
    if (typeof propertyOrId === 'string' || typeof propertyOrId === 'number') {
        listing = await resolveRealtorListingById(propertyOrId);
    } else if (typeof propertyOrId === 'object' && propertyOrId !== null) {
        listing = propertyOrId;
    }

    const listingId = String(typeof propertyOrId === 'string' || typeof propertyOrId === 'number' ? propertyOrId : listing?.property_id || listing?.id || listing?.listing_id || '');
    console.log('[DETAILS] Requested property ID:', listingId);

    const realtorUrl = getRealtorUrl(listing);
    if (realtorUrl) {
        console.log('[DETAILS] Realtor URL:', realtorUrl);
        console.log('[DETAILS] Trying Realtor Data detail-by-url');
        try {
            const response = await fetchRealtorDetail('detail-by-url', { url: realtorUrl });
            const normalized = response?.data ? normalizeRealtorDataProperty(response.data) : null;
            if (normalized) {
                console.log('[DETAILS] Normalized property successfully');
                return normalized;
            }
        } catch (error) {
            console.log('[DETAILS] Realtor Data detail-by-url failed.');
            console.log(error.message);
        }
    }

    const formattedAddress = buildFormattedAddress(listing);
    if (formattedAddress) {
        console.log('[DETAILS] Formatted address:', formattedAddress);
        console.log('[DETAILS] Trying Realtor Data detail-by-address');
        try {
            const response = await fetchRealtorDetail('v2/detail', { query: formattedAddress });
            const normalized = response?.data ? normalizeRealtorDataProperty(response.data) : null;
            if (normalized) {
                console.log('[DETAILS] Normalized property successfully');
                return normalized;
            }
        } catch (error) {
            console.log('[DETAILS] Realtor Data detail-by-address failed.');
            console.log(error.message);
        }
    }

    return listing ? normalizeRealtorDataProperty(listing) : null;
}

async function getProperties(filters = {}) {
    if (!REALTOR_DATA_API_KEY) {
        return buildProviderResponse({
            results: [],
            provider: PROVIDER_NAME,
            metadata: { error: 'missing-key' }
        });
    }

    const location = filters.location || filters.city || filters.address || filters.zip || filters.postal_code || 'Miami, FL';
    const mode = String(filters?.type || filters?.listingType || filters?.transactionType || filters?.purchaseType || 'buy').toLowerCase();
    const endpoint = mode === 'rent' ? 'SearchRent' : 'SearchForSale';
    const url = `${REALTOR_DATA_API_URL}/${endpoint}?location=${encodeURIComponent(location)}&sort=best_match`;

    const config = {
        method: 'GET',
        url,
        headers: {
            'x-rapidapi-key': REALTOR_DATA_API_KEY,
            'x-rapidapi-host': REALTOR_DATA_API_HOST,
            'Content-Type': 'application/json'
        },
        timeout: 20000,
        validateStatus: (status) => status >= 200 && status < 500
    };

    try {
        const response = await axios(config);
        if (response.status !== 200) {
            throw new Error(`Realtor Data returned ${response.status}`);
        }

        const listings = extractListings(response.data);
        const normalized = listings.map((item) => normalizeRealtorDataProperty(item));

        return buildProviderResponse({
            results: normalized,
            provider: PROVIDER_NAME,
            metadata: { source: endpoint }
        });
    } catch (error) {
        console.log('[Realtor Data provider] request failed:', error.message || error);
        return buildProviderResponse({
            results: [],
            provider: PROVIDER_NAME,
            metadata: { source: endpoint, error: error.message || 'request_failed' }
        });
    }
}

module.exports = {
    getProperties,
    getPropertyDetails
};


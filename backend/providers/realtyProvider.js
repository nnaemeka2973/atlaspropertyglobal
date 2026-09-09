require("dotenv").config();

const { CACHE_TTL } = require("../services/cacheService");
const { cachedProviderRequest } = require("./providerUtils");

const RAPID_API_KEY = (process.env.RAPID_API_KEY || "").trim();
const RAPID_API_HOST = (process.env.RAPID_API_HOST || "").trim();
const LEGACY_REALTY_HOST = "realty-in-us.p.rapidapi.com";
const REALTY_API_HOST = (process.env.REALTY_API_HOST || RAPID_API_HOST || LEGACY_REALTY_HOST).trim();
const EFFECTIVE_REALTY_HOST = REALTY_API_HOST || RAPID_API_HOST || LEGACY_REALTY_HOST;
const EXPLICIT_US4_ENABLED = String(process.env.REALTY_IN_US4_ENABLED || "").toLowerCase() === "true";
const USE_REALTY_IN_US4 = EXPLICIT_US4_ENABLED && /realty-in-us4/i.test(EFFECTIVE_REALTY_HOST);

function unwrapResponse(payload) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
        return payload.data;
    }

    return payload;
}

function normalizeRealtyUs4Listing(item = {}) {
    const addressBlock = item?.location?.address || item?.address || item?.property?.location?.address || item?.property?.address || {};
    const rawAddress = item?.address || item?.address_line || item?.street_address || item?.location?.address?.line || item?.location?.formatted_address || item?.property?.address || addressBlock?.line || '';
    const city = item?.city || item?.location?.address?.city || addressBlock?.city || item?.property?.city || '';
    const state = item?.state || item?.state_code || item?.location?.address?.state || addressBlock?.state || item?.property?.state || '';
    const zipCode = item?.zip_code || item?.postal_code || item?.location?.address?.postal_code || addressBlock?.postal_code || item?.property?.zip_code || '';
    const priceValue = Number(item?.price ?? item?.list_price ?? item?.listPrice ?? item?.unformattedPrice ?? item?.property?.price ?? 0) || 0;
    const photoCandidates = [
        item?.primary_photo?.href,
        item?.primary_photo?.url,
        item?.image,
        item?.imgSrc,
        item?.photo,
        item?.photo_url,
        item?.media?.[0]?.url,
        item?.photos?.[0]?.href,
        item?.photos?.[0]?.url,
        item?.images?.[0]?.href,
        item?.images?.[0]?.url,
        item?.property?.image,
        item?.property?.photos?.[0]?.href,
        item?.location?.photos?.[0]?.href,
        Array.isArray(item?.photos) ? item.photos[0]?.href : null
    ].filter(Boolean);
    const descriptionBlock = item?.description || item?.summary || item?.property?.description || {};

    return {
        id: String(item?.id ?? item?.listing_id ?? item?.property_id ?? item?.propertyId ?? item?.zpid ?? `realty-us4-${Math.random().toString(36).slice(2, 10)}`),
        provider: 'realty-us4',
        providerName: 'Realty in US 4',
        title: item?.title || item?.address || item?.street_address || item?.location?.address?.line || `${city} ${state}`.trim() || 'Property Listing',
        address: rawAddress,
        city,
        state,
        zipCode,
        price: priceValue,
        list_price: priceValue,
        bedrooms: Number(item?.bedrooms ?? item?.beds ?? item?.description?.beds ?? item?.property?.bedrooms ?? 0) || null,
        bathrooms: Number(item?.bathrooms ?? item?.baths ?? item?.description?.baths ?? item?.property?.bathrooms ?? 0) || null,
        sqft: Number(item?.sqft ?? item?.area ?? item?.description?.sqft ?? item?.property?.sqft ?? 0) || null,
        propertyType: item?.property_type || item?.type || item?.description?.type || item?.property?.type || '',
        status: item?.status || item?.listing_status || item?.statusText || 'For sale',
        image: photoCandidates[0] || '',
        images: photoCandidates.filter((img, index, arr) => img && arr.indexOf(img) === index),
        description: item?.description || item?.summary || rawAddress || '',
        raw: item
    };
}

function buildRealtyUs4RequestBody(filters = {}, listLimit = 20) {
    const location = String(filters.location || filters.city || filters.state || filters.postal_code || filters.query || 'New York, NY').trim();

    return {
        location: location || 'New York, NY',
        limit: Number.isFinite(Number(filters.limit)) ? Math.min(Number(filters.limit), 200) : listLimit,
        offset: Number(filters.offset) || 0,
        sort: filters.sort || 'relevant'
    };
}

async function fetchRealtyUs4Request(body) {
    const response = await fetch(
        `https://${EFFECTIVE_REALTY_HOST}/v1/home-search`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': EFFECTIVE_REALTY_HOST
            },
            body: JSON.stringify(body)
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const message = data?.message || `RapidAPI returned ${response.status}`;
        if (response.status === 403 && EFFECTIVE_REALTY_HOST !== LEGACY_REALTY_HOST) {
            console.warn('[realtyProvider] Realty US 4 subscription check failed, falling back to Realty US host.');
            return fetchLegacyRealtyRequest(buildLegacyRealtyBody({
                city: body.location || 'New York, NY',
                limit: body.limit,
                offset: body.offset,
                type: 'buy'
            }));
        }
        throw new Error(message);
    }

    const payload = data?.data ?? data;
    const resultsContainer = payload?.homeSearch ?? payload?.home_search ?? payload?.search ?? payload;
    const rawResults = Array.isArray(resultsContainer?.results)
        ? resultsContainer.results
        : Array.isArray(resultsContainer?.data)
            ? resultsContainer.data
            : Array.isArray(resultsContainer?.properties)
                ? resultsContainer.properties
                : Array.isArray(resultsContainer?.listings)
                    ? resultsContainer.listings
                    : Array.isArray(payload?.results)
                        ? payload.results
                        : Array.isArray(payload?.properties)
                            ? payload.properties
                            : Array.isArray(payload?.listings)
                                ? payload.listings
                                : [];

    const normalized = rawResults.map(normalizeRealtyUs4Listing);

    return {
        home_search: {
            results: normalized,
            count: normalized.length,
            metadata: { provider: 'realty-us4' }
        },
        metadata: {
            provider: 'realty-us4',
            source: 'realty-us4'
        }
    };
}

function buildLegacyRealtyBody(filters = {}) {
    const requestedLimit = Number(filters.limit);
    const listLimit = Number.isFinite(requestedLimit) ? Math.min(requestedLimit, 200) : 20;
    const body = {
        limit: listLimit,
        offset: Number(filters.offset) || 0,
        postal_code: filters.postal_code || '90004',
        status: ['for_sale', 'ready_to_build'],
        sort: {
            direction: 'desc',
            field: 'list_date'
        }
    };

    if (filters.city) {
        body.city = filters.city;
        delete body.postal_code;
    }

    if (filters.state) {
        body.state_code = filters.state;
        delete body.postal_code;
    }

    return body;
}

async function fetchLegacyRealtyRequest(body) {
    const response = await fetch(
        `https://${LEGACY_REALTY_HOST}/properties/v3/list`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': LEGACY_REALTY_HOST
            },
            body: JSON.stringify(body)
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.message || `RapidAPI returned ${response.status}`);
    }

    if (data.errors && data.errors.length) {
        throw new Error(data.errors[0].extensions?.data?.message || data.errors[0].message);
    }

    return unwrapResponse(data);
}

async function getProperties(filters = {}) {
    const requestedLimit = Number(filters.limit);
    const listLimit = Number.isFinite(requestedLimit)
        ? Math.min(requestedLimit, 200)
        : 20;

    if (USE_REALTY_IN_US4) {
        const body = buildRealtyUs4RequestBody(filters, listLimit);

        return cachedProviderRequest({
            provider: 'realty-us4',
            endpoint: 'v1/home-search',
            params: body,
            ttlSeconds: CACHE_TTL.search,
            fetcher: async () => fetchRealtyUs4Request(body)
        });
    }

    const body = buildLegacyRealtyBody(filters);

    return cachedProviderRequest({
        provider: "realty-us",
        endpoint: "properties/v3/list",
        params: body,
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => fetchLegacyRealtyRequest(body)
    });
}

async function getPropertyDetails(propertyId) {
    if (USE_REALTY_IN_US4) {
        return cachedProviderRequest({
            provider: "realty-us4",
            endpoint: "v1/home",
            params: { listing_id: propertyId, property_id: propertyId },
            ttlSeconds: CACHE_TTL.details,
            fetcher: async () => {
                const payload = {
                    listing_id: String(propertyId || ''),
                    property_id: String(propertyId || '')
                };

                const response = await fetch(
                    `https://${EFFECTIVE_REALTY_HOST}/v1/home`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-rapidapi-key": RAPID_API_KEY,
                            "x-rapidapi-host": EFFECTIVE_REALTY_HOST
                        },
                        body: JSON.stringify(payload)
                    }
                );

                let data;
                try {
                    data = await response.json();
                } catch (error) {
                    const text = await response.text();
                    data = { message: text || error.message };
                }

                if (!response.ok) {
                    throw new Error(data?.message || "Failed to fetch property details.");
                }

                const result = unwrapResponse(data);
                const home = result?.home ?? result?.property ?? result?.data ?? null;

                if (!home || typeof home !== 'object') {
                    throw new Error('Realty in US 4 returned no detail payload for the requested property.');
                }

                const normalized = {
                    ...home,
                    id: String(home.id ?? home.property_id ?? home.listing_id ?? propertyId ?? ''),
                    property_id: String(home.property_id ?? home.id ?? home.listing_id ?? propertyId ?? ''),
                    listing_id: String(home.listing_id ?? home.id ?? home.property_id ?? propertyId ?? ''),
                    provider: 'realty-us4',
                    providerName: 'Realty in US 4',
                    providerPropertyId: String(home.providerPropertyId ?? home.property_id ?? home.id ?? home.listing_id ?? propertyId ?? '')
                };

                return normalized;
            }
        });
    }

    return cachedProviderRequest({
        provider: "realty-us",
        endpoint: "properties/v3/detail",
        params: { property_id: propertyId },
        ttlSeconds: CACHE_TTL.details,
        fetcher: async () => {
            const response = await fetch(
                `https://${EFFECTIVE_REALTY_HOST}/properties/v3/detail?property_id=${encodeURIComponent(propertyId)}`,
                {
                    method: "GET",
                    headers: {
                        "x-rapidapi-key": RAPID_API_KEY,
                        "x-rapidapi-host": EFFECTIVE_REALTY_HOST
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch property details.");
            }

            return unwrapResponse(data);
        }
    });
}

async function getPropertyPhotos(propertyId) {
    return cachedProviderRequest({
        provider: "realty-us",
        endpoint: "properties/v3/get-photos",
        params: { property_id: propertyId },
        ttlSeconds: CACHE_TTL.photos,
        fetcher: async () => {
            const response = await fetch(
                `https://${EFFECTIVE_REALTY_HOST}/properties/v3/get-photos?property_id=${encodeURIComponent(propertyId)}`,
                {
                    method: "GET",
                    headers: {
                        "x-rapidapi-key": RAPID_API_KEY,
                        "x-rapidapi-host": EFFECTIVE_REALTY_HOST
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch photos.");
            }

            return unwrapResponse(data);
        }
    });
}

async function getSimilarHomes(propertyId) {
    return cachedProviderRequest({
        provider: "realty-us",
        endpoint: "properties/v3/list-similar-homes",
        params: { property_id: propertyId },
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => {
            const response = await fetch(
                `https://${EFFECTIVE_REALTY_HOST}/properties/v3/list-similar-homes?property_id=${encodeURIComponent(propertyId)}`,
                {
                    method: "GET",
                    headers: {
                        "x-rapidapi-key": RAPID_API_KEY,
                        "x-rapidapi-host": EFFECTIVE_REALTY_HOST
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch similar homes.");
            }

            return unwrapResponse(data);
        }
    });
}

async function getAgentListings(fulfillmentId) {
    return cachedProviderRequest({
        provider: 'realty-us',
        endpoint: 'agents/v2/listings',
        params: { fulfillmentId },
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => {
            const url = `https://${EFFECTIVE_REALTY_HOST}/agents/v2/listings?fulfillmentId=${encodeURIComponent(fulfillmentId)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': EFFECTIVE_REALTY_HOST
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`RapidAPI returned ${response.status}`);
            }

            return unwrapResponse(data);
        }
    });
}

module.exports = {
    getProperties,
    getPropertyDetails,
    getPropertyPhotos,
    getSimilarHomes,
    getAgentListings
};
const { getOrSet, CACHE_TTL } = require("../services/cacheService");

async function makeRequest({ provider = "provider", method = "GET", url, headers = {}, body, parseJson = true }) {
    const options = {
        method,
        headers
    };

    if (body !== undefined && body !== null) {
        options.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);

    let data = null;

    if (parseJson) {
        try {
            data = await response.json();
        } catch (error) {
            data = null;
        }
    }

    return {
        provider,
        data,
        status: response.status,
        ok: response.ok,
        response
    };
}

async function cachedProviderRequest({
    provider = "provider",
    endpoint = "request",
    params = {},
    fetcher,
    ttlSeconds = CACHE_TTL.search,
    negativeTtlSeconds = CACHE_TTL.empty,
    staleWhileRevalidate = true
}) {
    return getOrSet({
        provider,
        endpoint,
        params,
        fetcher,
        ttlSeconds,
        negativeTtlSeconds,
        staleWhileRevalidate
    });
}

function normalizeProperty(item = {}, { provider = "unknown" } = {}) {
    const source = item?.property || item || {};
    const location = source?.location || item?.location || {};
    const address = location?.address || location || {};

    const price =
        item?.list_price ??
        item?.price ??
        item?.listPrice ??
        item?.price_value ??
        item?.priceValue ??
        source?.price ??
        source?.list_price ??
        null;

    const beds = item?.beds ?? source?.beds ?? item?.description?.beds ?? null;
    const baths = item?.baths ?? source?.baths ?? item?.description?.baths ?? null;
    const sqft = item?.sqft ?? source?.sqft ?? item?.description?.sqft ?? null;
    const type = item?.type ?? source?.type ?? item?.property_type ?? source?.property_type ?? "Residential";

    return {
        property_id: item?.property_id || item?.id || source?.property_id || source?.id || `${provider}-${Math.random().toString(36).slice(2, 10)}`,
        listing_id: item?.listing_id || item?.id || source?.listing_id || source?.id || null,
        list_price: price,
        price_value: Number(price) || null,
        status: item?.status || source?.status || "for_sale",
        provider,
        permalink: item?.permalink || source?.permalink || item?.url || source?.url || "",
        description: {
            beds,
            baths,
            sqft,
            type
        },
        location: {
            address: {
                line: address?.line || address?.street_line || address?.streetLine || "",
                city: address?.city || location?.city || "",
                state_code: address?.state_code || address?.state || location?.state_code || location?.state || "",
                postal_code: address?.postal_code || address?.postalCode || address?.zip || location?.postal_code || location?.zip || ""
            }
        },
        primary_photo: {
            href: item?.primary_photo?.href || item?.photo || source?.primary_photo?.href || source?.photo || ""
        },
        photos: item?.photos || source?.photos || [],
        raw: item
    };
}

function buildProviderResponse({ results = [], provider = "unknown", metadata = {} } = {}) {
    return {
        home_search: {
            results,
            provider,
            metadata,
            count: results.length
        },
        provider,
        metadata
    };
}

function extractListings(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];

    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.listings)) return payload.listings;
    if (Array.isArray(payload.properties)) return payload.properties;

    if (payload.data && typeof payload.data === "object") {
        return extractListings(payload.data);
    }

    if (payload.home_search && Array.isArray(payload.home_search.results)) {
        return payload.home_search.results;
    }

    return [];
}

module.exports = {
    makeRequest,
    cachedProviderRequest,
    normalizeProperty,
    buildProviderResponse,
    extractListings
};

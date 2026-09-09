const realty = require('./realtyProvider');
const florida = require('./floridaProvider');
const realtyBase = require('./realtyBaseProvider');
const unofficialRedfin = require('./unofficialRedfinProvider');
const realtorData = require('./realtorDataProvider');
const realtor16 = require('./realtor16Provider');
const zillow = require('./zillowProvider');
// simple in-memory provider health skip map
const providerSkip = {};
const fs = require('fs');

function extractResults(payload) {
    if (!payload) return [];

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.homes)) return payload.homes;
    if (Array.isArray(payload?.properties)) return payload.properties;
    if (Array.isArray(payload?.listings)) return payload.listings;
    if (Array.isArray(payload?.home_search?.results)) return payload.home_search.results;

    if (payload?.data && typeof payload.data === 'object') {
        const nested = extractResults(payload.data);
        if (nested.length > 0) {
            return nested;
        }
    }

    if (payload?.home_search && Array.isArray(payload.home_search.results)) {
        return payload.home_search.results;
    }

    if (payload?.buildings && typeof payload.buildings === 'object') {
        return Object.values(payload.buildings).map((building) => ({
            ...building,
            id: building.id,
            title: building.buildingName || building.address?.streetName || '',
            address: building.address?.streetNumber ? `${building.address.streetNumber} ${building.address.streetName || ''} ${building.address.streetType || ''}`.trim() : '',
            city: building.address?.city || '',
            state: building.address?.stateOrProvinceCode || '',
            zipCode: building.address?.postalCode || ''
        }));
    }
    return [];
}

function dedupeResults(results = []) {
    const seen = new Map();

    results.forEach((item) => {
        const key = item?.property_id || item?.id || item?.listing_id || item?.listingId || JSON.stringify(item);
        if (!seen.has(key)) {
            seen.set(key, item);
        }
    });

    return Array.from(seen.values());
}

function matchesRequestedLocation(item = {}, filters = {}) {
    const requestedCity = String(filters.city || filters.location || '').trim().toLowerCase();
    const requestedState = String(filters.state || '').trim().toLowerCase();
    const requestedPostal = String(filters.postal_code || '').trim();
    const haystack = [
        item?.city,
        item?.state,
        item?.zipCode,
        item?.address,
        item?.location?.address?.line,
        item?.location?.address?.city,
        item?.location?.address?.state,
        item?.location?.address?.postal_code,
        item?.raw?.address,
        item?.raw?.city,
        item?.raw?.state,
        item?.raw?.zipCode,
        item?.raw?.postal_code,
        item?.raw?.location?.address,
        item?.raw?.location?.city,
        item?.raw?.location?.state
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (!requestedCity && !requestedState && !requestedPostal) {
        return true;
    }

    if (requestedCity && haystack.includes(requestedCity)) {
        return true;
    }

    if (requestedState && haystack.includes(requestedState)) {
        return true;
    }

    if (requestedPostal && haystack.includes(requestedPostal.toLowerCase())) {
        return true;
    }

    return false;
}

function normalizePhotoEntry(photo = {}, fallbackCaption = null) {
    const rawUrl = photo?.href || photo?.url || photo?.image || photo?.original || photo?.large || photo?.medium || photo?.small || photo?.thumbnail || photo?.source?.href || photo?.source?.url || '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!url) return null;

    return {
        url,
        caption: photo?.caption ?? photo?.title ?? photo?.description ?? photo?.tags?.[0]?.label ?? fallbackCaption ?? null,
        type: 'property'
    };
}

function normalizePhotos(photos = [], fallbackImage = null, fallbackCaption = null) {
    const seen = new Set();
    const normalized = [];

    const add = (candidate) => {
        const item = normalizePhotoEntry(candidate, fallbackCaption);
        if (!item) return;
        const lookup = item.url.toLowerCase();
        if (!seen.has(lookup)) {
            seen.add(lookup);
            normalized.push(item);
        }
    };

    const candidates = Array.isArray(photos) ? photos : [];
    candidates.forEach(add);

    if (fallbackImage) {
        add({ href: fallbackImage, caption: fallbackCaption });
    }

    return normalized;
}

function runWithConcurrency(items, worker, concurrency = 4) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(items) || items.length === 0) {
            resolve([]);
            return;
        }

        const results = new Array(items.length);
        let index = 0;
        let running = 0;
        let failed = false;

        const launch = () => {
            while (running < concurrency && index < items.length) {
                const currentIndex = index;
                const currentItem = items[index];
                index += 1;
                running += 1;

                Promise.resolve(worker(currentItem, currentIndex))
                    .then((value) => {
                        results[currentIndex] = value;
                    })
                    .catch((error) => {
                        if (!failed) {
                            failed = true;
                            reject(error);
                        }
                    })
                    .finally(() => {
                        running -= 1;
                        if (index < items.length) {
                            launch();
                        } else if (running === 0) {
                            resolve(results);
                        }
                    });
            }
        };

        launch();
    });
}

async function enrichPropertiesWithPhotos(results = []) {
    if (!Array.isArray(results) || results.length === 0) {
        return results;
    }

    const worker = async (property) => {
        const propertyId = property?.property_id || property?.id || property?.listing_id || property?.listingId || property?.providerPropertyId;
        const primaryPhoto = property?.primary_photo?.href || property?.primary_photo?.url || property?.image || property?.photo || property?.photo_url || property?.raw?.primary_photo?.href || property?.raw?.image || property?.raw?.photo || null;
        const explicitPhotoCount = Number(property?.photo_count ?? property?.photoCount ?? 0);

        if (!propertyId || explicitPhotoCount === 0) {
            property.photos = normalizePhotos(property?.photos || property?.raw?.photos || [], primaryPhoto, null);
            property.image = property.image || primaryPhoto || property.photos?.[0]?.url || null;
            property.photoCount = explicitPhotoCount || property.photos.length || 0;
            if (property.photoCount === 0 && property.photos.length === 0) {
                property.image = null;
            }
            return property;
        }

        let fetchedPhotos = [];
        try {
            const photoPayload = await realty.getPropertyPhotos(propertyId);
            const candidates = Array.isArray(photoPayload)
                ? photoPayload
                : photoPayload?.home_search?.results || photoPayload?.results || photoPayload?.photos || [];

            if (Array.isArray(candidates)) {
                const target = candidates.find((entry) => {
                    const match = entry?.property_id || entry?.id || entry?.listing_id || entry?.listingId;
                    return match == null || String(match) === String(propertyId);
                }) || candidates[0] || {};

                fetchedPhotos = normalizePhotos(
                    target?.photos || target?.images || target?.gallery || candidates,
                    primaryPhoto,
                    null
                );
            }
        } catch (error) {
            console.warn(`[providerManager] Photo lookup failed for property ${propertyId}:`, error && error.message ? error.message : error);
        }

        const merged = normalizePhotos([
            ...(Array.isArray(property?.photos) ? property.photos : []),
            ...(Array.isArray(property?.raw?.photos) ? property.raw.photos : []),
            ...fetchedPhotos
        ], primaryPhoto, null);

        const finalPhotos = merged.filter((entry) => entry && typeof entry.url === 'string' && entry.url.trim());
        const finalPrimary = primaryPhoto || finalPhotos[0]?.url || null;

        property.primaryPhoto = property.primaryPhoto || property.primary_photo || { href: finalPrimary };
        if (property.primary_photo && typeof property.primary_photo === 'object') {
            property.primary_photo.href = property.primary_photo.href || finalPrimary || null;
        }
        property.image = finalPrimary || property.image || null;
        property.photos = finalPhotos;
        property.photoCount = Number(property?.photo_count ?? property?.photoCount ?? 0) || finalPhotos.length || 0;
        if (!property.photoCount && finalPhotos.length) property.photoCount = finalPhotos.length;
        if (property.image && property.photos.length && !property.photos.some((photo) => photo.url === property.image)) {
            property.photos.unshift({ url: property.image, caption: null, type: 'property' });
        }

        return property;
    };

    return runWithConcurrency(results, worker, 4);
}

function normalizeZillowListing(item = {}) {
    const address = item?.address || {};
    const city = item?.addressCity || item?.city || address.city || '';
    const state = item?.addressState || item?.state || address.state || '';
    const zipCode = item?.addressZipcode || item?.zipcode || address.zipcode || '';

    return {
        id: String(item?.zpid || item?.id || item?.listing_id || item?.listingId || `zillow-${Math.random().toString(36).slice(2, 10)}`),
        provider: 'zillow',
        providerName: 'Zillow',
        title: item?.title || item?.addressStreet || `${city} ${state}`.trim() || 'Zillow Property',
        address: item?.addressStreet || item?.address || '',
        city,
        state,
        zipCode,
        price: item?.unformattedPrice ?? item?.price ?? item?.listPrice ?? item?.soldPrice ?? null,
        bedrooms: item?.beds ?? null,
        bathrooms: item?.baths ?? null,
        sqft: item?.area ?? item?.livingArea ?? null,
        propertyType: item?.propertyType || item?.homeType || '',
        status: item?.statusText || item?.statusType || 'for_sale',
        image: item?.imgSrc || item?.image || item?.photo || '',
        images: [item?.imgSrc || item?.image || item?.photo || ''].filter(Boolean),
        description: item?.detailUrl || item?.description || '',
        raw: item
    };
}

function findPropertyById(payload, id) {
    const items = extractResults(payload);
    if (!items || !items.length) return null;

    const normalizedId = String(id);
    return items.find((item) => {
        const candidateIds = [item?.id, item?.property_id, item?.listing_id, item?.listingId];
        return candidateIds.some((value) => value != null && String(value) === normalizedId);
    }) || null;
}

async function tryProvider(name, provider, filters) {
    try {
        // provider health/skip check
        if (providerSkip[name] && providerSkip[name] > Date.now()) {
            console.log(`Skipping ${name} due to recent quota/health issue.`);
            return null;
        }

        console.log(`Trying ${name}...`);

        let result;
        const mode = String(filters?.type || filters?.listingType || filters?.transactionType || filters?.purchaseType || 'buy').toLowerCase();

        try { recordLiveCall(); } catch (e) { /* ignore */ }

        if (typeof provider.getProperties === 'function') {
            result = await provider.getProperties(filters);
        } else {
            return null;
        }

        const listings = extractResults(result);
        const count = listings.length;

        console.log(`${name}: ${count} listings`);

        if (count > 0) {
            return { name, result };
        }

        console.log(`${name} returned no listings.`);

        return null;
    } catch (err) {
        console.log(`${name} failed.`);
        console.log(err && err.message ? err.message : err);
        // If quota-like error, mark provider as skipped for next 24 hours
        try {
            const msg = err && (err.message || err.response && err.response.status);
            if (String(msg).toLowerCase().includes('quota') || (err?.response?.status === 429)) {
                providerSkip[name] = Date.now() + 24 * 60 * 60 * 1000;
                console.log(`Provider ${name} marked unhealthy until ${new Date(providerSkip[name]).toISOString()}`);
            }
        } catch (e) { /* ignore */ }
        return null;
    }
}

async function tryDetailProvider(name, provider, id, methodName) {
    if (typeof provider[methodName] === 'function') {
        try {
            console.log(`Trying detail provider ${name} for ${methodName}...`);
            try { recordLiveCall(); } catch (e) { /* ignore */ }
            const result = await provider[methodName](id);
            return result;
        } catch (err) {
            console.log(`${name} detail lookup failed for ${methodName}.`);
            console.log(err.message);
            // If the provider's detail method failed, try a search fallback
            if (methodName === 'getPropertyDetails' && typeof provider.getProperties === 'function') {
                console.log(`${name} detail method errored — attempting search fallback by ID.`);
                try {
                    const response = await provider.getProperties({
                        property_id: id,
                        listing_id: id,
                        id,
                        query: id,
                        city: id,
                        location: id,
                        address: id,
                        postal_code: id,
                        zip: id
                    });
                    const property = findPropertyById(response, id);
                    if (property) {
                        console.log(`${name} found detail data via fallback search after error.`);
                        return property;
                    }
                } catch (e) {
                    console.log(`${name} fallback search failed after detail error.`);
                    console.log(e.message || e);
                }
            }

            return null;
        }
    }

    if (methodName === 'getPropertyDetails' && typeof provider.getProperties === 'function') {
        console.log(`${name} does not support ${methodName}. Attempting search fallback by ID.`);
        try {
            const response = await provider.getProperties({
                property_id: id,
                listing_id: id,
                id,
                query: id,
                city: id,
                location: id,
                address: id,
                postal_code: id,
                zip: id
            });
            const property = findPropertyById(response, id);
            if (property) {
                console.log(`${name} found detail data by search fallback.`);
                return property;
            }
        } catch (err) {
            console.log(`${name} fallback search failed for ${methodName}.`);
            console.log(err.message);
        }
    }

    console.log(`${name} does not support ${methodName}. Skipping.`);
    return null;
}

async function autocomplete(query) {
    return [];
}

async function getProperties(filters = {}) {
    console.log('🌍 [getProperties] Attempting live property data fetch...');

    const prevDisable = process.env.DISABLE_PROVIDER_CACHE;
    process.env.DISABLE_PROVIDER_CACHE = 'true';

    let r16Message = '';
    let r16Error = null;
    const failures = [];

    try {
        console.log('[getProperties] Primary attempt: Realtor16...');
        try { recordLiveCall(); } catch (e) { /* ignore */ }

        try {
            const r16 = await realtor16.getProperties(filters);
            console.log('[getProperties] Realtor16 raw response type:', typeof r16);
            console.log('[getProperties] Realtor16 raw response keys:', r16 ? Object.keys(r16).slice(0, 10) : 'null');

            const r16items = extractResults(r16);
            console.log('[getProperties] Realtor16 extracted results count:', Array.isArray(r16items) ? r16items.length : 'not array');

            if (Array.isArray(r16items) && r16items.length > 0) {
                console.log(`[getProperties] ✓ Realtor16 returned ${r16items.length} listings.`);

                const annotated = r16items.map((item) => {
                    if (!item.providerPropertyId) item.providerPropertyId = item?.property_id || item?.id;
                    if (!item.provider) item.provider = 'realtor-16';
                    if (!item.providerName) item.providerName = 'Realtor16';
                    return item;
                });

                let results = annotated;
                if ((filters.city || filters.state || filters.postal_code) && results.length > 0) {
                    results = results.filter((item) => matchesRequestedLocation(item, filters));
                }

                const enrichedResults = await enrichPropertiesWithPhotos(dedupeResults(results));
                return {
                    home_search: { results: enrichedResults, count: enrichedResults.length, metadata: { sources: ['Realtor16'], failures: [] } },
                    provider: 'realtor-16',
                    metadata: { sources: ['Realtor16'], failures: [] }
                };
            }

            r16Message = r16?.metadata?.failures?.[0] || r16?.message || 'No results from Realtor16';
            failures.push(r16Message);
            console.log(`[getProperties] Realtor16 no results: ${r16Message}`);
        } catch (r16Error_inner) {
            r16Error = r16Error_inner;
            r16Message = r16Error_inner?.message || 'Realtor16 provider error';
            failures.push(r16Message);
            console.error(`[getProperties] Realtor16 error: ${r16Message}`);
            console.error(`[getProperties] Realtor16 error details:`, r16Error_inner);
        }

        const fallbackProviders = [
            { name: 'realty-us', provider: realty },
            { name: 'realty-base', provider: realtyBase },
            { name: 'florida', provider: florida },
            { name: 'realtor-data', provider: realtorData },
            { name: 'zillow', provider: zillow }
        ];

        for (const entry of fallbackProviders) {
            const providerResult = await tryProvider(entry.name, entry.provider, filters);
            if (!providerResult) continue;

            const rawResults = extractResults(providerResult.result);
            if (!Array.isArray(rawResults) || rawResults.length === 0) continue;

            let results = rawResults;
            if ((filters.city || filters.state || filters.postal_code) && results.length > 0) {
                results = results.filter((item) => matchesRequestedLocation(item, filters));
            }

            const deduped = dedupeResults(results);
            const enrichedResults = await enrichPropertiesWithPhotos(deduped);
            const uniqueFailures = failures.filter(Boolean);

            return {
                home_search: {
                    results: enrichedResults,
                    count: enrichedResults.length,
                    metadata: {
                        sources: [entry.name, ...('realtor-16' in uniqueFailures ? [] : [])],
                        failures: uniqueFailures
                    }
                },
                provider: entry.name,
                metadata: {
                    sources: [entry.name],
                    failures: uniqueFailures
                }
            };
        }

        return {
            home_search: {
                results: [],
                count: 0,
                metadata: { sources: ['Realtor16'], failures: failures.length ? failures : ['Realtor16 unavailable or quota exceeded'] }
            },
            provider: 'realtor-16',
            metadata: { sources: ['Realtor16'], failures: failures.length ? failures : ['Realtor16 unavailable or quota exceeded'] }
        };
    } catch (error) {
        console.error('[getProperties] Fatal error:', error?.message || error);
        return {
            home_search: { results: [], count: 0, metadata: { sources: ['Error'], failures: [error?.message || 'Unknown error'] } },
            provider: 'none',
            metadata: { sources: ['Error'], failures: [error?.message || 'Unknown error'] } 
        };
    } finally {
        process.env.DISABLE_PROVIDER_CACHE = prevDisable;
    }
}

async function getPropertyDetails(id) {
    let idStr = null;

    if (typeof id === 'object' && id !== null) {
        idStr = String(id?.id || id?.property_id || id?.providerPropertyId || '');
    } else {
        idStr = String(id || '');
    }

    if (!idStr) {
        console.log('[DETAILS] No ID provided');
        return null;
    }

    const providerCandidates = [
        { name: 'Realtor16', provider: realtor16 },
        { name: 'Realty Base US', provider: realtyBase },
        { name: 'Realty US', provider: realty },
        { name: 'Florida', provider: florida },
        { name: 'Realtor Data', provider: realtorData },
        { name: 'Zillow', provider: zillow }
    ];

    for (const candidate of providerCandidates) {
        console.log(`[DETAILS] Looking up property ${idStr} from ${candidate.name}...`);

        try {
            const prevDisable = process.env.DISABLE_PROVIDER_CACHE;
            process.env.DISABLE_PROVIDER_CACHE = 'true';

            try { recordLiveCall(); } catch (e) { /* ignore */ }

            let detailResult = null;
            if (typeof candidate.provider.getPropertyDetails === 'function') {
                detailResult = await candidate.provider.getPropertyDetails(idStr);
            }

            process.env.DISABLE_PROVIDER_CACHE = prevDisable;

            if (detailResult && typeof detailResult === 'object') {
                const direct = Array.isArray(detailResult)
                    ? detailResult.find((item) => {
                        const itemId = String(item?.id || item?.property_id || item?.listing_id || item?.providerPropertyId || '');
                        return itemId === idStr;
                    }) || detailResult[0]
                    : detailResult;

                if (direct && (direct.id || direct.property_id || direct.listing_id || direct.providerPropertyId || direct.address || direct.city)) {
                    if (!direct.provider) direct.provider = candidate.name.toLowerCase().replace(/\s+/g, '-');
                    if (!direct.providerName) direct.providerName = candidate.name;
                    if (!direct.providerPropertyId) direct.providerPropertyId = idStr;
                    console.log(`[DETAILS] Found property ${idStr} from ${candidate.name} using native detail endpoint`);
                    return direct;
                }
            }

            const searchResult = await candidate.provider.getProperties({
                property_id: idStr,
                listing_id: idStr,
                id: idStr,
                query: idStr,
                city: idStr,
                location: idStr,
                address: idStr,
                postal_code: idStr,
                zip: idStr
            });

            const items = extractResults(searchResult);
            if (Array.isArray(items) && items.length > 0) {
                const property = items.find((item) => {
                    const itemId = String(item?.id || item?.property_id || item?.listing_id || item?.providerPropertyId || '');
                    return itemId === idStr;
                }) || items[0];

                if (property) {
                    if (!property.provider) property.provider = candidate.name.toLowerCase().replace(/\s+/g, '-');
                    if (!property.providerName) property.providerName = candidate.name;
                    if (!property.providerPropertyId) property.providerPropertyId = idStr;

                    console.log(`[DETAILS] Found property ${idStr} from ${candidate.name} via search fallback`);
                    return property;
                }
            }

            console.log(`[DETAILS] Property ${idStr} not found in ${candidate.name} results`);
        } catch (error) {
            console.error(`[DETAILS] ${candidate.name} lookup failed:`, error && error.message ? error.message : error);
        }
    }

    return null;
}

async function getPropertyPhotos(id) {
    const idStr = String(id || '');

    if (!idStr) {
        console.log('[PHOTOS] No ID provided');
        return null;
    }

    const providerCandidates = [
        { name: 'Realtor16', provider: realtor16 },
        { name: 'Realty Base US', provider: realtyBase },
        { name: 'Realty US', provider: realty },
        { name: 'Florida', provider: florida },
        { name: 'Realtor Data', provider: realtorData },
        { name: 'Zillow', provider: zillow }
    ];

    for (const candidate of providerCandidates) {
        console.log(`[PHOTOS] Looking up photos for property ${idStr} from ${candidate.name}...`);

        try {
            const prevDisable = process.env.DISABLE_PROVIDER_CACHE;
            process.env.DISABLE_PROVIDER_CACHE = 'true';

            try { recordLiveCall(); } catch (e) { /* ignore */ }

            let photoResult = null;
            if (typeof candidate.provider.getPropertyPhotos === 'function') {
                photoResult = await candidate.provider.getPropertyPhotos(idStr);
            }

            process.env.DISABLE_PROVIDER_CACHE = prevDisable;

            if (Array.isArray(photoResult)) {
                const photos = normalizePhotos(photoResult, null, null);
                if (photos.length) {
                    console.log(`[PHOTOS] Found ${photos.length} photos for property ${idStr} from ${candidate.name}`);
                    return photos;
                }
            }

            const searchResult = await candidate.provider.getProperties({
                property_id: idStr,
                listing_id: idStr,
                id: idStr,
                query: idStr,
                city: idStr,
                location: idStr,
                address: idStr,
                postal_code: idStr,
                zip: idStr
            });

            const items = extractResults(searchResult);
            if (Array.isArray(items) && items.length > 0) {
                const property = items.find((item) => {
                    const itemId = String(item?.id || item?.property_id || item?.listing_id || item?.providerPropertyId || '');
                    return itemId === idStr;
                }) || items[0];

                if (property) {
                    const photos = normalizePhotos(
                        property?.photos || property?.images || property?.gallery || [],
                        property?.primary_photo?.href || property?.image || null
                    );

                    if (photos.length) {
                        console.log(`[PHOTOS] Found ${photos.length} photos for property ${idStr} from ${candidate.name}`);
                        return photos;
                    }
                }
            }
        } catch (error) {
            console.error(`[PHOTOS] ${candidate.name} lookup failed:`, error && error.message ? error.message : error);
        }
    }

    console.log(`[PHOTOS] No photos found for property ${idStr}`);
    return null;
}

async function getSimilarHomes(id) {
    const idStr = String(id || '');

    console.log(`[SIMILAR] Realtor16 does not support similar homes lookup for property ${idStr}`);

    return {
        success: false,
        supported: false,
        provider: 'realtor-16',
        propertyId: idStr,
        message: 'Realtor16 API does not support similar homes functionality.'
    };
}

module.exports = {
    autocomplete,
    getProperties,
    getPropertyDetails,
    getPropertyPhotos,
    getSimilarHomes
};

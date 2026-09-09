const supabase = require("../config/supabase");

const CACHE_TTL = {
    search: 6 * 60 * 60,
    details: 24 * 60 * 60,
    photos: 7 * 24 * 60 * 60,
    autocomplete: 30 * 24 * 60 * 60,
    mortgage: 12 * 60 * 60,
    empty: 30 * 60
};

const pendingRequests = new Map();
const backgroundRefreshes = new Map();

function log(level, message, payload = "") {
    const suffix = payload ? ` ${typeof payload === "string" ? payload : JSON.stringify(payload)}` : "";
    console.log(`[cache] ${level} ${message}${suffix}`);
}

function normalizeForKey(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeForKey(entry));
    }

    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
                accumulator[key] = normalizeForKey(value[key]);
                return accumulator;
            }, {});
    }

    return value;
}

function generateCacheKey(provider, endpoint, params = {}) {
    const normalizedParams = normalizeForKey(params || {});
    const queryString = JSON.stringify(normalizedParams);
    return `${String(provider || "unknown")}:${String(endpoint || "unknown")}:${queryString}`;
}

function isNegativePayload(payload) {
    if (Array.isArray(payload)) {
        return payload.length === 0;
    }

    if (!payload || typeof payload !== "object") {
        return false;
    }

    if (Array.isArray(payload?.home_search?.results) && payload.home_search.results.length === 0) {
        return true;
    }

    if (Array.isArray(payload?.results) && payload.results.length === 0) {
        return true;
    }

    if (Array.isArray(payload?.photos) && payload.photos.length === 0) {
        return true;
    }

    if (Array.isArray(payload?.images) && payload.images.length === 0) {
        return true;
    }

    return payload?.status === 404 || payload?.code === 404 || payload?.message === "No results found";
}

function getTtlSeconds(data, fallbackTtlSeconds) {
    return isNegativePayload(data) ? CACHE_TTL.empty : (fallbackTtlSeconds || CACHE_TTL.search);
}

function getExpiresAt(ttlSeconds) {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + ttlSeconds);
    return expires.toISOString();
}

function getSupabaseRowData(row) {
    if (!row) {
        return null;
    }
    const responsePayload = row.response_json ?? row.response ?? null;
    if (responsePayload === null || responsePayload === undefined) {
        return null;
    }

    return responsePayload;
}

async function get(cacheKey) {
    try {
        const { data, error } = await supabase
            .from("search_cache")
            .select("*")
            .eq("cache_key", cacheKey)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            log("CACHE MISS", cacheKey);
            return null;
        }

        const responsePayload = getSupabaseRowData(data);
        if (!responsePayload) {
            log("CACHE ERROR", cacheKey, "Missing cached payload");
            return null;
        }

        const expiresAt = new Date(data.expires_at);
        const expired = Number.isNaN(expiresAt.getTime()) || expiresAt < new Date();

        if (expired) {
            log("CACHE EXPIRED", cacheKey, data.expires_at);
            return {
                cacheKey,
                expired: true,
                data: responsePayload,
                expiresAt: data.expires_at
            };
        }

        log("CACHE HIT", cacheKey);
        return {
            cacheKey,
            expired: false,
            data: responsePayload,
            expiresAt: data.expires_at
        };
    } catch (error) {
        log("CACHE ERROR", cacheKey, error.message || error);
        return null;
    }
}

async function set(cacheKey, data, ttlSeconds = CACHE_TTL.search, provider = "unknown", endpoint = "unknown") {
    try {
        const expiresAt = getExpiresAt(ttlSeconds);
        const now = new Date().toISOString();

        const { error } = await supabase
            .from("search_cache")
            .upsert(
                {
                    cache_key: cacheKey,
                    provider,
                    endpoint,
                    response_json: data,
                    expires_at: expiresAt,
                    created_at: now,
                    updated_at: now
                },
                {
                    onConflict: "cache_key"
                }
            );

        if (error) {
            throw error;
        }

        log("CACHE SAVE", cacheKey, `${ttlSeconds}s`);
        // Attempt to index saved payload so property-detail fallbacks can find items by id
        try {
            await indexCacheEntry(cacheKey, data);
        } catch (e) {
            log('CACHE ERROR', `indexCacheEntry:${cacheKey}`, e && e.message ? e.message : e);
        }
        return true;
    } catch (error) {
        log("CACHE ERROR", cacheKey, error.message || error);
        return false;
    }
}

async function deleteCache(cacheKey) {
    try {
        const { error } = await supabase
            .from("search_cache")
            .delete()
            .eq("cache_key", cacheKey);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        log("CACHE ERROR", cacheKey, error.message || error);
        return false;
    }
}

async function isExpired(cacheKey) {
    const cached = await get(cacheKey);
    return cached ? cached.expired : true;
}

async function getOrSet({
    provider,
    endpoint,
    params = {},
    fetcher,
    ttlSeconds = CACHE_TTL.search,
    negativeTtlSeconds = CACHE_TTL.empty,
    staleWhileRevalidate = true
}) {
    if (typeof fetcher !== "function") {
        throw new Error("cacheService.getOrSet requires a fetcher function.");
    }

    if (process.env.NODE_ENV === "test" || process.env.DISABLE_PROVIDER_CACHE === "true") {
        return fetcher();
    }

    const cacheKey = generateCacheKey(provider, endpoint, params);

    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }

    const cached = await get(cacheKey);

    if (cached && !cached.expired) {
        return cached.data;
    }

    if (cached && cached.expired && staleWhileRevalidate) {
        log("BACKGROUND REFRESH", cacheKey);

        if (!backgroundRefreshes.has(cacheKey)) {
            const backgroundRefresh = (async () => {
                try {
                    const freshData = await fetcher();
                    const finalTtl = getTtlSeconds(freshData, ttlSeconds);
                    await set(cacheKey, freshData, finalTtl, provider, endpoint);
                    return freshData;
                } catch (error) {
                    log("CACHE ERROR", cacheKey, error.message || error);
                    return null;
                } finally {
                    backgroundRefreshes.delete(cacheKey);
                }
            })();

            backgroundRefreshes.set(cacheKey, backgroundRefresh);
        }

        return cached.data;
    }

    log("CACHE MISS", cacheKey);
    const pendingPromise = (async () => {
        const freshData = await fetcher();
        const finalTtl = getTtlSeconds(freshData, ttlSeconds);
        await set(cacheKey, freshData, finalTtl, provider, endpoint);
        return freshData;
    })();

    pendingRequests.set(cacheKey, pendingPromise);

    try {
        return await pendingPromise;
    } catch (error) {
        log("CACHE ERROR", cacheKey, error.message || error);
        throw error;
    } finally {
        pendingRequests.delete(cacheKey);
    }
}

async function findCachedPayloadByPropertyId(propertyId, limit = 200) {
    if (!propertyId) return null;
    try {
        const { data, error } = await supabase
            .from('search_cache')
            .select('response_json, updated_at')
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (error) {
            log('CACHE ERROR', `findCachedPayloadByPropertyId:${propertyId}`, error.message || error);
            return null;
        }

        if (!Array.isArray(data) || data.length === 0) return null;

        function findInObject(obj, id) {
            if (!obj || typeof obj !== 'object') return false;

            // Direct id fields on the object
            const candidates = [obj.id, obj.property_id, obj.listing_id, obj.listingId, obj.raw?.id, obj.raw?.property_id, obj.raw?.listing_id];
            for (const c of candidates) {
                if (c != null && String(c) === String(id)) return true;
            }

            // Check arrays commonly used for search results
            const arrays = ['results', 'listings', 'properties', 'home_search'];
            for (const key of arrays) {
                const val = obj[key];
                if (!val) continue;
                if (Array.isArray(val)) {
                    for (const item of val) {
                        if (findInObject(item, id)) return true;
                    }
                } else if (key === 'home_search' && Array.isArray(val.results)) {
                    for (const item of val.results) {
                        if (findInObject(item, id)) return true;
                    }
                }
            }

            // Deep traverse some nested objects
            for (const k of Object.keys(obj)) {
                try {
                    const v = obj[k];
                    if (v && typeof v === 'object') {
                        if (findInObject(v, id)) return true;
                    }
                } catch (e) {
                    continue;
                }
            }

            return false;
        }

        for (const row of data) {
            const payload = row.response_json ?? row.response ?? null;
            if (!payload) continue;

            if (findInObject(payload, propertyId)) {
                return payload;
            }
        }

        return null;
    } catch (error) {
        log('CACHE ERROR', `findCachedPayloadByPropertyId:${propertyId}`, error.message || error);
        return null;
    }
}

async function indexCacheEntry(cacheKey, payload) {
    if (!cacheKey || !payload) return false;

    function collectIds(obj, out = new Set()) {
        if (!obj || typeof obj !== 'object') return out;

        const candidates = [obj.id, obj.property_id, obj.listing_id, obj.listingId, obj.raw?.id, obj.raw?.property_id, obj.raw?.listing_id];
        for (const c of candidates) {
            if (c != null) out.add(String(c));
        }

        const arrays = ['results', 'listings', 'properties', 'home_search'];
        for (const key of arrays) {
            const val = obj[key];
            if (!val) continue;
            if (Array.isArray(val)) {
                for (const item of val) collectIds(item, out);
            } else if (key === 'home_search' && Array.isArray(val.results)) {
                for (const item of val.results) collectIds(item, out);
            }
        }

        for (const k of Object.keys(obj)) {
            try {
                const v = obj[k];
                if (v && typeof v === 'object') collectIds(v, out);
            } catch (e) {
                continue;
            }
        }

        return out;
    }

    try {
        const ids = Array.from(collectIds(payload));
        if (!ids.length) return false;

        const now = new Date().toISOString();
        // Upsert mapping rows into property_cache_index
        const rows = ids.map((pid) => ({ property_id: pid, cache_key: cacheKey, updated_at: now }));

        const { error } = await supabase
            .from('property_cache_index')
            .upsert(rows, { onConflict: ['property_id'] });

        if (error) {
            log('CACHE ERROR', `indexCacheEntry:${cacheKey}`, error.message || error);
            return false;
        }

        log('CACHE INDEXED', cacheKey, `ids:${ids.length}`);
        return true;
    } catch (error) {
        log('CACHE ERROR', `indexCacheEntry:${cacheKey}`, error.message || error);
        return false;
    }
}

async function findCacheKeyForPropertyId(propertyId) {
    if (!propertyId) return null;
    try {
        const { data, error } = await supabase
            .from('property_cache_index')
            .select('cache_key')
            .eq('property_id', String(propertyId))
            .maybeSingle();

        if (error) {
            log('CACHE ERROR', `findCacheKeyForPropertyId:${propertyId}`, error.message || error);
            return null;
        }

        return data?.cache_key || null;
    } catch (error) {
        log('CACHE ERROR', `findCacheKeyForPropertyId:${propertyId}`, error.message || error);
        return null;
    }
}

    async function getLatestCacheByProvider(provider) {
        if (!provider) return null;
        try {
            const { data, error } = await supabase
                .from('search_cache')
                .select('response_json, updated_at')
                .eq('provider', String(provider))
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                log('CACHE ERROR', `getLatestCacheByProvider:${provider}`, error.message || error);
                return null;
            }

            if (!data) return null;
            return data.response_json ?? data.response ?? null;
        } catch (error) {
            log('CACHE ERROR', `getLatestCacheByProvider:${provider}`, error.message || error);
            return null;
        }
    }

// Simple in-memory metrics
const metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    liveCalls: 0
};

function recordCacheHit() { metrics.cacheHits += 1; }
function recordCacheMiss() { metrics.cacheMisses += 1; }
function recordLiveCall() { metrics.liveCalls += 1; }
function getMetrics() { return { ...metrics }; }

module.exports = {
    CACHE_TTL,
    get,
    set,
    delete: deleteCache,
    deleteCache,
    isExpired,
    generateCacheKey,
    getOrSet,
    getCache: get,
    saveCache: set
    ,
    findCachedPayloadByPropertyId
    ,
    indexCacheEntry,
    getLatestCacheByProvider,
    findCacheKeyForPropertyId,
    recordCacheHit,
    recordCacheMiss,
    recordLiveCall,
    getMetrics
};
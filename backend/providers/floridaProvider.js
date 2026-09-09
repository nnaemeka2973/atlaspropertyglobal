require("dotenv").config();

const { CACHE_TTL } = require("../services/cacheService");
const { cachedProviderRequest, makeRequest, normalizeProperty, buildProviderResponse, extractListings } = require("./providerUtils");

const RAPID_API_KEY = (process.env.FLORIDA_API_KEY || process.env.RAPID_API_KEY || "").trim();
const RAPID_API_HOST = (process.env.FLORIDA_API_HOST || "florida-realty-api1.p.rapidapi.com").trim();
const PROVIDER_NAME = "florida-realty";

async function getProperties(filters = {}) {
    const zip = filters.zip || filters.postal_code || "33914";
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;

    const url = `https://${RAPID_API_HOST}/realty/listings?zip=${zip}&limit=${limit}&offset=${offset}`;

    return cachedProviderRequest({
        provider: PROVIDER_NAME,
        endpoint: "realty/listings",
        params: { zip, limit, offset },
        ttlSeconds: CACHE_TTL.search,
        fetcher: async () => {
            const response = await makeRequest({
                provider: PROVIDER_NAME,
                method: "GET",
                url,
                headers: {
                    "x-rapidapi-key": RAPID_API_KEY,
                    "x-rapidapi-host": RAPID_API_HOST,
                    "Content-Type": "application/json"
                },
                parseJson: true
            });

            const listings = extractListings(response.data);

            return buildProviderResponse({
                results: listings.map((item) => normalizeProperty(item, { provider: PROVIDER_NAME })),
                provider: PROVIDER_NAME,
                metadata: { source: "florida-realty" }
            });
        }
    });
}

module.exports = {
    getProperties
};

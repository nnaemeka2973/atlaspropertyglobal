require('dotenv').config();

const axios = require('axios');
const { CACHE_TTL } = require('../services/cacheService');
const { cachedProviderRequest } = require('./providerUtils');

const REALTY_BASE_API_KEY = (process.env.REALTY_BASE_API_KEY || process.env.RAPID_API_KEY || '').trim();
const REALTY_BASE_API_HOST = (process.env.REALTY_BASE_API_HOST || 'realty-base-us.p.rapidapi.com').trim();
const REALTY_BASE_API_URL = (process.env.REALTY_BASE_API_URL || '').trim();
const REQUEST_TIMEOUT = Number(process.env.REALTY_BASE_REQUEST_TIMEOUT || 10000);

function toText(value) {
  return value == null ? null : String(value);
}

function getFirstValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  return null;
}

function getPhotoUrlFromEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return typeof entry === 'string' ? entry : null;
  }

  const url = getFirstValue(
    entry?.original,
    entry?.high_res,
    entry?.large,
    entry?.full,
    entry?.medium,
    entry?.small,
    entry?.thumbnail,
    entry?.href,
    entry?.url,
    entry?.image,
    entry?.src
  );

  if (typeof url === 'string' && url.trim()) {
    return url.trim();
  }

  return null;
}

function getPhotoUrlCandidates(item = {}) {
  const candidates = [];

  const addCandidate = (value) => {
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value.trim());
    }
  };

  addCandidate(item?.primary_photo?.original);
  addCandidate(item?.primary_photo?.high_res);
  addCandidate(item?.primary_photo?.large);
  addCandidate(item?.primary_photo?.full);
  addCandidate(item?.primary_photo?.medium);
  addCandidate(item?.primary_photo?.small);
  addCandidate(item?.primary_photo?.thumbnail);
  addCandidate(item?.primary_photo?.href);
  addCandidate(item?.primary_photo?.url);

  const photoCollection = [
    ...(Array.isArray(item?.photos) ? item.photos : []),
    ...(Array.isArray(item?.images) ? item.images : [])
  ];

  photoCollection.forEach((entry) => {
    if (entry && typeof entry === 'object') {
      addCandidate(entry?.original);
      addCandidate(entry?.high_res);
      addCandidate(entry?.large);
      addCandidate(entry?.full);
      addCandidate(entry?.medium);
      addCandidate(entry?.small);
      addCandidate(entry?.thumbnail);
      addCandidate(entry?.href);
      addCandidate(entry?.url);
      addCandidate(entry?.image);
      addCandidate(entry?.src);
    } else {
      addCandidate(entry);
    }
  });

  return candidates;
}

function getPrimaryImage(item = {}) {
  const candidates = getPhotoUrlCandidates(item);
  if (candidates.length === 0) {
    return getFirstValue(
      item?.primary_photo?.href,
      item?.primary_photo?.url,
      item?.cover_image?.href,
      item?.cover_image?.url,
      item?.coverImage?.href,
      item?.coverImage?.url,
      item?.photo?.href,
      item?.photo?.url,
      item?.image,
      item?.photo
    );
  }

  const ranked = candidates.filter((value) => typeof value === 'string' && value.trim());
  const hasHigherResolution = ranked.some((value) => /original|high[_-]?res|large|full/i.test(value));
  const preferred = ranked.find((value) => /original|high[_-]?res|large|full/i.test(value)) || ranked[0];

  if (!hasHigherResolution && preferred) {
    console.log('[Realty Base provider] No higher-resolution photo URLs were found; using the available photo URL.');
  }

  return preferred || null;
}

function getGalleryImages(item = {}, fallbackImage = null) {
  const photoEntries = [];

  if (Array.isArray(item?.photos)) {
    photoEntries.push(...item.photos);
  }

  if (Array.isArray(item?.images)) {
    photoEntries.push(...item.images);
  }

  const gallery = photoEntries
    .map((entry) => getPhotoUrlFromEntry(entry))
    .filter((value) => value !== null && value !== undefined && value !== '');

  if (fallbackImage && !gallery.includes(fallbackImage)) {
    gallery.unshift(fallbackImage);
  }

  return gallery;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error) {
  const status = Number(error?.response?.status || error?.status || 0);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function normalizeProperty(item = {}, defaultStatus = 'for_sale') {
  const address = item?.location?.address || item?.address || null;
  const description = item?.description || {};
  const primaryImage = getPrimaryImage(item);
  const galleryImages = getGalleryImages(item, primaryImage);
  const priceValue = getFirstValue(item?.list_price, item?.price, item?.list_price_min, item?.list_price_max, item?.price_value, item?.priceValue);
  const addressLine = getFirstValue(address?.line, item?.address_line_1, item?.address_line_2, item?.street_address, item?.address);
  const city = getFirstValue(address?.city, item?.city);
  const state = getFirstValue(address?.state, item?.state);
  const stateCode = getFirstValue(address?.state_code, item?.state_code, item?.stateCode);
  const zipCode = getFirstValue(address?.postal_code, address?.zip_code, address?.zip, item?.postal_code, item?.zip_code, item?.zip);
  const latitude = getFirstValue(address?.coordinate?.lat, item?.latitude, item?.lat);
  const longitude = getFirstValue(address?.coordinate?.lon, item?.longitude, item?.lon);
  const propertyType = getFirstValue(description?.type, item?.property_type, item?.type);
  const bedrooms = getFirstValue(description?.beds, description?.beds_min, description?.beds_max, item?.bedrooms, item?.beds);
  const bathrooms = getFirstValue(description?.baths, description?.baths_min, description?.baths_max, item?.bathrooms, item?.baths);
  const sqft = getFirstValue(description?.sqft, description?.sqft_min, description?.sqft_max, item?.sqft, item?.square_feet, item?.living_area);
  const title = getFirstValue(item?.title, item?.name, addressLine, `${city || ''} ${state || ''}`.trim());

  return {
    id: toText(getFirstValue(item?.id, item?.property_id, item?.listing_id, item?.zpid)),
    property_id: toText(getFirstValue(item?.property_id, item?.id, item?.listing_id, item?.zpid)),
    provider: 'realty-base',
    providerName: 'Realty Base US',
    providerPropertyId: toText(getFirstValue(item?.property_id, item?.id, item?.listing_id, item?.zpid)),
    title: toText(title),
    status: toText(getFirstValue(item?.status, defaultStatus)),
    type: toText(propertyType),
    propertyType: toText(propertyType),
    list_price: priceValue,
    price: priceValue,
    priceValue: priceValue != null ? Number(priceValue) : null,
    location: {
      address: {
        line: toText(addressLine),
        city: toText(city),
        state: toText(state),
        state_code: toText(stateCode),
        postal_code: toText(zipCode),
        country: toText(address?.country || item?.country),
        coordinate: {
          lat: latitude != null ? Number(latitude) : null,
          lon: longitude != null ? Number(longitude) : null
        }
      }
    },
    address: {
      line: toText(addressLine),
      city: toText(city),
      state: toText(state),
      state_code: toText(stateCode),
      postal_code: toText(zipCode),
      country: toText(address?.country || item?.country),
      coordinate: {
        lat: latitude != null ? Number(latitude) : null,
        lon: longitude != null ? Number(longitude) : null
      }
    },
    city: toText(city),
    state: toText(state),
    zipCode: toText(zipCode),
    postal_code: toText(zipCode),
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    bedrooms: bedrooms != null ? Number(bedrooms) : null,
    bathrooms: bathrooms != null ? Number(bathrooms) : null,
    sqft: sqft != null ? Number(sqft) : null,
    description: {
      name: toText(title),
      type: toText(propertyType),
      beds: bedrooms != null ? Number(bedrooms) : null,
      baths: bathrooms != null ? Number(bathrooms) : null,
      sqft: sqft != null ? Number(sqft) : null,
      text: toText(description?.text || description?.summary || item?.description || null),
      status: toText(getFirstValue(item?.status, defaultStatus))
    },
    primary_photo: primaryImage ? { href: toText(primaryImage) } : null,
    photo: primaryImage ? { href: toText(primaryImage) } : null,
    image: toText(primaryImage),
    photos: galleryImages.map((image) => ({ href: toText(image) })),
    images: galleryImages.map((image) => ({ href: toText(image) })),
    gallery: galleryImages.map((image) => toText(image)),
    features: Array.isArray(item?.details) ? item.details.map((detail) => detail?.text).filter(Boolean).flat() : [],
    list_date: toText(item?.list_date || item?.created_at || null),
    listedAt: toText(item?.list_date || item?.created_at || null)
  };
}

function extractResults(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.properties)) return payload.properties;
  if (Array.isArray(payload?.listings)) return payload.listings;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.homes)) return payload.homes;
  if (payload?.results && typeof payload.results === 'object' && !Array.isArray(payload.results)) return extractResults(payload.results);
  if (payload?.data && typeof payload.data === 'object') return extractResults(payload.data);
  return [];
}

async function getProperties(filters = {}) {
  if (!REALTY_BASE_API_KEY) {
    return { home_search: { results: [] }, metadata: { provider: 'realty-base', error: 'missing-key' } };
  }

  const location = filters.city || filters.location || filters.zip || filters.address || '10001';
  const mode = String(filters?.type || filters?.listingType || filters?.transactionType || filters?.purchaseType || 'buy').toLowerCase();
  const endpoint = mode === 'rent' ? 'SearchRent' : 'SearchForSale';
  const url = `${REALTY_BASE_API_URL || `https://${REALTY_BASE_API_HOST}`}/${endpoint}?location=${encodeURIComponent(location)}&sort=best_match`;

  return cachedProviderRequest({
    provider: 'realty-base',
    endpoint,
    params: { location, sort: 'best_match', mode },
    ttlSeconds: CACHE_TTL.search,
    fetcher: async () => {
      const requestConfig = {
        headers: {
          'x-rapidapi-key': REALTY_BASE_API_KEY,
          'x-rapidapi-host': REALTY_BASE_API_HOST,
          'Content-Type': 'application/json'
        },
        timeout: REQUEST_TIMEOUT
      };

      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const response = await axios.get(url, requestConfig);
          const rawResults = extractResults(response.data);
          const firstProperty = rawResults[0];

          if (firstProperty) {
            console.log('[Realty Base provider] Raw property payload:');
            console.log(JSON.stringify(firstProperty, null, 2));
          }

          const results = rawResults.map((item) => normalizeProperty(item));
          return { home_search: { results }, metadata: { provider: 'realty-base' } };
        } catch (error) {
          lastError = error;

          if (!shouldRetry(error) || attempt >= 3) {
            break;
          }

          const delay = attempt * 500;
          console.log(`[Realty Base provider] Rate limit retry in ${delay}ms (attempt ${attempt}/3)`);
          await sleep(delay);
        }
      }

      return { home_search: { results: [] }, metadata: { provider: 'realty-base', error: lastError?.message || 'request-failed' } };
    }
  });
}

module.exports = {
  getProperties,
  async getPropertyDetails(propertyId) {
    if (!REALTY_BASE_API_KEY) {
      return null;
    }

    const id = String(propertyId || '').trim();
    if (!id) return null;

    const requestConfig = {
      headers: {
        'x-rapidapi-key': REALTY_BASE_API_KEY,
        'x-rapidapi-host': REALTY_BASE_API_HOST,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT
    };

    const attemptUrls = [];

    // Common possible endpoints / query patterns (best-effort)
    if (REALTY_BASE_API_URL) {
      attemptUrls.push(`${REALTY_BASE_API_URL}/Listing/${encodeURIComponent(id)}`);
      attemptUrls.push(`${REALTY_BASE_API_URL}/Property?listing_id=${encodeURIComponent(id)}`);
      attemptUrls.push(`${REALTY_BASE_API_URL}/Property?id=${encodeURIComponent(id)}`);
      attemptUrls.push(`${REALTY_BASE_API_URL}/SearchForSale?query=${encodeURIComponent(id)}`);
      attemptUrls.push(`${REALTY_BASE_API_URL}/SearchRent?query=${encodeURIComponent(id)}`);
      attemptUrls.push(`${REALTY_BASE_API_URL}/SearchForSale?location=${encodeURIComponent(id)}`);
      attemptUrls.push(`${REALTY_BASE_API_URL}/SearchRent?location=${encodeURIComponent(id)}`);
    } else {
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/Listing/${encodeURIComponent(id)}`);
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/Property?listing_id=${encodeURIComponent(id)}`);
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/Property?id=${encodeURIComponent(id)}`);
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/SearchForSale?query=${encodeURIComponent(id)}`);
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/SearchRent?query=${encodeURIComponent(id)}`);
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/SearchForSale?location=${encodeURIComponent(id)}`);
      attemptUrls.push(`https://${REALTY_BASE_API_HOST}/SearchRent?location=${encodeURIComponent(id)}`);
    }

    let lastError = null;

    for (const url of attemptUrls) {
      try {
        const response = await axios.get(url, requestConfig);
        const rawResults = extractResults(response.data);
        // try to find matching item by id in rawResults
        const found = (rawResults || []).find((item) => {
          const candidates = [item?.id, item?.property_id, item?.listing_id, item?.zpid, item?.listingId];
          return candidates.some((c) => c != null && String(c) === id);
        });

        if (found) {
          return normalizeProperty(found);
        }

        // If response itself looks like a single property object
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
          const single = response.data;
          const candidates = [single?.id, single?.property_id, single?.listing_id, single?.zpid, single?.listingId];
          if (candidates.some((c) => c != null && String(c) === id)) {
            return normalizeProperty(single);
          }
        }
      } catch (error) {
        lastError = error;
        if (!shouldRetry(error)) {
          // continue trying other patterns
          continue;
        }
        // retry after small delay
        await sleep(250);
      }
    }

    // Final fallback: use existing search flow to try to locate the property
    try {
      const searchResponse = await getProperties({ city: id });
      const items = extractResults(searchResponse);
      const property = (items || []).find((item) => {
        const candidates = [item?.id, item?.property_id, item?.listing_id, item?.zpid, item?.listingId];
        return candidates.some((c) => c != null && String(c) === id);
      });
      if (property) return property;
    } catch (e) {
      // ignore
    }

    return null;
  }
};

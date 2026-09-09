process.env.NODE_ENV = 'test';
process.env.RUNNING_TESTS = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const axios = require('axios');

const floridaProvider = require('../providers/floridaProvider');
const realtyProvider = require('../providers/realtyProvider');
const realtyBaseProvider = require('../providers/realtyBaseProvider');
const unofficialRedfinProvider = require('../providers/unofficialRedfinProvider');
const providerManager = require('../providers/providerManager');
const realtorDataProvider = require('../providers/realtorDataProvider');
const zillowProvider = require('../providers/zillowProvider');
const usRealtorProvider = require('../providers/usRealtorProvider');

test('florida provider module loads', () => {
  assert.equal(typeof floridaProvider.getProperties, 'function');
});

test('unofficial Redfin provider module loads', () => {
  assert.equal(typeof unofficialRedfinProvider.getProperties, 'function');
});

test('realtor-data provider module loads', () => {
  assert.equal(typeof realtorDataProvider.getProperties, 'function');
});

test('provider manager can resolve a live property detail lookup without throwing', async () => {
  const result = await providerManager.getPropertyDetails('2923093336');
  assert.ok(result === null || typeof result === 'object');
  if (result && result.property_id) {
    assert.ok(String(result.property_id).length > 0);
  }
});

test('favorite service returns an empty list when Supabase requests fail', async () => {
  const supabase = require('../config/supabase');
  const originalFrom = supabase.from;

  supabase.from = () => ({
    select: () => ({
      eq: () => ({
        order: () => {
          throw new Error('TypeError: fetch failed');
        }
      })
    })
  });

  try {
    const result = await require('../services/favoriteService').getFavorites('user-123');
    assert.deepEqual(result, []);
  } finally {
    supabase.from = originalFrom;
  }
});

test('realty base provider uses the buy endpoint for buy searches', async () => {
  const originalGet = axios.get;
  const calls = [];

  axios.get = async (url, config) => {
    calls.push({ url, config });
    return { data: { results: [] } };
  };

  try {
    await realtyBaseProvider.getProperties({ city: 'New York', type: 'buy' });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /SearchForSale/);
  } finally {
    axios.get = originalGet;
  }
});

test('realty base provider prefers the highest-resolution photo field', async () => {
  const originalGet = axios.get;

  axios.get = async () => ({
    data: {
      results: [{
        id: 'rb-photo-test',
        title: 'Photo Quality Test',
        primary_photo: { href: 'https://example.com/thumb.jpg' },
        photos: [{
          href: 'https://example.com/thumbnail.jpg',
          thumbnail: 'https://example.com/thumbnail.jpg',
          medium: 'https://example.com/medium.jpg',
          large: 'https://example.com/large.jpg',
          original: 'https://example.com/original.jpg'
        }],
        description: {}
      }]
    }
  });

  try {
    const result = await realtyBaseProvider.getProperties({ city: 'Miami', type: 'buy' });
    assert.equal(result.home_search.results[0].image, 'https://example.com/original.jpg');
    assert.equal(result.home_search.results[0].primary_photo.href, 'https://example.com/original.jpg');
  } finally {
    axios.get = originalGet;
  }
});

test('provider manager includes Realty Base results when available', async () => {
  const originalRealty = realtyProvider.getProperties;
  const originalFlorida = floridaProvider.getProperties;
  const originalRealtyBase = realtyBaseProvider.getProperties;
  const originalRealtorData = realtorDataProvider.getProperties;

  realtyProvider.getProperties = async () => ({ home_search: { results: [] } });
  floridaProvider.getProperties = async () => ({ home_search: { results: [] } });
  realtorDataProvider.getProperties = async () => ({ home_search: { results: [] } });
  realtyBaseProvider.getProperties = async () => ({
    home_search: {
      results: [{
        id: 'rb-1',
        title: 'Realty Base Test Listing',
        address: '123 Main St',
        city: 'Miami',
        state: 'FL'
      }]
    }
  });

  try {
    const result = await providerManager.getProperties({ city: 'Miami' });
    assert.equal(result.home_search.results.length, 1);
    assert.equal(result.home_search.results[0].title, 'Realty Base Test Listing');
  } finally {
    realtyProvider.getProperties = originalRealty;
    floridaProvider.getProperties = originalFlorida;
    realtorDataProvider.getProperties = originalRealtorData;
    realtyBaseProvider.getProperties = originalRealtyBase;
  }
});

test('provider manager falls back to Realty Base for property detail lookup', async () => {
  const realtor16Provider = require('../providers/realtor16Provider');
  const originalR16 = realtor16Provider.getProperties;
  const originalRealtyBase = realtyBaseProvider.getProperties;

  realtor16Provider.getProperties = async () => ({ home_search: { results: [] } });
  realtyBaseProvider.getProperties = async () => ({
    home_search: {
      results: [{
        id: 'rb-detail-42',
        property_id: 'rb-detail-42',
        listing_id: 'rb-detail-42',
        title: 'Realty Base Detail Listing',
        city: 'Miami',
        state: 'FL'
      }]
    }
  });

  try {
    const result = await providerManager.getPropertyDetails('rb-detail-42');
    assert.ok(result);
    assert.equal(result.id, 'rb-detail-42');
    assert.equal(result.title, 'Realty Base Detail Listing');
  } finally {
    realtor16Provider.getProperties = originalR16;
    realtyBaseProvider.getProperties = originalRealtyBase;
  }
});

test('provider manager does not return stale cached Zillow results when live providers fail', async () => {
  const originalRealty = realtyProvider.getProperties;
  const originalZillow = zillowProvider.getProperties;
  const originalExists = fs.existsSync;
  const originalRead = fs.readFileSync;
  const originalRealtyEnabled = process.env.REALTY_IN_US4_ENABLED;

  process.env.REALTY_IN_US4_ENABLED = 'false';
  realtyProvider.getProperties = async () => {
    throw new Error('Realty API unavailable');
  };
  zillowProvider.getProperties = async () => {
    throw new Error('Zillow API unavailable');
  };

  fs.existsSync = (path) => path === './tmp/zillow-cache.json';
  fs.readFileSync = () => JSON.stringify({
    home_search: {
      results: [{ id: 'cached-zillow-1', title: 'Cached Zillow Listing', city: 'Austin', state: 'TX' }]
    }
  });

  try {
    const result = await providerManager.getProperties({ city: 'Austin', state: 'TX', type: 'buy' });
    assert.equal(result.home_search.results.length, 0);
    assert.deepEqual(result.home_search.metadata.failures.includes('Zillow'), true);
  } finally {
    realtyProvider.getProperties = originalRealty;
    zillowProvider.getProperties = originalZillow;
    fs.existsSync = originalExists;
    fs.readFileSync = originalRead;
    if (typeof originalRealtyEnabled === 'undefined') {
      delete process.env.REALTY_IN_US4_ENABLED;
    } else {
      process.env.REALTY_IN_US4_ENABLED = originalRealtyEnabled;
    }
  }
});

test('realty base provider retries after temporary 429 rate limits', async () => {
  const originalGet = axios.get;
  let attempts = 0;

  axios.get = async () => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error('Request failed with status code 429');
      error.response = { status: 429 };
      throw error;
    }

    return {
      data: {
        results: [{
          id: 'rb-retry-test',
          title: 'Retry Test Listing',
          city: 'Miami',
          state: 'FL',
          primary_photo: { href: 'https://example.com/retry.jpg' }
        }]
      }
    };
  };

  try {
    const result = await realtyBaseProvider.getProperties({ city: 'Miami', type: 'buy' });
    assert.equal(result.home_search.results.length, 1);
    assert.equal(result.home_search.results[0].title, 'Retry Test Listing');
    assert.equal(attempts, 2);
  } finally {
    axios.get = originalGet;
  }
});

test('provider manager requests both buy and rent modes for all-listings requests', async () => {
  const originalRealty = realtyProvider.getProperties;
  const originalFlorida = floridaProvider.getProperties;
  const originalRealtyBase = realtyBaseProvider.getProperties;
  const calls = [];

  realtyProvider.getProperties = async () => ({ home_search: { results: [] } });
  floridaProvider.getProperties = async () => ({ home_search: { results: [] } });
  realtyBaseProvider.getProperties = async (filters = {}) => {
    calls.push(filters?.type || 'buy');
    return { home_search: { results: [] } };
  };

  try {
    await providerManager.getProperties({ city: 'Miami', type: 'all' });
    assert.ok(calls.includes('buy'));
    assert.ok(calls.includes('rent'));
  } finally {
    realtyProvider.getProperties = originalRealty;
    floridaProvider.getProperties = originalFlorida;
    realtyBaseProvider.getProperties = originalRealtyBase;
  }
});

test('provider manager returns a fallback property list when Realtor16 is unavailable', async () => {
  const originalRealtor16 = require('../providers/realtor16Provider').getProperties;
  const originalRealty = realtyProvider.getProperties;
  const originalZillow = zillowProvider.getProperties;
  const originalRealtyBase = realtyBaseProvider.getProperties;

  require('../providers/realtor16Provider').getProperties = async () => {
    const error = new Error('You have exceeded the MONTHLY quota for Requests on your current plan, BASIC');
    error.response = { status: 429 };
    throw error;
  };
  realtyProvider.getProperties = async () => ({ home_search: { results: [{ id: 'realty-1', title: 'Fallback Listing', city: 'Miami', state: 'FL' }] } });
  zillowProvider.getProperties = async () => ({ home_search: { results: [{ id: 'zillow-1', title: 'Zillow Listing', city: 'Miami', state: 'FL' }] } });
  realtyBaseProvider.getProperties = async () => ({ home_search: { results: [{ id: 'rb-1', title: 'RealtyBase Listing', city: 'Miami', state: 'FL' }] } });

  try {
    const result = await providerManager.getProperties({ city: 'Miami' });
    assert.equal(result.provider, 'realtor-16');
    assert.ok(Array.isArray(result.home_search.results));
    assert.ok(result.home_search.results.length > 0);
    assert.ok(result.home_search.metadata.failures.some((entry) => String(entry).includes('MONTHLY quota')));
  } finally {
    require('../providers/realtor16Provider').getProperties = originalRealtor16;
    realtyProvider.getProperties = originalRealty;
    zillowProvider.getProperties = originalZillow;
    realtyBaseProvider.getProperties = originalRealtyBase;
  }
});

test('realty provider parses the live Realty in US 4 homeSearch response format', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        homeSearch: {
          count: 1,
          results: [{
            property_id: 'abc-123',
            listing_id: 'listing-123',
            status: 'for_sale',
            list_price: 420000,
            location: {
              address: {
                line: '123 Main St',
                city: 'Miami',
                state: 'Florida',
                postal_code: '33101',
                country: 'USA'
              }
            },
            primary_photo: { href: 'https://example.com/home.jpg' },
            photos: [{ href: 'https://example.com/home.jpg' }],
            description: { beds: 3, baths: 2, sqft: 1800, type: 'single_family' }
          }]
        }
      }
    })
  });

  try {
    const result = await realtyProvider.getProperties({ city: 'Miami', state: 'FL', limit: 1 });
    assert.equal(result.home_search.results.length, 1);
    assert.equal(result.home_search.results[0].city, 'Miami');
    assert.equal(result.home_search.results[0].price, 420000);
  } finally {
    global.fetch = originalFetch;
  }
});

test('realty provider sends requests to the configured Realty in US 4 host header', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url, headers: options.headers || {}, body: options.body || null });
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { homeSearch: { results: [] } } })
    };
  };

  try {
    await realtyProvider.getProperties({ city: 'Houston', state: 'TX', limit: 1 });
    assert.match(calls[0].url, /realty-in-us4\.p\.rapidapi\.com\/v1\/home-search/);
    assert.equal(calls[0].headers['x-rapidapi-host'], 'realty-in-us4.p.rapidapi.com');
  } finally {
    global.fetch = originalFetch;
  }
});

test('realty provider details request uses the Realty in US 4 home endpoint with listing and property IDs', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', headers: options.headers || {}, body: options.body || null });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          home: {
            id: '2923093336',
            property_id: '2923093336',
            listing_id: '2923093336',
            title: 'Test Home',
            city: 'Brooklyn'
          }
        }
      })
    };
  };

  try {
    const result = await realtyProvider.getPropertyDetails('2923093336');
    assert.ok(calls.length >= 1);
    assert.match(calls[0].url, /realty-in-us4\.p\.rapidapi\.com\/v1\/home$/);
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].body, /"listing_id":"2923093336"/);
    assert.match(calls[0].body, /"property_id":"2923093336"/);
    assert.equal(result.id, '2923093336');
    assert.equal(result.city, 'Brooklyn');
  } finally {
    global.fetch = originalFetch;
  }
});

test('realty provider treats a null-home payload as a failed detail lookup', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        home: null,
        id: '2998963990',
        property_id: '2998963990',
        listing_id: '2998963990',
        provider: 'realty-us4'
      }
    })
  });

  try {
    const result = await realtyProvider.getPropertyDetails('2998963990');
    assert.equal(result, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('provider manager filters mixed-market results to the requested market', async () => {
  const originalRealtyGet = realtyProvider.getProperties;
  const originalZillowGet = zillowProvider.getProperties;

  realtyProvider.getProperties = async () => ({
    home_search: {
      results: [{ id: 'realty-miami-1', title: 'Miami Live Listing', city: 'Miami', state: 'FL', price: 800000 }]
    }
  });

  zillowProvider.getProperties = async () => ({ home_search: { results: [] } });

  try {
    const result = await providerManager.getProperties({ city: 'Miami', state: 'FL', type: 'all', limit: 5 });
    assert.ok(result.home_search.results.length >= 1);
    assert.ok(result.home_search.results.every((item) => String(item.city).toLowerCase() === 'miami'));
    assert.equal(result.home_search.results[0].city, 'Miami');
  } finally {
    realtyProvider.getProperties = originalRealtyGet;
    zillowProvider.getProperties = originalZillowGet;
  }
});

test('provider manager refuses wrongful-city Zillow quick returns', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRunningTests = process.env.RUNNING_TESTS;
  const originalTestMode = process.env.TEST_MODE;
  const originalAxiosGet = axios.get;
  const originalRealtyGet = realtyProvider.getProperties;
  const originalZillowGet = zillowProvider.getProperties;

  delete process.env.NODE_ENV;
  delete process.env.RUNNING_TESTS;
  delete process.env.TEST_MODE;

  axios.get = async () => ({
    data: {
      listings: [{
        zpid: 'z-1',
        addressStreet: '10 Zillow Ave',
        addressCity: 'Austin',
        addressState: 'TX',
        addressZipcode: '78701',
        unformattedPrice: 123456,
        beds: 2,
        baths: 2,
        area: 1100,
        imgSrc: 'https://example.com/zillow.jpg',
        statusText: 'For sale',
        propertyType: 'SingleFamily'
      }]
    }
  });

  realtyProvider.getProperties = async () => ({
    home_search: {
      results: [{
        id: 'realty-1',
        title: '18823 120th Ave',
        city: 'New York',
        state: 'NY',
        address: '18823 120th Ave'
      }]
    }
  });

  zillowProvider.getProperties = async () => ({
    home_search: { results: [] }
  });

  try {
    const result = await providerManager.getProperties({ city: 'New York', state: 'NY', type: 'buy' });
    assert.ok(result.home_search.results.length >= 1);
    assert.equal(result.home_search.results[0].city, 'New York');
    assert.ok(result.home_search.results.every((item) => String(item.city).toLowerCase() === 'new york'));
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RUNNING_TESTS = originalRunningTests;
    process.env.TEST_MODE = originalTestMode;
    axios.get = originalAxiosGet;
    realtyProvider.getProperties = originalRealtyGet;
    zillowProvider.getProperties = originalZillowGet;
  }
});

test('us realtor recommendation provider returns recommendation data', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      data: [{
        id: 'agent-123',
        display_name: 'Jane Doe',
        photo: 'https://example.com/agent.jpg',
        relation: 'SELLER'
      }]
    })
  });

  try {
    const result = await usRealtorProvider.getRecommendations('1721302');
    assert.ok(Array.isArray(result));
    assert.equal(result[0].display_name, 'Jane Doe');
    assert.equal(result[0].advertiserId, '1721302');
  } finally {
    global.fetch = originalFetch;
  }
});

test('provider manager prefers live Realty details over stale cached Zillow provider mappings', async () => {
  const originalRealtyDetail = realtyProvider.getPropertyDetails;
  const originalZillowDetail = zillowProvider.getPropertyDetails;
  const originalFindCacheKey = require('../services/cacheService').findCacheKeyForPropertyId;

  realtyProvider.getPropertyDetails = async () => ({
    id: '2923093336',
    provider: 'realty-us4',
    providerName: 'Realty in US 4',
    title: '567 Ocean Ave',
    city: 'Brooklyn',
    state: 'NY'
  });

  zillowProvider.getPropertyDetails = async () => ({
    id: '31643832',
    provider: 'zillow',
    providerName: 'Zillow',
    title: '1204 Willow Creek Dr',
    city: 'Austin',
    state: 'TX'
  });

  require('../services/cacheService').findCacheKeyForPropertyId = async () => 'zillow:property-detail:31643832';

  try {
    const result = await providerManager.getPropertyDetails('2923093336');
    assert.equal(result.provider, 'realty-us4');
    assert.equal(result.title, '567 Ocean Ave');
    assert.equal(result.city, 'Brooklyn');
  } finally {
    realtyProvider.getPropertyDetails = originalRealtyDetail;
    zillowProvider.getPropertyDetails = originalZillowDetail;
    require('../services/cacheService').findCacheKeyForPropertyId = originalFindCacheKey;
  }
});

test('provider manager enriches search results with Realty US photo arrays', async () => {
  const originalRealtyGet = realtyProvider.getProperties;
  const originalRealtyPhotos = realtyProvider.getPropertyPhotos;

  realtyProvider.getProperties = async () => ({
    home_search: {
      results: [{
        property_id: '2608264886',
        listing_id: '2999663155',
        photo_count: 2,
        primary_photo: { href: 'https://example.com/primary.jpg' },
        location: { address: { line: '123 Main St', city: 'Austin', state_code: 'TX' } },
        description: { beds: 2, baths: 2, sqft: 1200 },
        list_price: 450000,
        status: 'for_sale'
      }]
    }
  });

  realtyProvider.getPropertyPhotos = async () => ({
    home_search: {
      results: [{
        property_id: '2608264886',
        photos: [
          { href: 'https://example.com/primary.jpg' },
          { href: 'https://example.com/other.jpg' }
        ]
      }]
    }
  });

  try {
    const result = await providerManager.getProperties({ city: 'Austin', type: 'buy' });
    const item = result.home_search.results[0];
    assert.equal(item.property_id, '2608264886');
    assert.equal(item.photoCount, 2);
    assert.equal(item.image, 'https://example.com/primary.jpg');
    assert.ok(Array.isArray(item.photos));
    assert.equal(item.photos.length, 2);
    assert.equal(item.photos[0].url, 'https://example.com/primary.jpg');
    assert.equal(item.photos[0].type, 'property');
  } finally {
    realtyProvider.getProperties = originalRealtyGet;
    realtyProvider.getPropertyPhotos = originalRealtyPhotos;
  }
});

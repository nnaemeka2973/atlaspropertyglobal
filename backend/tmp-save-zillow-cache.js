require('dotenv').config();
const axios = require('axios');
const cache = require('./services/cacheService');

async function run() {
  const zKey = process.env.RAPID_API_KEY || process.env.ZILLOW_API_KEY || '';
  const zHost = process.env.ZILLOW_API_HOST || 'real-estate-zillow-com.p.rapidapi.com';
  const location = 'new york';
  const listingTypes = 'agent';
  const zUrl = `https://${zHost}/v1/search/sale?location_or_rid=${encodeURIComponent(location)}&listing_types=${encodeURIComponent(listingTypes)}&property_types=house&sort=relevant&page=1&doz=7`;

  if (!zKey) {
    console.error('Missing Zillow/RapidAPI key');
    process.exit(1);
  }

  try {
    const resp = await axios.get(zUrl, {
      headers: {
        'x-rapidapi-key': zKey,
        'x-rapidapi-host': zHost,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (!resp || !resp.data) {
      console.error('No response data');
      process.exit(2);
    }

    const payload = resp.data;
    const cacheKey = cache.generateCacheKey('zillow', 'v1/search/sale', { location });
    const saved = await cache.set(cacheKey, payload, cache.CACHE_TTL.search, 'zillow', 'v1/search/sale');
    console.log('Saved to supabase cache:', saved);

    // Also write a local fallback cache file so providerManager can use it
    const fs = require('fs');
    try {
      if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
      fs.writeFileSync('./tmp/zillow-cache.json', JSON.stringify(payload, null, 2), 'utf8');
      console.log('Saved local zillow cache: ./tmp/zillow-cache.json');
    } catch (e) {
      console.error('Failed to write local zillow cache:', e && e.message);
    }
    process.exit(0);
  } catch (err) {
    console.error('Zillow probe failed:', err && err.message);
    process.exit(3);
  }
}

run();

const axios = require('axios');
require('dotenv').config();
const key = process.env.REDFIN_API_KEY;
const host = process.env.REDFIN_API_HOST || 'redfin-com-data.p.rapidapi.com';
const headers = { 'x-rapidapi-key': key, 'x-rapidapi-host': host, 'Content-Type': 'application/json' };
const cases = [
  ['auto-complete', '/properties/auto-complete', {location:'Miami'}],
  ['auto-complete', '/properties/auto-complete', {location:'Miami, FL'}],
  ['auto-complete', '/properties/auto-complete', {location:'Miami, Florida'}],
  ['search-v2', '/property/search-v2', {location:'Miami, FL'}],
  ['search-v2', '/property/search-v2', {location:'Miami, FL', locationId:'Miami'}],
  ['search-v2', '/property/search-v2', {location:'Miami', locationId:'Miami'}],
  ['search-v2', '/property/search-v2', {location:'33101', locationId:'33101'}],
  ['search-v2', '/property/search-v2', {location:'33914', locationId:'33914'}],
  ['search', '/property/search', {location:'Miami, FL'}],
  ['search', '/property/search', {location:'Miami'}],
  ['search', '/property/search', {location:'33101'}],
];
(async()=>{
  for (const [name, endpoint, params] of cases) {
    try {
      const res = await axios.get(`https://${host}${endpoint}`, { headers, params, timeout: 15000 });
      console.log('CASE', name, endpoint, JSON.stringify(params));
      console.log(JSON.stringify(res.data).slice(0, 3000));
      console.log('---');
    } catch (err) {
      console.log('CASE', name, endpoint, JSON.stringify(params), 'ERR', err.response?.status, err.message);
      console.log(JSON.stringify(err.response?.data || {}).slice(0, 1500));
      console.log('---');
    }
  }
})();

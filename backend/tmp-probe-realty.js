require('dotenv').config();
const axios = require('axios');

const RAPID_API_KEY = (process.env.RAPID_API_KEY || '').trim();
const hosts = [process.env.REALTY_API_HOST || 'realty-in-us.p.rapidapi.com', process.env.RAPID_API_HOST || 'realty-us.p.rapidapi.com'];
const paths = [
  { method: 'post', path: '/properties/v3/list', body: { limit: 1, city: 'New York' } },
  { method: 'get', path: '/properties/v3/list', params: { city: 'New York' } },
  { method: 'post', path: '/properties/v2/list', body: { limit: 1, city: 'New York' } },
  { method: 'get', path: '/properties/v2/list', params: { city: 'New York' } },
  { method: 'get', path: '/SearchForSale', params: { location: 'New York' } },
  { method: 'get', path: '/properties', params: { q: 'New York' } },
  { method: 'get', path: '/', params: {} }
];

(async () => {
  for (const host of hosts) {
    for (const p of paths) {
      const url = `https://${host}${p.path}`;
      try {
        const cfg = {
          headers: {
            'x-rapidapi-key': RAPID_API_KEY,
            'x-rapidapi-host': host,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
        };
        let resp;
        if (p.method === 'get') {
          resp = await axios.get(url, { ...cfg, params: p.params });
        } else {
          resp = await axios.post(url, p.body, cfg);
        }
        console.log('[OK]', host, p.method.toUpperCase(), p.path, '->', resp.status);
        if (resp.data) console.log('DATA:', JSON.stringify(resp.data).slice(0, 200));
      } catch (err) {
        const status = err.response && err.response.status ? err.response.status : 'ERR';
        const msg = err.response && err.response.data ? JSON.stringify(err.response.data).slice(0,200) : (err.message || err);
        console.log('[FAIL]', host, p.method.toUpperCase(), p.path, '->', status, msg);
      }
    }
  }
})();

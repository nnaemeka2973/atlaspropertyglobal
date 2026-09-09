const axios = require('axios');
require('dotenv').config();
const key = process.env.REDFIN_API_KEY;
const host = process.env.REDFIN_API_HOST || 'redfin-com-data.p.rapidapi.com';
const headers = { 'x-rapidapi-key': key, 'x-rapidapi-host': host, 'Content-Type': 'application/json' };
const candidates = [
  { location: 'Miami', locationId: '2_11458' },
  { location: 'Miami', locationId: '2_11467' },
  { location: 'Miami', locationId: '2_11477' },
  { location: 'Miami', locationId: '2_11513' },
  { location: 'Miami', locationId: '2_12676' },
  { location: 'Miami', locationId: '2_17298' },
  { location: 'Miami, FL', locationId: '2_11458' },
  { location: 'Miami, FL', locationId: '2_11458', status: 'for_sale' },
  { location: 'Miami, FL', locationId: '2_11458', status: 'for_rent' }
];
(async()=>{
  for (const params of candidates) {
    try {
      const res = await axios.get(`https://${host}/property/search`, { headers, params, timeout: 20000 });
      console.log('PARAMS', params);
      console.log(JSON.stringify(res.data).slice(0, 6000));
      console.log('---');
    } catch (err) {
      console.log('ERR', params, err.message);
      console.log(JSON.stringify(err.response?.data || {}).slice(0, 2000));
      console.log('---');
    }
  }
})();

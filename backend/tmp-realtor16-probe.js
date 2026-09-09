require('dotenv').config();
const axios = require('axios');

const key = process.env.RAPID_API_KEY || '';
const host = 'realtor16.p.rapidapi.com';
const url = `https://${host}/search/forsale?location=houston%20%2Ctx&search_radius=0`;

(async () => {
  try {
    const r = await axios.get(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    console.log('STATUS', r.status);
    console.log('BODY', JSON.stringify(r.data).slice(0,1000));
  } catch (err) {
    if (err.response) {
      console.log('HTTP ERROR', err.response.status, JSON.stringify(err.response.data).slice(0,1000));
    } else {
      console.log('REQUEST ERROR', err.message);
    }
    process.exit(1);
  }
})();

const axios = require('axios');
require('dotenv').config();
const key = process.env.REDFIN_API_KEY;
const host = process.env.REDFIN_API_HOST || 'redfin-com-data.p.rapidapi.com';
const headers = {
  'x-rapidapi-key': key,
  'x-rapidapi-host': host,
  'Content-Type': 'application/json'
};
(async () => {
  const res = await axios.get(`https://${host}/property/search`, { headers, params: { location: 'Miami' }, timeout: 20000 });
  console.log(JSON.stringify(res.data, null, 2).slice(0, 15000));
})().catch((err) => {
  console.error(err.message);
  if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});

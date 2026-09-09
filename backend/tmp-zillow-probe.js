require('dotenv').config();
const axios = require('axios');

async function fetchZillowSold() {
  const url = 'https://real-estate-zillow-com.p.rapidapi.com/v1/search/sold?location_or_rid=new%20york&property_types=house&sort=relevant&page=1&doz=7';
  const headers = {
    'x-rapidapi-key': process.env.RAPID_API_KEY || '',
    'x-rapidapi-host': 'real-estate-zillow-com.p.rapidapi.com',
    'Content-Type': 'application/json'
  };

  try {
    const resp = await axios.get(url, { headers, timeout: 15000 });
    console.log('STATUS', resp.status);
    console.log('RESULT-preview', JSON.stringify(resp.data).slice(0, 2000));
    return resp.data;
  } catch (err) {
    if (err.response) {
      console.error('HTTP ERROR', err.response.status, JSON.stringify(err.response.data).slice(0,2000));
    } else {
      console.error('REQUEST ERROR', err.message);
    }
    process.exit(1);
  }
}

fetchZillowSold();

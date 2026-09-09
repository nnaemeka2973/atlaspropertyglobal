const realtor16 = require('./providers/realtor16Provider');

(async () => {
  try {
    console.log('Calling realtor16.getProperties...');
    const res = await realtor16.getProperties({ city: 'Houston' });
    console.log('RESULT:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
    if (err && err.response) {
      try { console.error('RESPONSE STATUS:', err.response.status); } catch (e) {}
      try { console.error('RESPONSE DATA:', JSON.stringify(err.response.data)); } catch (e) {}
    }
    process.exit(1);
  }
})();

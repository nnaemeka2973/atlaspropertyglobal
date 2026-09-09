const realty = require('./providers/realtyProvider');

(async () => {
  try {
    console.log('Calling realty.getProperties...');
    const res = await realty.getProperties({ city: 'New York', limit: 5 });
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

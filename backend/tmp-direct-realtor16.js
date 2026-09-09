(async () => {
  try {
    const p = require('./providers/realtor16Provider');
    console.log('Calling realtor16Provider.getProperties()...');
    const r = await p.getProperties({});
    console.log('OK', JSON.stringify(r && (r.count || r.results || r.properties || r.home_search) ? r : r, null, 2).slice(0,2000));
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
    if (err && err.response) console.error('RESP', err.response.status, err.response.data);
    process.exit(1);
  }
})();

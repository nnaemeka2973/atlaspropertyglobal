(async () => {
  try {
    const pm = require('./providers/providerManager');
    console.log('Calling providerManager.getProperties({})');
    const res = await pm.getProperties({ limit: 10 });
    console.log('SOURCES:', res?.metadata?.sources);
    console.log('FAILURES:', res?.metadata?.failures);
    console.log('COUNT:', res?.home_search?.count);
    console.log('FIRST 5 IDS:');
    const ids = (res?.home_search?.results || []).slice(0,5).map(r => ({ id: r.id || r.property_id || r.providerPropertyId, provider: r.provider, providerName: r.providerName }));
    console.log(JSON.stringify(ids, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.stack || e);
    process.exit(1);
  }
})();

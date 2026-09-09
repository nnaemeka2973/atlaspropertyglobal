const propertyService = require('../services/propertyService');
const cacheService = require('../services/cacheService');

async function getProperties(req, res) {
    try {
        const filters = {
            postal_code: req.query.postal_code,
            city: req.query.city,
            state: req.query.state,
            limit: req.query.limit,
            offset: req.query.offset,
            status: req.query.status,
            beds: req.query.beds,
            baths: req.query.baths,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            type: req.query.type || req.query.transactionType || req.query.purchaseType || 'buy'
        };

        const properties = await propertyService.getProperties(filters);

        res.json({
            success: true,
            data: properties
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

async function getAutocomplete(req, res) {
    try {
        const query = req.query.query || req.query.q || '';
        const results = await propertyService.getAutocomplete(query);

        res.json({
            success: true,
            data: results
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

async function getPropertyDetails(req, res) {
    try {
        const property = await propertyService.getPropertyDetails(req.params.id);

        const hasDetailData = property && (
            property.home ||
            property.property ||
            property.id ||
            property.property_id ||
            property.listing_id ||
            property.providerPropertyId ||
            property.address ||
            property.city
        );

        if (!property || !hasDetailData) {
            // Fallback: try to find a partial listing record via provider search by id.
            try {
                const fallback = await propertyService.getProperties({ property_id: req.params.id, listing_id: req.params.id, id: req.params.id, query: req.params.id });
                const candidate = fallback?.home_search?.results?.[0] || fallback?.results?.[0] || null;
                if (candidate && (candidate.id || candidate.property_id || candidate.listing_id || candidate.address || candidate.city)) {
                    return res.json({ success: true, data: candidate });
                }
            } catch (e) {
                console.log('[DETAILS] Fallback search failed:', e && e.message);
            }

            return res.status(404).json({
                success: false,
                message: 'Property details could not be found.'
            });
        }

        res.json({
            success: true,
            data: property
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

async function getPropertyPhotos(req, res) {
    try {
        const photos = await propertyService.getPropertyPhotos(req.params.id);

        if (!photos) {
            return res.status(404).json({
                success: false,
                message: 'Property photos could not be found.'
            });
        }

        res.json({
            success: true,
            data: photos
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

async function getSimilarHomes(req, res) {
    try {
        const homes = await propertyService.getSimilarHomes(req.params.id);

        res.json({
            success: true,
            data: homes
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

async function getCacheMetrics(req, res) {
    try {
        const metrics = cacheService.getMetrics();
        res.json({ success: true, data: metrics });
    } catch (err) {
        console.error('Cache metrics failed:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

function safeArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return [v];
}

function extractAmenities(details) {
    const out = {
        indoor: [],
        outdoor: [],
        community: [],
        luxury: []
    };

    const candidates = [];
    if (details?.amenities) candidates.push(details.amenities);
    if (details?.property?.amenities) candidates.push(details.property.amenities);
    if (details?.building?.amenities) candidates.push(details.building.amenities);
    if (details?.description?.amenities) candidates.push(details.description.amenities);
    if (details?.public_remarks) candidates.push(details.public_remarks);
    if (details?.features) candidates.push(details.features);

    for (const c of candidates) {
        if (!c) continue;
        const arr = Array.isArray(c) ? c : String(c).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        for (const item of arr) {
            const lower = item.toLowerCase();
            if (/(pool|sauna|spa|hot tub|jacuzzi)/i.test(lower)) out.luxury.push(item);
            else if (/(gym|fitness|indoor|laundry|fireplace|heating|ac|air conditioning|dryer)/i.test(lower)) out.indoor.push(item);
            else if (/(patio|balcony|deck|garden|yard|terrace|outdoor|garage)/i.test(lower)) out.outdoor.push(item);
            else if (/(clubhouse|park|golf|tennis|playground|community)/i.test(lower)) out.community.push(item);
        }
    }

    for (const k of Object.keys(out)) {
        out[k] = Array.from(new Set(out[k]));
    }

    return out;
}

function extractRooms(details) {
    const rooms = [];

    if (details?.rooms && Array.isArray(details.rooms)) return details.rooms;

    if (details?.floorplans && Array.isArray(details.floorplans)) {
        for (const fp of details.floorplans) {
            if (fp?.rooms && Array.isArray(fp.rooms)) {
                rooms.push(...fp.rooms);
            }
        }
    }

    return rooms;
}

function extractKitchen(details) {
    const kitchen = {
        appliances: [],
        smart_features: []
    };

    const k = details?.kitchen || details?.kitchens || details?.property?.kitchen || details?.description?.kitchen;
    if (k) {
        if (Array.isArray(k)) kitchen.appliances = k;
        else if (typeof k === 'object') {
            kitchen.appliances = safeArray(k.appliances || k.equipment || k.features || k.items);
            kitchen.smart_features = safeArray(k.smart_features || k.smart || k.automation || k.tech);
        } else {
            kitchen.appliances = String(k).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        }
    }

    const features = [].concat(
        safeArray(details?.features),
        safeArray(details?.amenities),
        safeArray(details?.property?.amenities),
        safeArray(details?.description?.amenities)
    );

    for (const f of features) {
        const lower = String(f).toLowerCase();
        if (/(dishwash|oven|stove|microwave|refrigerator|fridge|washer|dryer)/i.test(lower)) {
            if (!kitchen.appliances.includes(f)) kitchen.appliances.push(f);
        }
        if (/(smart|nest|thermostat|automation|wifi|bluetooth)/i.test(lower)) {
            if (!kitchen.smart_features.includes(f)) kitchen.smart_features.push(f);
        }
    }

    return kitchen;
}

async function getPropertyFeatures(req, res) {
    try {
        const details = await propertyService.getPropertyDetails(req.params.id);
        const amenities = extractAmenities(details || {});

        res.json({ success: true, data: { amenities } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getPropertyRooms(req, res) {
    try {
        const details = await propertyService.getPropertyDetails(req.params.id);
        const rooms = extractRooms(details || {});
        res.json({ success: true, data: { rooms } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getPropertyDocuments(req, res) {
    try {
        const details = await propertyService.getPropertyDetails(req.params.id);
        const docs = details?.documents || details?.property?.documents || details?.files || [];
        res.json({ success: true, data: { documents: docs } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getPropertyFloorplans(req, res) {
    try {
        const details = await propertyService.getPropertyDetails(req.params.id);
        const floorplans = details?.floorplans || details?.property?.floorplans || [];
        res.json({ success: true, data: { floorplans } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getAgentListings(req, res) {
    try {
        const fulfillmentId = req.params.fulfillmentId || req.query.fulfillmentId;
        if (!fulfillmentId) {
            return res.status(400).json({ success: false, message: 'fulfillmentId is required' });
        }

        const listings = await propertyService.getAgentListings(fulfillmentId);
        if (!listings) {
            return res.status(404).json({ success: false, message: 'No listings found' });
        }

        res.json({ success: true, data: listings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getAgentRecommendations(req, res) {
    try {
        const advertiserId = req.params.advertiserId || req.query.advertiserId || '1721302';
        const recommendations = await propertyService.getAgentRecommendations(advertiserId);
        res.json({ success: true, data: recommendations, advertiserId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getProperties,
    getAutocomplete,
    getPropertyDetails,
    getPropertyPhotos,
    getSimilarHomes,
    getPropertyFeatures,
    getPropertyRooms,
    getPropertyDocuments,
    getPropertyFloorplans,
    getCacheMetrics,
    getAgentListings,
    getAgentRecommendations
};

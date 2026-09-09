const express = require('express');

const router = express.Router();

const {
    getProperties,
    getAutocomplete,
    getPropertyDetails,
    getPropertyPhotos,
    getSimilarHomes,
    getAgentListings,
    getAgentRecommendations
} = require('../controllers/propertyController');
const {
    getPropertyFeatures,
    getPropertyRooms,
    getPropertyDocuments,
    getPropertyFloorplans
} = require('../controllers/propertyController');

router.get('/autocomplete', getAutocomplete);
router.get('/', getProperties);
router.get('/cache-metrics', (req, res) => require('../controllers/propertyController').getCacheMetrics(req, res));
router.get('/agents/:fulfillmentId/listings', (req, res) => require('../controllers/propertyController').getAgentListings(req, res));
router.get('/agents/recommendations', getAgentRecommendations);
router.get('/agents/:advertiserId/recommendations', getAgentRecommendations);
router.get('/:id/photos', getPropertyPhotos);
router.get('/:id/similar', getSimilarHomes);
router.get('/:id/features', getPropertyFeatures);
router.get('/:id/rooms', getPropertyRooms);
router.get('/:id/documents', getPropertyDocuments);
router.get('/:id/floorplans', getPropertyFloorplans);
router.get('/:id', getPropertyDetails);

module.exports = router;

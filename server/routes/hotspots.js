// server/routes/hotspots.js - Hotspot API routes

const express = require('express');
const router = express.Router();
const hotspotController = require('../controllers/hotspotcontroller');

// Routes
router.get('/', hotspotController.getHotspots);
router.post('/', hotspotController.createHotspot);
router.get('/:id', hotspotController.getHotspot);
router.put('/:id', hotspotController.updateHotspot);
router.delete('/:id', hotspotController.deleteHotspot);
router.get('/location/:locationId', hotspotController.getHotspotsByLocation);

module.exports = router;

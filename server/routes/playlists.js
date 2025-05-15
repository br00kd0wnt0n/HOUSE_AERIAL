// server/routes/playlists.js - Playlist API routes

const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');

// Routes
router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylist);
router.put('/:id', playlistController.updatePlaylist);
router.get('/hotspot/:hotspotId', playlistController.getPlaylistByHotspot);
router.get('/location/:locationId', playlistController.getPlaylistsByLocation);

module.exports = router;

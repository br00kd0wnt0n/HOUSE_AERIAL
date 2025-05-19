// server/routes/playlists.js - Playlist API routes

const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistcontroller');

// Routes
router.get('/', playlistController.getPlaylists);
router.get('/hotspot/:hotspotId', playlistController.getPlaylistByHotspot);
router.get('/location/:locationId', playlistController.getPlaylistsByLocation);
router.get('/:id', playlistController.getPlaylist);
router.put('/:id', playlistController.updatePlaylist);

module.exports = router;

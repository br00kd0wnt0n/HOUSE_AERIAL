// server/controllers/playlistController.js - Playlist management controller

const Playlist = require('../models/playlist');
const Hotspot = require('../models/hotspot');
const Asset = require('../models/asset');

// Get all playlists
exports.getPlaylists = async (req, res) => {
  try {
    const { location, hotspot } = req.query;
    let query = {};
    
    if (location) query.location = location;
    if (hotspot) query.hotspot = hotspot;
    
    const playlists = await Playlist.find(query)
      .populate('hotspot')
      .populate('location')
      .populate('sequence.diveInVideo')
      .populate('sequence.floorLevelVideo')
      .populate('sequence.zoomOutVideo');
    
    res.json(playlists);
  } catch (error) {
    console.error('Error getting playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

// Get a single playlist by ID
exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('hotspot')
      .populate('location')
      .populate('sequence.diveInVideo')
      .populate('sequence.floorLevelVideo')
      .populate('sequence.zoomOutVideo');
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json(playlist);
  } catch (error) {
    console.error('Error getting playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
};

// Update a playlist
exports.updatePlaylist = async (req, res) => {
  try {
    const { diveInVideo, floorLevelVideo, zoomOutVideo } = req.body;
    
    // Find the playlist to update
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Get the associated hotspot to check type
    const hotspot = await Hotspot.findById(playlist.hotspot);
    if (!hotspot) {
      return res.status(404).json({ error: 'Associated hotspot not found' });
    }
    
    // Only update sequence for PRIMARY hotspots
    if (hotspot.type === 'PRIMARY') {
      // Update video sequence
      if (diveInVideo) {
        const asset = await Asset.findById(diveInVideo);
        if (!asset || asset.type !== 'DiveIn') {
          return res.status(400).json({ error: 'Invalid DiveIn video asset' });
        }
        playlist.sequence.diveInVideo = diveInVideo;
      }
      
      if (floorLevelVideo) {
        const asset = await Asset.findById(floorLevelVideo);
        if (!asset || asset.type !== 'FloorLevel') {
          return res.status(400).json({ error: 'Invalid FloorLevel video asset' });
        }
        playlist.sequence.floorLevelVideo = floorLevelVideo;
      }
      
      if (zoomOutVideo) {
        const asset = await Asset.findById(zoomOutVideo);
        if (!asset || asset.type !== 'ZoomOut') {
          return res.status(400).json({ error: 'Invalid ZoomOut video asset' });
        }
        playlist.sequence.zoomOutVideo = zoomOutVideo;
      }
    }
    
    await playlist.save();
    
    // Return the updated playlist with populated fields
    const updatedPlaylist = await Playlist.findById(playlist._id)
      .populate('hotspot')
      .populate('location')
      .populate('sequence.diveInVideo')
      .populate('sequence.floorLevelVideo')
      .populate('sequence.zoomOutVideo');
    
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
};

// Get playlist by hotspot ID
exports.getPlaylistByHotspot = async (req, res) => {
  try {
    const hotspotId = req.params.hotspotId;
    
    const playlist = await Playlist.findOne({ hotspot: hotspotId })
      .populate('hotspot')
      .populate('location')
      .populate('sequence.diveInVideo')
      .populate('sequence.floorLevelVideo')
      .populate('sequence.zoomOutVideo');
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found for this hotspot' });
    }
    
    res.json(playlist);
  } catch (error) {
    console.error('Error getting playlist by hotspot:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
};

// Get all playlists for a location with their associated hotspots
exports.getPlaylistsByLocation = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    
    const playlists = await Playlist.find({ location: locationId })
      .populate('hotspot')
      .populate('location')
      .populate('sequence.diveInVideo')
      .populate('sequence.floorLevelVideo')
      .populate('sequence.zoomOutVideo');
    
    res.json(playlists);
  } catch (error) {
    console.error('Error getting playlists by location:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
};

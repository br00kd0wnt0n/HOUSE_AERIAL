// server/controllers/locationcontroller.js - Location management controller

const Location = require('../models/location');
const Hotspot = require('../models/hotspot');
const Playlist = require('../models/playlist');
const Asset = require('../models/asset');

// Get all locations
exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    console.error('Error getting locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

// Get a single location
exports.getLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    console.error('Error getting location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

// Create a new location
exports.createLocation = async (req, res) => {
  try {
    const { name, description, coordinates } = req.body;
    
    // Validate required inputs
    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    
    // Create new location
    const location = new Location({
      name,
      description: description || '',
      coordinates: coordinates || { x: 0, y: 0, z: 0 }
    });
    
    await location.save();
    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
};

// Update a location
exports.updateLocation = async (req, res) => {
  try {
    const { name, description, coordinates, isActive } = req.body;
    
    // Find location
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Update fields
    if (name) location.name = name;
    if (description !== undefined) location.description = description;
    if (coordinates) location.coordinates = coordinates;
    if (isActive !== undefined) location.isActive = isActive;
    
    await location.save();
    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Check if location has associated hotspots
    const hotspotCount = await Hotspot.countDocuments({ location: location._id });
    if (hotspotCount > 0) {
      return res.status(400).json({ error: 'Cannot delete location with associated hotspots. Please delete the hotspots first.' });
    }
    
    // Check if location has associated assets
    const assetCount = await Asset.countDocuments({ location: location._id });
    if (assetCount > 0) {
      return res.status(400).json({ error: 'Cannot delete location with associated assets. Please delete the assets first.' });
    }
    
    // Check if location has associated playlists
    const playlistCount = await Playlist.countDocuments({ location: location._id });
    if (playlistCount > 0) {
      return res.status(400).json({ error: 'Cannot delete location with associated playlists. Please delete the playlists first.' });
    }
    
    // Delete location
    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
};

// Get location statistics
exports.getLocationStats = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Get counts of related resources
    const [hotspotCount, assetCount, playlistCount] = await Promise.all([
      Hotspot.countDocuments({ location: location._id }),
      Asset.countDocuments({ location: location._id }),
      Playlist.countDocuments({ location: location._id })
    ]);
    
    res.json({
      location,
      stats: {
        hotspots: hotspotCount,
        assets: assetCount,
        playlists: playlistCount
      }
    });
  } catch (error) {
    console.error('Error getting location stats:', error);
    res.status(500).json({ error: 'Failed to fetch location statistics' });
  }
}; 
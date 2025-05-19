// server/controllers/locationcontroller.js - Location management controller

const Location = require('../models/location');
const Hotspot = require('../models/hotspot');
const Playlist = require('../models/playlist');
const Asset = require('../models/asset');
const fs = require('fs');
const path = require('path');

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
    
    // Delete all associated assets and their files
    const assets = await Asset.find({ location: location._id });
    
    // Delete physical files first
    for (const asset of assets) {
      try {
        if (fs.existsSync(asset.filePath)) {
          await fs.promises.unlink(asset.filePath);
          console.log(`Deleted file: ${asset.filePath}`);
        } else {
          console.warn(`File not found at path: ${asset.filePath}`);
        }
      } catch (fileError) {
        console.warn('Could not delete file:', fileError);
      }
    }
    
    // Delete asset documents
    await Asset.deleteMany({ location: location._id });
    console.log(`Deleted ${assets.length} assets for location: ${location.name}`);
    
    // Delete associated playlists
    const deletedPlaylists = await Playlist.deleteMany({ location: location._id });
    console.log(`Deleted ${deletedPlaylists.deletedCount} playlists for location: ${location.name}`);
    
    // Delete associated hotspots
    const deletedHotspots = await Hotspot.deleteMany({ location: location._id });
    console.log(`Deleted ${deletedHotspots.deletedCount} hotspots for location: ${location.name}`);
    
    // Delete location
    await Location.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Location deleted successfully',
      deletedAssets: assets.length,
      deletedHotspots: deletedHotspots.deletedCount,
      deletedPlaylists: deletedPlaylists.deletedCount
    });
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
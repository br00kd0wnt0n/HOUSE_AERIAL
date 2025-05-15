// server/controllers/hotspotController.js - Hotspot management controller

const Hotspot = require('../models/hotspot');
const Playlist = require('../models/playlist');

// Get all hotspots with optional location filter
exports.getHotspots = async (req, res) => {
  try {
    const { location, type } = req.query;
    let query = {};
    
    if (location) query.location = location;
    if (type) query.type = type;
    
    const hotspots = await Hotspot.find(query).populate('location');
    res.json(hotspots);
  } catch (error) {
    console.error('Error getting hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
};

// Create a new hotspot
exports.createHotspot = async (req, res) => {
  try {
    const { name, location, type, coordinates, infoPanel } = req.body;
    
    // Validate required inputs
    if (!name || !location || !type || !coordinates || coordinates.length < 3) {
      return res.status(400).json({ 
        error: 'Missing required fields. Please provide name, location, type, and at least 3 coordinates.' 
      });
    }
    
    // Create new hotspot
    const hotspot = new Hotspot({
      name,
      location,
      type,
      coordinates,
      infoPanel: infoPanel || {}
    });
    
    await hotspot.save();
    
    // If hotspot is created successfully, automatically create an empty playlist for it
    const playlist = new Playlist({
      hotspot: hotspot._id,
      location: location
    });
    
    await playlist.save();
    
    res.status(201).json(hotspot);
  } catch (error) {
    console.error('Error creating hotspot:', error);
    res.status(500).json({ error: 'Failed to create hotspot' });
  }
};

// Get a single hotspot by ID
exports.getHotspot = async (req, res) => {
  try {
    const hotspot = await Hotspot.findById(req.params.id).populate('location');
    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    res.json(hotspot);
  } catch (error) {
    console.error('Error getting hotspot:', error);
    res.status(500).json({ error: 'Failed to fetch hotspot' });
  }
};

// Update a hotspot
exports.updateHotspot = async (req, res) => {
  try {
    const { name, type, coordinates, infoPanel, isActive } = req.body;
    
    // Find the hotspot to update
    const hotspot = await Hotspot.findById(req.params.id);
    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    
    // Update fields
    if (name) hotspot.name = name;
    if (type) hotspot.type = type;
    if (coordinates && coordinates.length >= 3) hotspot.coordinates = coordinates;
    if (infoPanel) hotspot.infoPanel = infoPanel;
    if (isActive !== undefined) hotspot.isActive = isActive;
    
    await hotspot.save();
    
    // If type is changed, check if playlist needs updating
    if (type && type !== hotspot.type) {
      const playlist = await Playlist.findOne({ hotspot: hotspot._id });
      if (playlist) {
        // Reset playlist if type changes from PRIMARY to SECONDARY or vice versa
        if (type === 'SECONDARY') {
          playlist.sequence = {};
        }
        await playlist.save();
      }
    }
    
    res.json(hotspot);
  } catch (error) {
    console.error('Error updating hotspot:', error);
    res.status(500).json({ error: 'Failed to update hotspot' });
  }
};

// Delete a hotspot
exports.deleteHotspot = async (req, res) => {
  try {
    const hotspot = await Hotspot.findById(req.params.id);
    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    
    // Delete associated playlist
    await Playlist.deleteMany({ hotspot: hotspot._id });
    
    // Delete hotspot
    await Hotspot.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Hotspot deleted successfully' });
  } catch (error) {
    console.error('Error deleting hotspot:', error);
    res.status(500).json({ error: 'Failed to delete hotspot' });
  }
};

// Get all hotspots for a specific location
exports.getHotspotsByLocation = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const hotspots = await Hotspot.find({ location: locationId }).populate('location');
    res.json(hotspots);
  } catch (error) {
    console.error('Error getting hotspots by location:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
};

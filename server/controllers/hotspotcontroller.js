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
    
    const hotspots = await Hotspot.find(query)
      .populate('location')
      .populate('mapPin')
      .populate('uiElement');
    res.json(hotspots);
  } catch (error) {
    console.error('Error getting hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
};

// Create a new hotspot
exports.createHotspot = async (req, res) => {
  try {
    const { name, location, type, coordinates, infoPanel, mapPin, uiElement } = req.body;
    
    console.log("Creating hotspot with data:", req.body);
    
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
      mapPin: mapPin || null,
      infoPanel: infoPanel || {},
      uiElement: uiElement || null
    });
    
    await hotspot.save();
    
    // If hotspot is created successfully, automatically create an empty playlist for it
    const playlist = new Playlist({
      hotspot: hotspot._id,
      location: location
    });
    
    await playlist.save();
    
    // Return the populated hotspot with map pin data to avoid rendering issues
    const populatedHotspot = await Hotspot.findById(hotspot._id)
      .populate('location')
      .populate('mapPin')
      .populate('uiElement');
    res.status(201).json(populatedHotspot);
  } catch (error) {
    console.error('Error creating hotspot:', error);
    res.status(500).json({ error: 'Failed to create hotspot' });
  }
};

// Get a single hotspot by ID
exports.getHotspot = async (req, res) => {
  try {
    const hotspot = await Hotspot.findById(req.params.id)
      .populate('location')
      .populate('mapPin')
      .populate('uiElement');
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
    const { name, type, coordinates, infoPanel, mapPin, uiElement, isActive } = req.body;
    
    console.log("Updating hotspot with data:", req.body);
    
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
    
    // Handle map pin update
    if (mapPin !== undefined) { // Check if mapPin field was included (even if null)
      console.log(`Updating hotspot map pin from ${hotspot.mapPin} to ${mapPin}`);
      hotspot.mapPin = mapPin;
    }
    
    // Handle UI element update
    if (uiElement !== undefined) { // Check if uiElement field was included (even if null)
      console.log(`Updating hotspot UI element from ${hotspot.uiElement} to ${uiElement}`);
      hotspot.uiElement = uiElement;
    }
    
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
    
    // Return the populated hotspot with map pin data
    const populatedHotspot = await Hotspot.findById(hotspot._id)
      .populate('location')
      .populate('mapPin')
      .populate('uiElement');
    res.json(populatedHotspot);
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
    const hotspots = await Hotspot.find({ location: locationId })
      .populate('location')
      .populate('mapPin')
      .populate('uiElement');
    res.json(hotspots);
  } catch (error) {
    console.error('Error getting hotspots by location:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
};

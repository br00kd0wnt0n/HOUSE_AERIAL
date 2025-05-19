// server/models/hotspot.js - Hotspot model for interactive points on the aerial map

const mongoose = require('mongoose');

const HotspotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['PRIMARY', 'SECONDARY']
  },
  // Polygon coordinates for the hotspot
  coordinates: {
    type: [{
      x: Number,
      y: Number
    }],
    required: true,
    validate: [arrayLimit, '{PATH} must have at least 3 points']
  },
  // Center point for the map pin
  centerPoint: {
    x: Number,
    y: Number
  },
  // Reference to the map pin asset
  mapPin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  // For SECONDARY hotspots: information panel content
  infoPanel: {
    title: String,
    description: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  // For SECONDARY hotspots: UI element to display
  uiElement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation function for coordinates array
function arrayLimit(val) {
  return val.length >= 3;
}

// Calculate center point before saving
HotspotSchema.pre('save', function(next) {
  // Calculate center point if coordinates are provided
  if (this.coordinates && this.coordinates.length >= 3) {
    const sumX = this.coordinates.reduce((acc, point) => acc + point.x, 0);
    const sumY = this.coordinates.reduce((acc, point) => acc + point.y, 0);
    
    this.centerPoint = {
      x: sumX / this.coordinates.length,
      y: sumY / this.coordinates.length
    };
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Hotspot', HotspotSchema);

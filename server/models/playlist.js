// server/models/playlist.js - Playlist model for managing video sequences

const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
  hotspot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotspot',
    required: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  // Video sequence for PRIMARY hotspots
  sequence: {
    diveInVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      // required: function() {
      //   return this.hotspotType === 'PRIMARY';
      // }
    },
    floorLevelVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      // required: function() {
      //   return this.hotspotType === 'PRIMARY';
      // }
    },
    zoomOutVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      // required: function() {
      //   return this.hotspotType === 'PRIMARY';
      // }
    }
  },
  isComplete: {
    type: Boolean,
    default: false
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

// Middleware to fetch hotspot type before validation
PlaylistSchema.pre('validate', async function(next) {
  if (this.hotspot) {
    try {
      const Hotspot = mongoose.model('Hotspot');
      const hotspot = await Hotspot.findById(this.hotspot);
      if (hotspot) {
        this.hotspotType = hotspot.type;
      }
    } catch (err) {
      console.error('Error fetching hotspot type:', err);
    }
  }
  next();
});

// Update timestamp and check if the playlist is complete
PlaylistSchema.pre('save', function(next) {
  // For PRIMARY hotspots, check if all videos are assigned
  if (this.hotspotType === 'PRIMARY') {
    this.isComplete = !!(this.sequence.diveInVideo && 
                        this.sequence.floorLevelVideo && 
                        this.sequence.zoomOutVideo);
  } else {
    // SECONDARY hotspots don't need videos, so they're always complete
    this.isComplete = true;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Playlist', PlaylistSchema);

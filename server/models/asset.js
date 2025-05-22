// server/models/asset.js - Asset model for videos and UI elements

const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition', 'Button', 'MapPin', 'UIElement', 'LocationBanner']
  },
  filePath: {
    type: String,
    required: true, // Full path to the file in the filesystem
    unique: true
  },
  accessUrl: {
    type: String,
    required: true // URL to access the file via the API
  },
  fileType: {
    type: String,
    required: true,
    enum: ['mp4', 'png', 'jpg', 'jpeg', 'gif']
  },
  size: {
    type: Number, // Size in bytes
    required: true
  },
  metadata: {
    type: Object, // Flexible object to store additional data
    default: {}
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: function() {
      return ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button', 'MapPin', 'Transition', 'LocationBanner'].includes(this.type);
    }
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

// Update timestamp on save
AssetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Asset', AssetSchema);

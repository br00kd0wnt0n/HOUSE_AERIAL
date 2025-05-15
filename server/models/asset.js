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
    enum: ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition', 'Button', 'MapPin', 'UIElement']
  },
  s3Key: {
    type: String,
    required: true
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
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: function() {
      return ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(this.type);
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

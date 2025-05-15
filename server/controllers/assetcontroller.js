const Asset = require('../models/asset');
const fs = require('fs');
const path = require('path');

// Define storage directory
const STORAGE_DIR = path.join(__dirname, '../storage/assets');

// Helper function to ensure storage directory exists
const ensureStorageDir = (type) => {
  const dir = path.join(STORAGE_DIR, type);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Helper function to get content type based on file extension
const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  return contentTypes[ext] || 'application/octet-stream';
};

// Get all assets with optional type and location filter
exports.getAssets = async (req, res) => {
  try {
    const { type, location } = req.query;
    let query = {};
    
    if (type) query.type = type;
    if (location) query.location = location;
    
    const assets = await Asset.find(query).populate('location');
    res.json(assets);
  } catch (error) {
    console.error('Error getting assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Create a new asset
exports.createAsset = async (req, res) => {
  try {
    const { name, type, location } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Determine file type from extension
    const fileType = path.extname(file.originalname).substring(1).toLowerCase();
    
    // Check if file type is valid
    const validFileTypes = ['mp4', 'png', 'jpg', 'jpeg', 'gif'];
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Ensure storage directory exists for this asset type
    const typeDir = await ensureStorageDir(type);
    
    // Generate unique filename
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(typeDir, filename);
    
    // Save file to disk
    await fs.promises.writeFile(filepath, file.buffer);
    
    // Create new asset in database
    const asset = new Asset({
      name,
      type,
      s3Key: path.join('assets', type, filename), // Keep s3Key for compatibility
      s3Url: `/api/assets/file/${type}/${filename}`, // Serve through API endpoint
      fileType,
      size: file.size,
      location: location || null
    });
    
    await asset.save();
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
};

// Get a single asset by ID
exports.getAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('location');
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Error getting asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
};

// Update an asset
exports.updateAsset = async (req, res) => {
  try {
    const { name, type, location } = req.body;
    const file = req.file;
    
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Update fields
    if (name) asset.name = name;
    if (type) asset.type = type;
    if (location) asset.location = location;
    
    // If new file is provided, update the file
    if (file) {
      // Delete old file
      const oldFilepath = path.join(STORAGE_DIR, asset.s3Key.replace('assets/', ''));
      try {
        await fs.promises.unlink(oldFilepath);
      } catch (error) {
        console.warn('Could not delete old file:', error);
      }
      
      // Save new file
      const typeDir = await ensureStorageDir(type || asset.type);
      const filename = `${Date.now()}-${file.originalname}`;
      const filepath = path.join(typeDir, filename);
      
      await fs.promises.writeFile(filepath, file.buffer);
      
      // Update asset properties
      const fileType = path.extname(file.originalname).substring(1).toLowerCase();
      asset.s3Key = path.join('assets', type || asset.type, filename);
      asset.s3Url = `/api/assets/file/${type || asset.type}/${filename}`;
      asset.fileType = fileType;
      asset.size = file.size;
    }
    
    await asset.save();
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

// Delete an asset
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Delete file from storage
    const filepath = path.join(STORAGE_DIR, asset.s3Key.replace('assets/', ''));
    try {
      await fs.promises.unlink(filepath);
    } catch (error) {
      console.warn('Could not delete file:', error);
    }
    
    // Delete asset from database
    await Asset.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// Serve asset file
exports.serveAssetFile = async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(STORAGE_DIR, type, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate content type
    const contentType = getContentType(filename);
    res.setHeader('Content-Type', contentType);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving asset file:', error);
    res.status(500).json({ error: 'Failed to serve asset file' });
  }
};
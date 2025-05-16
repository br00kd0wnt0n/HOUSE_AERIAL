const Asset = require('../models/asset');
const fs = require('fs');
const path = require('path');

// Define storage directories - Simplified approach
const BASE_STORAGE_DIR = path.join(__dirname, '../storage/uploads');

// Helper function to ensure storage directory exists
const ensureStorageDir = (type) => {
  const dir = path.join(BASE_STORAGE_DIR, type);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
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
    const typeDir = ensureStorageDir(type);
    
    // Generate unique filename
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(typeDir, filename);
    
    // Save file to disk
    await fs.promises.writeFile(filepath, file.buffer);
    
    // Create access URL for the API
    const accessUrl = `/api/assets/file/${type}/${filename}`;
    
    // Create new asset in database
    const asset = new Asset({
      name,
      type,
      filePath: filepath,
      accessUrl,
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
    if (location !== undefined) asset.location = location;
    
    // If new file is provided, update the file
    if (file) {
      // Delete old file if it exists
      try {
        if (fs.existsSync(asset.filePath)) {
          await fs.promises.unlink(asset.filePath);
        } else {
          console.warn(`Old file not found at path: ${asset.filePath}`);
        }
      } catch (error) {
        console.warn('Could not delete old file:', error);
      }
      
      // Save new file
      const typeDir = ensureStorageDir(type || asset.type);
      const filename = `${Date.now()}-${file.originalname}`;
      const filepath = path.join(typeDir, filename);
      
      await fs.promises.writeFile(filepath, file.buffer);
      
      // Create access URL for the API
      const accessUrl = `/api/assets/file/${type || asset.type}/${filename}`;
      
      // Update asset properties
      const fileType = path.extname(file.originalname).substring(1).toLowerCase();
      asset.filePath = filepath;
      asset.accessUrl = accessUrl;
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
    try {
      if (fs.existsSync(asset.filePath)) {
        await fs.promises.unlink(asset.filePath);
      } else {
        console.warn(`File not found at path: ${asset.filePath}`);
      }
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
    const filePath = path.join(BASE_STORAGE_DIR, type, filename);

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

// Helper function to determine content type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}
const express = require('express');
const router = express.Router();
const multer = require('multer');
const assetController = require('../controllers/assetcontroller');
const path = require('path');
const fs = require('fs');

// Helper function for streaming files
const streamFile = (filepath, req, res) => {
  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Handle range requests (video seeking)
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    
    console.log(`Serving range: ${start}-${end}/${fileSize}`);
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': getContentType(filepath)
    });
    
    const stream = fs.createReadStream(filepath, { start, end });
    stream.pipe(res);
  } else {
    // Serve the entire file
    console.log(`Serving entire file: ${fileSize} bytes`);
    
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': getContentType(filepath)
    });
    
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
  }
};

// Helper function to determine content type
const getContentType = (filepath) => {
  const ext = path.extname(filepath).toLowerCase();
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  return contentTypes[ext] || 'application/octet-stream';
};

// Configure multer for memory storage (we'll save files manually)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024  // 500MB max file size
  }
});

// CRUD routes
router.get('/', assetController.getAssets);
router.post('/', upload.single('file'), assetController.createAsset);
router.get('/:id', assetController.getAsset);
router.put('/:id', upload.single('file'), assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);

// Metadata update route
router.patch('/:id/metadata', assetController.updateAssetMetadata);

// Serve files - Simplified route
router.get('/file/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    console.log(`Serving file: ${type}/${filename}`);
    
    // Construct storage path using the uploads directory
    const filepath = path.join(__dirname, '../storage/uploads', type, filename);
    console.log(`Full file path: ${filepath}`);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error('File not found:', filepath);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Stream the file
    streamFile(filepath, req, res);
  } catch (error) {
    console.error('Error serving file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }
});

module.exports = router;
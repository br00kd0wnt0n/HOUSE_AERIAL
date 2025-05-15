const express = require('express');
const router = express.Router();
const multer = require('multer');
const assetController = require('../controllers/assetcontroller');
const path = require('path');
const fs = require('fs');

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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Asset routes
router.get('/', assetController.getAssets);
router.post('/', upload.single('file'), assetController.createAsset);
router.get('/:id', assetController.getAsset);
router.put('/:id', upload.single('file'), assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);

// Serve asset files from local storage
router.get('/file/:type/:filename', async (req, res) => {
  let stream;
  try {
    const { type, filename } = req.params;
    const filepath = path.join(__dirname, '../storage/assets', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error('File not found:', filepath);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stat = fs.statSync(filepath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Set appropriate content type
    const contentType = getContentType(filename);
    res.setHeader('Content-Type', contentType);
    
    // Handle range requests for video streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      res.status(206); // Partial Content
      
      stream = fs.createReadStream(filepath, { start, end });
    } else {
      // If no range requested, send the entire file
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');
      
      stream = fs.createReadStream(filepath);
    }
    
    // Handle stream errors
    stream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });

    // Pipe the stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }
});

module.exports = router;
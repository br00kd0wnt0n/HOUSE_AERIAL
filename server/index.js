require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Debug: Log environment variables (excluding sensitive data)
console.log('Environment check:');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT || 3001);
console.log('Current directory:', __dirname);

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Add a simple health check endpoint for Railway
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// MongoDB setup
mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/locations', require('./routes/locations'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/hotspots', require('./routes/hotspots'));
app.use('/api/playlists', require('./routes/playlists'));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'storage/uploads')));

// Serve React client build files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React client build directory
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // For any request not matching an API route, serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });

  // Increase the keep-alive timeout to be higher than Railway's idle timeout (60s)
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds
};

startServer().catch(console.error);
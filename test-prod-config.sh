#!/bin/bash

# Set environment variables
export NODE_ENV=production
export REACT_APP_API_URL=http://localhost:3001/api

echo "Building client application in production mode..."
cd client
npm run build
cd ..

echo "Starting server in production mode..."
node server/index.js 
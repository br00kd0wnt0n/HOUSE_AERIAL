# Netflix House Aerial Experience

An interactive video application designed for Netflix House locations, providing visitors with an immersive aerial view of different venues with interactive hotspots.

## Project Overview

This project consists of:

- React frontend (client directory)
- Express backend (server directory)
- MongoDB database integration
- Local video asset storage

## Setup Instructions

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v10.0.0 or higher)
- MongoDB server (must be installed and running locally)

### Installing MongoDB Server (Required)

The application requires a MongoDB server running locally. MongoDB Compass alone is not sufficient, as it's just a GUI client that connects to a MongoDB server.

#### macOS (using Homebrew)

```
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Windows

1. Download and install MongoDB Community Server from [MongoDB's website](https://www.mongodb.com/try/download/community)
2. Follow the installation wizard, making sure to install MongoDB as a service
3. MongoDB should start automatically as a Windows service
4. Verify installation by opening Command Prompt and running: `mongosh`

#### Linux (Ubuntu)

```
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

#### Verify MongoDB is Running

After installation, verify that MongoDB is running:

```
# For macOS
brew services list | grep mongodb

# For Windows
sc query MongoDB

# For Linux
sudo systemctl status mongodb
```

You can also try connecting with the MongoDB shell:

```
mongosh
```

If successful, you should see the MongoDB shell prompt. Type `exit` to close it.

### Using MongoDB Compass (Optional)

MongoDB Compass is a graphical interface for MongoDB that you can use alongside your local MongoDB server:

1. Download and install [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Open MongoDB Compass
3. Connect to your local MongoDB server with the connection string: `mongodb://localhost:27017`
4. You can then explore and manage your `netflix-house` database

### Installation Steps

1. **Clone the repository**

   ```
   git clone https://github.com/br00kd0wnt0n/HOUSE_AERIAL.git
   cd HOUSE_AERIAL
   ```

2. **Install server dependencies**

   ```
   npm install
   ```

3. **Install client dependencies**

   ```
   cd client
   npm install
   cd ..
   ```

4. **Create environment variables**

   Copy the example files and update as needed:

   ```
   cp server/.env.example server/.env
   cp client/.env.local.example client/.env.local
   ```

   Server `.env` contains:

   ```
   # Server configuration
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/netflix-house
   ```

   Client `.env.local` contains:

   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

5. **Ensure MongoDB Server is Running**

   Before starting the application, make sure your MongoDB server is running.
   The application will attempt to connect to the MongoDB instance at: `mongodb://localhost:27017/netflix-house`

6. **Run the application**

   Start the server:

   ```
   npm run dev
   ```

   In a separate terminal, start the client:

   ```
   cd client
   npm start
   ```

7. **Access the application**

   The client will be available at http://localhost:3000
   The server API will be available at http://localhost:3001/api

## Using Local Video Assets

The application is configured to use local video assets. The videos are stored in:

```
server/storage/uploads/
```

This directory is organized by video type:

- AERIAL: Aerial view videos
- DiveIn: Dive-in sequence videos
- FloorLevel: Floor level videos
- Transition: Transition videos
- ZoomOut: Zoom out videos
- Button: Button UI elements
- MapPin: Map pin graphics
- UIElement: UI elements

## Admin Mode

To access the admin panel for managing content:

1. Press `Ctrl+Shift+A` to toggle admin mode
2. Or navigate directly to http://localhost:3000/admin

## Local Development Notes

- The project is already configured to use local video storage without AWS S3
- MongoDB server must be installed and running locally for the application to work
- If you encounter video playback issues, ensure the video files are properly formatted (MP4 recommended)
- Initial setup requires creating locations and associating videos with them through the admin panel

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB server is installed and running on your machine
- Check the MongoDB service status:
  - macOS: `brew services list | grep mongodb`
  - Windows: `sc query MongoDB`
  - Linux: `sudo systemctl status mongodb`
- Try connecting directly using the MongoDB shell: `mongosh`
- Verify that your MONGODB_URI in server/.env is correct (default: `mongodb://localhost:27017/netflix-house`)
- If using MongoDB Compass, ensure you can connect to your local MongoDB server

### "Connection refused" Error

If you see `ECONNREFUSED ::1:27017` or similar:

1. MongoDB server is not running
2. Install MongoDB server following the instructions above
3. Start the MongoDB service
4. Restart your Node.js server

### Video Playback Issues

- Check browser console for errors
- Ensure video files are valid MP4 files
- Confirm asset paths are correctly set in the database

### API Connection Problems

- Verify the server is running on port 3001
- Check that REACT_APP_API_URL is set correctly in client/.env.local
- Look for CORS errors in the browser console

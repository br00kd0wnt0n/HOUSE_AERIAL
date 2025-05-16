# Tech Context

## Tech Stack

### Frontend

- **Framework**: React (v18)
- **Routing**: React Router (v6)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Error Handling**: React Error Boundary
- **CSS**:
  - Tailwind CSS (v3.3.0) for utility-first styling
  - shadcn/ui components for consistent design system
  - PostCSS for processing
  - Netflix-themed custom color palette

### Backend

- **Server**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: Local filesystem storage for video assets (migrated from AWS S3)
- **Authentication**: N/A (Admin mode is toggled via shortcut)
- **Middleware**: CORS, Morgan (logging)
- **File Upload**: Multer

### Development Tools

- **Package Manager**: npm
- **Environment Variables**: dotenv
- **Development Server**: nodemon
- **CSS Framework**: Tailwind CSS (v3.3.0)
- **Component Library**: shadcn/ui
- **PostCSS Plugins**: autoprefixer

## System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 10.0.0
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **MongoDB**: Required for data storage
- **Local Storage**: Sufficient disk space for video assets

## Constraints and Limitations

1. **Video Performance**

   - Large video files must be properly optimized for streaming
   - Mobile devices may have performance limitations with high-resolution videos

2. **Asset Management**

   - Videos stored in local filesystem in server/storage/uploads/ directory
   - Assets organized by type (AERIAL, DiveIn, FloorLevel, ZoomOut, Transition, Button, MapPin, UIElement)
   - Video files must be in compatible formats (MP4 preferred)

3. **Browser Compatibility**

   - Modern browser features like HTML5 video required
   - Mobile browser limitations for autoplay and video handling

4. **Network Considerations**
   - Large video assets require good network connectivity
   - Preloading strategy implemented to reduce playback delays

## Integration Points

1. **Filesystem Integration**

   - Local filesystem for asset storage and retrieval
   - Centralized storage/uploads directory with type-based organization
   - No dependency on external storage services

2. **MongoDB Integration**
   - Mongoose models for data management
   - Connection string configured via environment variables

## Environment Setup

### Server Environment Variables

File: `server/.env`

```
# Server configuration
PORT=3001
MONGODB_URI=mongodb://localhost:27017/netflix-house
```

### Client Environment Variables

File: `client/.env.local`

```
REACT_APP_API_URL=http://localhost:3001/api
```

### Environment File Structure

- `server/.env` - Active server configuration
- `server/.env.example` - Example server configuration
- `client/.env.local` - Active client configuration
- `client/.env.local.example` - Example client configuration

## CSS Configuration

### Tailwind CSS Setup

- **Config File**: `tailwind.config.js` - Customized with Netflix theme colors
- **PostCSS**: Standard configuration with Tailwind CSS and Autoprefixer
- **CSS Variables**: Theme variables defined in `src/styles/index.css`
- **Component Styling**: Combination of utility classes and shadcn/ui components

## Utility Organization

- **src/utils/**: General utility functions
- **src/lib/**: Core utility libraries including Tailwind CSS utilities (cn)

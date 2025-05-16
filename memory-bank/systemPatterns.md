# System Patterns

## Architecture Patterns

### Client-Server Architecture

The application follows a clean client-server architecture:

1. **Frontend (React)**

   - Located in the `client/` directory
   - Handles UI rendering and user interactions
   - Manages application state with React Context

2. **Backend (Express)**
   - Located in the `server/` directory
   - Provides RESTful API endpoints
   - Handles database operations
   - Manages file storage operations

### Data Flow

```
┌─────────────┐     HTTP      ┌─────────────┐    Mongoose    ┌─────────────┐
│   React     │───Requests────▶   Express   │─────Queries────▶   MongoDB   │
│  Frontend   │◀──Responses───│   Backend   │◀────Results────│  Database   │
└─────────────┘               └──────┬──────┘                └─────────────┘
                                     │
                                     │ File Operations
                                     ▼
                              ┌─────────────┐
                              │    Local    │
                              │  Filesystem │
                              └─────────────┘
```

## Frontend Patterns

### Component Organization

```
client/src/
  ├── components/        # Reusable UI components
  │   ├── admin/         # Admin-specific components
  │   ├── common/        # Shared utility components
  │   ├── Hotspot/       # Hotspot-related components
  │   ├── ui/            # shadcn/ui components
  │   └── VideoPlayer/   # Video playback components
  ├── context/           # React Context providers
  ├── lib/               # Utility libraries (including Tailwind utils)
  ├── pages/             # Page-level components
  ├── styles/            # CSS and styling
  └── utils/             # Utility functions
```

### State Management

- **Context API**: Used for global state management
  - VideoContext: Manages video playback state and sequence
  - AdminContext: Handles admin mode state and data operations

### Video Sequence Pattern

The application follows a video sequence pattern:

1. **Aerial View**: Top-down view with hotspots
2. **Dive-In**: Transition from aerial to floor level
3. **Floor Level**: Detailed venue exploration
4. **Zoom Out**: Return to aerial view

Managed through the VideoContext with proper state transitions.

### Hotspot System

Hotspots are implemented using the following pattern:

1. **Definition**: Hotspots defined with coordinates, trigger actions, and metadata
2. **Overlay**: Positioned absolutely over the video element
3. **Interaction**: Click events trigger video transitions or info panels
4. **State Management**: Visibility controlled based on video playback state

## Backend Patterns

### Resource Organization

```
server/
  ├── config/            # Configuration files
  ├── controllers/       # Business logic
  ├── models/            # Mongoose data models
  ├── routes/            # API route definitions
  └── storage/           # Local file storage
      └── uploads/       # Uploaded assets by type
```

### API Endpoints

- RESTful organization by resource type:
  - `/api/assets`: Asset management
  - `/api/locations`: Location management
  - `/api/hotspots`: Hotspot definition and management
  - `/api/playlists`: Video sequence configuration

### File Storage Strategy

- Files stored locally in `server/storage/uploads/` organized by type:
  - AERIAL: Aerial view videos
  - DiveIn: Dive-in sequence videos
  - FloorLevel: Floor level videos
  - Transition: Transition videos
  - ZoomOut: Zoom out videos
  - Button: Button UI elements (ON/OFF states)
  - MapPin: Map pin graphics
  - UIElement: Other UI elements

### Database Schema

Key relationships between models:

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Location  │◀──────│   Hotspot   │───────▶   Playlist  │
└──────┬──────┘       └─────────────┘       └──────┬──────┘
       │                                           │
       │                                           │
       │                                           │
       ▼                                           ▼
┌─────────────┐                            ┌─────────────┐
│    Asset    │                            │    Asset    │
└─────────────┘                            └─────────────┘
```

## Utility Patterns

### Error Handling

- **Frontend**: ErrorBoundary components for React component errors
- **Backend**: Consistent error response format

### Loading States

- Component-level loading states with visual indicators
- Global loading state for major transitions

### Code Organization

- Functional components with hooks
- Custom utility hooks for shared logic
- Server-side controller organization with clear responsibility separation

### UI Framework

- Tailwind CSS for utility-first styling
- shadcn/ui components for consistent UI elements
- Common utility function in lib/utils.js for class name merging (cn)

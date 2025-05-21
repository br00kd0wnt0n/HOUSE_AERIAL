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

#### Global State Patterns

- **Context API**: Used for global state management
  - **ExperienceContext**: Central point for experience state management
    - Manages loading state, locations, and video preloading
    - Exposes methods for video and location management
    - Composes multiple specialized hooks for different responsibilities
  - **AdminContext**: Handles admin mode state and data operations

#### Custom Hook Design Patterns

- **Function Composition**: Hooks are designed to be composable
  - Larger hooks use smaller, focused hooks for specific functionality
  - Consistent interface patterns for easy integration
- **Separation of Concerns**: Each hook has a single, clear responsibility

  - `useLocationManagement`: Handles location data loading and caching
  - `useVideoPreloader`: Manages video preloading and tracking
  - `useServiceWorker`: Interfaces with browser service worker API

- **Caching Strategy**: Strategic caching to avoid redundant requests

  - Time-based expiration (typically 5 minutes)
  - Staleness checks with force refresh capability
  - Memory efficient with entry limits

- **Resource Optimization**:
  - Batch loading of related resources
  - Preloading of resources likely to be needed soon
  - Automatic cleanup and disposal of unused resources
- **Dependency Management**:
  - Careful management of hook dependencies to prevent unnecessary rerenders
  - Stable function references for callback dependencies
  - Clear documentation of dependency decisions

```
┌─────────────┐
│ Experience  │
│   Context   │
└─────┬─────┬─┘
      │     │
 ┌────▼─┐ ┌─▼────────────┐
 │Video │ │   Location   │
 │Hooks │ │     Hooks    │
 └────┬─┘ └─────┬────────┘
      │         │
┌─────▼─────────▼──────┐
│      dataLayer       │
│   (Data Access)      │
└──────────────────────┘
```

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
- **Hooks**: Standardized try/catch patterns with contextual error messages
- **Recovery Strategy**: Graceful degradation with fallbacks when possible

### Loading States

- Component-level loading states with visual indicators
- Global loading state for major transitions
- Progress tracking for resource loading
- Timeout handling for long-running operations

### Data Layer Patterns

- **Client-side API Communication**: Centralized through dataLayer.js utility

  - Request deduplication to prevent multiple in-flight requests for the same data
  - Time-based cache expiration (5-minute default)
  - Size-limited caching (50 entries per endpoint type)
  - Standardized async/await pattern throughout
  - Modular search strategies for complex operations (e.g., transition videos)
  - Consistent error handling and logging
  - Explicit cache clearing API

- **Data Flow**:
  ```
  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
  │  Components   │     │   dataLayer   │     │     API       │
  │   & Hooks     │────▶│  (Utilities)  │────▶│   Endpoints   │
  └───────────────┘     └───────┬───────┘     └───────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  Local Cache  │
                        │ (Time-based)  │
                        └───────────────┘
  ```

### Logging Strategy

- **Environment-aware Logging**: Implemented through logger.js utility
  - Log level filtering based on environment (development vs. production)
  - Enhanced log spam prevention with deterministic cache cleanup
  - Size-limited log cache (100 entries maximum)
  - Consistent log formatting with module context
  - Four priority levels: DEBUG, INFO, WARN, and ERROR
  - Log grouping functionality for related messages
- **Logging Pattern**:
  ```
  ┌───────────────┐                 ┌───────────────┐
  │  Development  │                 │  Production   │
  │  Environment  │                 │  Environment  │
  └───────┬───────┘                 └───────┬───────┘
          │                                 │
          ▼                                 ▼
  ┌───────────────┐                 ┌───────────────┐
  │ DEBUG + INFO  │                 │ INFO + WARN   │
  │ + WARN + ERROR│                 │ + ERROR only  │
  └───────────────┘                 └───────────────┘
  ```

### Code Organization

- Functional components with hooks
- Custom utility hooks for shared logic
- Server-side controller organization with clear responsibility separation

### UI Framework

- Tailwind CSS for utility-first styling
- shadcn/ui components for consistent UI elements
- Common utility function in lib/utils.js for class name merging (cn)

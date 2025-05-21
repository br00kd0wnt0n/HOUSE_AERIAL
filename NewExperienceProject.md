# Netflix House Aerial Experience v2 - Implementation Plan

## 🚨 IMPLEMENTATION RULES 🚨

**RULE #1: DO NOT DO EVERYTHING AT ONCE. JUST ONE TASK AT A TIME.**

**RULE #2: THE HUMAN WILL REVIEW EACH STEP. I WILL ONLY PROCEED TO THE NEXT STEP ONCE HUMAN HAS TESTED, REVIEWED AND APPROVED THE CODE.**

**RULE #3: DO NOT REUSE ANY FILES FROM THE OLD EXPERIENCE. CREATE ALL NEW FILES IN A DEDICATED FOLDER.**

**RULE #4: USE BEST SOFTWARE ENGINEERING PRACTICES FOR SPLITTING FILES WITH BEST SYSTEM PATTERNS TO DO SO, FILES SHOULD NOT BE LONGER THAN 500 LINES AND CODE SHOULD NEVER BE REPEATED.**

## Project Overview

This document outlines the plan for implementing a new, more robust version of the Netflix House Aerial Experience. The v2 experience will be accessible via a new `/home` route and will focus on:

1. Complete offline capabilities through aggressive caching
2. One-time loading of all experience assets
3. Smooth transitions between videos with no loading spinners after initial load
4. Better performance on iPad devices for event usage

## Architecture

We'll implement a completely new architecture with the following key components:

1. **Service Worker**: For offline-first caching strategy
2. **Global Video Preloader**: To handle downloading and managing all videos
3. **Component Structure**:
   - Separate folder for all v2 components
   - New routing system
   - Enhanced video player with seamless transitions
4. **Caching Strategy**:
   - Service Worker cache
   - HTTP cache headers
   - Video versioning to handle updates

## Revised Implementation Phases

We're revising our approach to implementation to focus on delivering incremental value through smaller, testable phases.

### Phase 1: Core Video Experience (MVP)

**Objectives:**

- Create a basic, working video player that loads videos from cache
- Demonstrate the offline capability with a single location

**Deliverables:**

- Enhanced VideoPlayer component with seamless playback
- Basic Experience page displaying aerial video
- Integration with service worker cache for video loading
- Simplified loading screen showing cache status

**Testing Criteria:**

- Videos play without loading spinners after initial load
- Application works when offline (after initial cache)
- Smooth video playback on target iPad device

### Phase 2: Interactive Hotspots

**Objectives:**

- Implement the core interactive elements
- Create the video state machine for sequence management

**Deliverables:**

- SVG-based hotspot rendering using polygon coordinates
- Video state machine implementation (AERIAL → DIVE_IN → FLOOR_LEVEL → ZOOM_OUT)
- Hotspot interaction handling
- Basic UI controls for navigation

**Testing Criteria:**

- Clicking hotspots triggers correct video transitions
- Video sequences play in correct order without loading spinners
- Navigation controls appear in appropriate contexts

### Phase 3: Multi-Location Navigation

**Objectives:**

- Enable navigation between different locations
- Implement transition videos between locations

**Deliverables:**

- Location selection UI in the aerial view
- Smooth location transitions with transition videos
- State persistence when navigating between locations

**Testing Criteria:**

- Users can navigate between all locations
- Transition videos play smoothly between locations
- State is preserved correctly during navigation

### Phase 4: Performance Optimization

**Objectives:**

- Improve memory management and loading efficiency
- Optimize for iPad performance

**Deliverables:**

- Enhanced memory management for video objects
- Priority-based loading for immediate needs
- Optimized rendering to prevent unnecessary re-renders
- Network status indicators and offline mode UI

**Testing Criteria:**

- No memory leaks during extended usage
- Smooth performance on target iPad devices
- Clear indication of network status to users
- Graceful behavior in poor network conditions

### Phase 5: Production Readiness

**Objectives:**

- Final polish and testing for event deployment
- Documentation and maintenance guides

**Deliverables:**

- Comprehensive testing across all scenarios
- Fix any remaining edge cases or bugs
- Performance benchmarking on target devices
- Complete documentation including:
  - Caching strategy overview
  - Maintenance procedures
  - Troubleshooting guide

**Testing Criteria:**

- Performance testing under various network conditions
- Extended stress testing on target devices
- Validation of all user flows and edge cases

## Implementation Approach

For each phase:

1. **Start with a focused prototype** of just the core functionality
2. **Test early and often** to validate the approach
3. **Refine and expand** once core functionality is working
4. **Document lessons learned** before moving to the next phase

## Original Detailed Implementation Plan

### Phase 1: Setup & Foundation

#### Task 1.1: Project Structure Setup

- Create a new folder structure for v2 experience
- Setup basic routing for `/home`
- Create placeholder components

#### Task 1.2: Service Worker Implementation

- Create service worker registration
- Implement basic caching strategy
- Setup cache versioning system

#### Task 1.3: Video Preloader Utility

- Create utility for managing all video assets
- Implement progress tracking
- Add cache validation logic

#### Task 1.4: Data Layer Implementation

- Create shared data layer utility
- Implement request deduplication and caching
- Integrate with API client for centralized data access

#### Task 1.5: Environment-Aware Logging

- Create environment-aware logging utility
- Implement different verbosity levels based on environment
- Provide consistent formatting and module identification

### Phase 2: Core Experience Components

#### Task 2.1: Home Page Implementation

- Create new home component
- Implement initial loading screen
- Add location selection interface

#### Task 2.2: Enhanced Video Player

- Create new video player component
- Implement preloading mechanism
- Add smooth transition handling

#### Task 2.3: Location Experience Component

- Create component for displaying location experience with preloaded videos
- Implement interactive hotspot rendering using SVG polygon coordinates
- Create seamless video sequence playback (aerial, dive-in, floor-level, zoom-out)
- Add smooth location switching with transition videos
- Implement video state machine for managing video sequences
- Provide offline-ready UI indicators

### Phase 3: Caching & Offline Support

#### Task 3.1: Complete Service Worker Integration

- Finalize service worker cache strategy
- Implement cache invalidation for updated assets
- Add background sync capabilities

#### Task 3.2: Network Status Management

- Add offline detection
- Implement status indicators
- Create fallback mechanisms

#### Task 3.3: Initial Load Manager

- Create loading screen with progress
- Implement asset verification before starting
- Add error handling and retry mechanisms

#### Task 3.4: Data Layer & Logger Integration

- Replace all direct API calls with data layer methods
- Replace console logging with structured logger
- Implement integration example as documentation
- Add module-specific logging identifiers

### Phase 4: Refinement & Testing

#### Task 4.1: Performance Optimization

- Optimize video transition timing
- Improve memory management
- Reduce unnecessary re-renders

#### Task 4.2: iPad-Specific Optimizations

- Test and optimize for iPad Pro
- Add iPad-specific UI adjustments
- Fix any device-specific issues

#### Task 4.3: Final Testing & Documentation

- Comprehensive testing across scenarios
- Document caching strategy
- Create maintenance guide

## Progress Tracking

| Task                                    | Description                         | Status      | Notes                                                                                                                                                               |
| --------------------------------------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1: Setup & Foundation**         |
| 1.1                                     | Project Structure Setup             | Completed   | Created folder structure, placeholder components, and routes for `/home`                                                                                            |
| 1.2                                     | Service Worker Implementation       | Completed   | Implemented service worker with caching strategy and versioning system                                                                                              |
| 1.3                                     | Video Preloader Utility             | Completed   | Created enhanced video preloader with strategy pattern for loading                                                                                                  |
| 1.4                                     | Data Layer Implementation           | Completed   | Created shared data layer with request deduplication and caching                                                                                                    |
| 1.5                                     | Environment-Aware Logging           | Completed   | Created logger with environment-based verbosity controls                                                                                                            |
| **Phase 2: Core Experience Components** |
| 2.1                                     | Home Page Implementation            | Completed   | Created Home page with location selection and loading screen                                                                                                        |
| 2.2                                     | Enhanced Video Player               | In Progress | Basic VideoPlayer component created, needs transition capabilities                                                                                                  |
| 2.3                                     | Location Experience Component       | In Progress | Need to implement: hotspot rendering with SVG polygons, video state machine for sequence management, seamless playback of preloaded videos, and location navigation |
| **Phase 3: Caching & Offline Support**  |
| 3.1                                     | Complete Service Worker Integration | Completed   | Implemented service worker with full caching strategy and best practices                                                                                            |
| 3.2                                     | Network Status Management           | Completed   | Added offline detection and status handling                                                                                                                         |
| 3.3                                     | Initial Load Manager                | Completed   | Created loading screen with progress indicators                                                                                                                     |
| 3.4                                     | Data Layer & Logger Integration     | Completed   | Fully integrated dataLayer and logger utilities across all experienceV2 components                                                                                  |
| **Phase 4: Refinement & Testing**       |
| 4.1                                     | Performance Optimization            | Not Started | Priority loading, bandwidth detection, and predictive preloading                                                                                                    |
| 4.2                                     | iPad-Specific Optimizations         | Not Started | Ensure smooth performance on target iPad devices                                                                                                                    |
| 4.3                                     | Final Testing & Documentation       | Not Started | Comprehensive tests and documentation needed                                                                                                                        |

## Code Quality Improvements

To improve code maintainability, we have implemented the following architectural improvements:

1. **Modular Architecture**:

   - Custom hooks for specific functionality (`useServiceWorker`, `useLocationManagement`, `useVideoPreloader`)
   - Strategy pattern for video loading (`ServiceWorkerStrategy`, `BrowserStrategy`)
   - Component extraction for reusability

2. **File Size Reduction**:

   - Reduced large files like `ExperienceContext.jsx` from over 500 lines to under 100 lines
   - Created specialized utility files to maintain single responsibility principle

3. **Improved Testability**:
   - Isolated behaviors in separate modules
   - Clear interface boundaries between components

## Cleanup Tasks & Best Practices Applied

1. **Service Worker Registration Pattern**:

   - Fixed anti-pattern of unregistering/re-registering on every page load
   - Implemented standard registration lifecycle following web standards
   - Added proper update checking mechanism

2. **Component Cleanup**:

   - Removed debug panel and related functionality (not needed for production)
   - Removed empty directories to keep codebase clean

3. **Future Cleanup Opportunities**:
   - Extract API client logic from `useVideoPreloader` to a separate utility module
   - Create video state machine for managing transitions between video states
   - Add unit tests for each hook and strategy
   - Add more detailed JSDoc comments for better documentation

## Todo List (From Console Analysis)

1. **High Priority**:

   - **✅ Shared Data Layer**: Blueprint created in `dataLayer.js` and fully integrated into all components/hooks. This solves duplicate API calls between admin and experience contexts.
   - **✅ Request Deduplication**: Implementation logic in the data layer for deduplicating API calls is now active through the dataLayer integration.
   - **Selective Re-renders**: Investigate and fix components that are causing multiple re-renders of context providers.
   - **✅ Service Worker Progress Tracking**: Fixed issue with progress updates during video caching by adding proper client ID tracking and progress reporting between service worker and client. Replaced MessageChannel API with simpler direct messaging approach for client ID communication. Added force update functionality to ensure service worker is using the latest code.
   - **✅ Service Worker Lifecycle Best Practices**: Implemented standard service worker registration pattern instead of anti-pattern force update. Added graceful fallback to BrowserStrategy when service worker isn't controlling the page. Ensured `clients.claim()` is properly used to control pages immediately after activation.
   - **Complete Experience Component**: Implement the Experience.jsx component to display videos, handle hotspots, and manage transitions according to design.
   - **Memory Management in Hooks**: Ensure proper cleanup and disposal in hooks like useVideoPreloader to prevent memory leaks when components unmount or dependencies change.

2. **Medium Priority**:

   - **✅ Environment-based Logging**: Implemented logger utility from `logger.js` to replace console logs throughout the application.
   - **Preloading Optimization**: Refine the video preloading process to prioritize immediate-need assets.
   - **✅ API Response Caching**: Implemented in data layer and now active through complete dataLayer integration.
   - **✅ Loading Screen Enhancement**: Improved loading screen to show accurate progress during video caching with more detailed status messages.
   - **✅ Service Worker Fallback Strategy**: Added graceful fallback to browser-based loading when service worker is not available, preventing errors on new browser profiles and incognito mode.
   - **Error Boundary Implementation**: Add error boundaries around key components to prevent application crashes and provide fallback UIs.
   - **Enhanced Loading States**: Improve LoadingScreen component to handle different states (success, error) more explicitly for better user experience.

3. **Low Priority**:
   - **React Router Warnings**: Add the future flags `v7_startTransition` and `v7_relativeSplatPath` to prepare for React Router v7.
   - **Service Worker Logging**: Reduce verbose service worker logs in production environments.
   - **Component Mounting Optimization**: Further analyze component tree to minimize unnecessary mounts/remounts.
   - **✅ Preloading Timeouts**: Increased timeouts from 30-45 seconds to 3-5 minutes to accommodate larger video collections.
   - **TypeScript Migration**: Consider migrating to TypeScript for improved type safety and developer experience.
   - **Test Implementation**: Add comprehensive tests for components and utilities to ensure reliability.

## Integration Plan for Utility Blueprints

To fully integrate the data layer and logger utilities that have been created:

1. **Data Layer Integration**:

   - Replace direct API calls in `useVideoPreloader` with `dataLayer` methods
   - Replace direct API calls in `useLocationManagement` with `dataLayer` methods
   - Update error handling to use the consistent approach in `dataLayer`

2. **Logger Integration**:
   - Replace console logs in all experienceV2 files with appropriate logger methods
   - Use logger.debug for development-only logs
   - Use logger.error for all error cases
   - Add module names to clearly identify log sources

These integrations will be done incrementally as we continue development, without disrupting current functionality.

## Current Status & Next Steps

### Project Status Summary (as of last update)

1. **Foundation (Phase 1)**: ✅ COMPLETED

   - Project structure established under `client/src/experienceV2/`
   - Service worker implemented with caching strategies
   - Video preloader created with strategy pattern
   - Data layer and logging utilities created as blueprints
   - Service worker lifecycle management improved to follow best practices

2. **Current Work (Phase 2-3)**: 🟡 IN PROGRESS

   - Basic Home and Experience pages created as placeholders
   - VideoPlayer component implemented with basic functionality
   - LoadingScreen component created but needs integration
   - Implemented graceful fallback to browser-based loading when service worker isn't available

3. **Key Achievements**:
   - Successful refactoring of large files into modular, focused components
   - Fixed service worker registration pattern to follow best practices
   - Implemented strategy pattern for video loading with proper fallback
   - Created blueprints for data layer and logging
   - Enhanced service worker reliability in different browser contexts

### Immediate Next Steps

1. **Continue Phase 2 Implementation**:

   - Complete Home page with real location data loading (2.1) ✅
   - Enhance VideoPlayer component (2.2):

     - Implement immediate playback without loading indicators
     - Add support for different video types (aerial, dive-in, floor-level, zoom-out, transition)
     - Ensure proper handling of video sequences

   - Implement full Experience component (2.3):
     - Create SVG-based hotspot rendering using polygon coordinates from API
     - Implement video state machine to manage sequences (AERIAL → DIVE_IN → FLOOR_LEVEL → ZOOM_OUT → AERIAL)
     - Add location navigation controls with transition videos
     - Display offline status indicators leveraging service worker status
     - Ensure no loading indicators appear during video transitions

2. **Continue Data Layer Integration (Task 3.4)**:
   - ✅ Integrated dataLayer in useLocationManagement.js hook
   - ✅ Integrated dataLayer in useVideoPreloader.js hook
   - ✅ Integrated dataLayer in all remaining components
   - ✅ Integrated logger utility throughout experienceV2 codebase
   - Add unit tests to verify proper integration

### Architectural Decisions

1. **Directory Structure**:

   - All new code is isolated in the `experienceV2/` folder
   - Components organized by feature/purpose
   - Utilities clearly separated from UI components

2. **State Management**:

   - Using React Context for global state (ExperienceContext)
   - Custom hooks for specific functionality
   - Strategy pattern for extendable behaviors

3. **File Size Limits**:
   - All files kept under 500 lines for maintainability
   - Complex functionality split into multiple focused files

### Key Files Reference

| Category             | File Path                                                                                                                                                                                                       | Purpose                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Entry Points**     |
| Routes               | `client/src/experienceV2/routes/ExperienceRoutes.jsx`                                                                                                                                                           | Main routing for the v2 experience                |
| Home Page            | `client/src/experienceV2/pages/Home.jsx`                                                                                                                                                                        | Landing page with location selection              |
| Experience Page      | `client/src/experienceV2/pages/Experience.jsx`                                                                                                                                                                  | Main video experience page                        |
| **Core Components**  |
| Video Player         | `client/src/experienceV2/components/VideoPlayer/VideoPlayer.jsx`                                                                                                                                                | Enhanced video playback component                 |
| Loading Screen       | `client/src/experienceV2/components/LoadingScreen/LoadingScreen.jsx`                                                                                                                                            | Progress indicator for initial loading            |
| **State Management** |
| Experience Context   | `client/src/experienceV2/context/ExperienceContext.jsx`                                                                                                                                                         | Global state management                           |
| Location Hook        | `client/src/experienceV2/hooks/useLocationManagement.js`                                                                                                                                                        | Location data management                          |
| Video Hook           | `client/src/experienceV2/hooks/useVideoPreloader.js`                                                                                                                                                            | Video preloading and management                   |
| Service Worker Hook  | `client/src/experienceV2/hooks/useServiceWorker.js`                                                                                                                                                             | Service worker communication                      |
| **Utilities**        |
| Data Layer           | `client/src/experienceV2/utils/dataLayer.js`                                                                                                                                                                    | Centralized API access (blueprint)                |
| Logger               | `client/src/experienceV2/utils/logger.js`                                                                                                                                                                       | Environment-aware logging utility                 |
| SW Registration      | `client/src/experienceV2/utils/serviceWorkerRegistration.js`                                                                                                                                                    | Service worker registration functions             |
| Video Preloader      | `client/src/experienceV2/utils/videoLoading/VideoPreloaderV2.js`                                                                                                                                                | Enhanced video preloading with strategies         |
| Loading Strategies   | `client/src/experienceV2/utils/videoLoading/LoadingStrategy.js` <br> `client/src/experienceV2/utils/videoLoading/BrowserStrategy.js` <br> `client/src/experienceV2/utils/videoLoading/ServiceWorkerStrategy.js` | Strategy pattern implementation for video loading |
| **Service Worker**   |
| Service Worker       | `client/public/sw.js`                                                                                                                                                                                           | Main service worker implementation                |

## Performance Considerations

1. **Memory Management**:

   - Release video object URLs when no longer needed
   - Implement lazy loading for non-essential resources

2. **Network Optimization**:

   - Properly use service worker caching patterns for various resource types
   - Implement retry mechanisms with exponential backoff for failed requests
   - Ensure accurate progress tracking for cache operations to improve user experience
   - Use graceful fallbacks when network or service worker features aren't available

3. **Rendering Optimization**:
   - Use React.memo for components that don't need frequent re-renders
   - Implement useMemo/useCallback for expensive computations and callback functions

## Technical Implementation Details

### Service Worker Caching Strategy

```javascript
// This is the updated approach for our service worker
// We now follow industry best practices for service worker lifecycle management:
// 1. Register service worker during app initialization using standard pattern
// 2. Use clients.claim() to take control of pages immediately after activation
// 3. Implement graceful fallbacks when service worker is not available
// 4. Use appropriate cache versioning for updates
```

### Video State Machine Design

The Experience component will use a video state machine to manage transitions between different video types:

1. **States**:

   - `AERIAL`: Main looping video for a location
   - `DIVE_IN`: Zooming into a hotspot
   - `FLOOR_LEVEL`: At hotspot destination
   - `ZOOM_OUT`: Returning to aerial view
   - `TRANSITION`: Changing between locations

2. **Transitions**:

   - `AERIAL → DIVE_IN`: Triggered by hotspot click
   - `DIVE_IN → FLOOR_LEVEL`: Automatic after dive-in video completes
   - `FLOOR_LEVEL → ZOOM_OUT`: Triggered by back button
   - `ZOOM_OUT → AERIAL`: Automatic after zoom-out video completes
   - `AERIAL → TRANSITION → AERIAL`: Triggered by location change

3. **Implementation**:

   ```javascript
   // Simplified state machine implementation
   const useVideoStateMachine = (videoPreloader, locationId) => {
     const [state, setState] = useState("AERIAL");
     const [activeHotspot, setActiveHotspot] = useState(null);

     // Handle video sequence transitions
     const handleVideoEnded = (videoType) => {
       switch (videoType) {
         case "diveIn":
           setState("FLOOR_LEVEL");
           break;
         case "zoomOut":
           setState("AERIAL");
           setActiveHotspot(null);
           break;
         case "transition":
           setState("AERIAL");
           break;
       }
     };

     // Get current video based on state
     const getCurrentVideo = useCallback(() => {
       switch (state) {
         case "AERIAL":
           return `aerial_${locationId}`;
         case "DIVE_IN":
           return `diveIn_${activeHotspot?._id}`;
         case "FLOOR_LEVEL":
           return `floorLevel_${activeHotspot?._id}`;
         case "ZOOM_OUT":
           return `zoomOut_${activeHotspot?._id}`;
         case "TRANSITION":
           return `transition_${locationId}`;
       }
     }, [state, locationId, activeHotspot]);

     return {
       state,
       activeHotspot,
       getCurrentVideo,
       handleVideoEnded,
       activateHotspot: (hotspot) => {
         setActiveHotspot(hotspot);
         setState("DIVE_IN");
       },
       returnToAerial: () => setState("ZOOM_OUT"),
       changeLocation: () => setState("TRANSITION"),
     };
   };
   ```

### Hotspot Implementation

The hotspot rendering will use SVG polygons for precise interaction areas based on coordinates from the API:

1. **Coordinate System**:

   - Coordinates are stored as relative values (0-1 range) for responsive positioning
   - Each hotspot has multiple coordinates forming a polygon
   - Hotspots include a `centerPoint` for label positioning

2. **Rendering Approach**:

   ```jsx
   const Hotspot = ({ hotspot, onClick }) => {
     // Convert relative coordinates to SVG polygon points
     const polygonPoints = hotspot.coordinates
       .map((coord) => `${coord.x * 100}% ${coord.y * 100}%`)
       .join(", ");

     return (
       <div className="absolute inset-0 w-full h-full pointer-events-none">
         <svg className="w-full h-full">
           {/* Interactive polygon area */}
           <polygon
             points={polygonPoints}
             className="fill-netflix-red/20 hover:fill-netflix-red/40 cursor-pointer pointer-events-auto transition-colors"
             onClick={() => onClick(hotspot)}
           />

           {/* Optional center marker or label */}
           {hotspot.centerPoint && (
             <g
               transform={`translate(${hotspot.centerPoint.x * 100}%, ${
                 hotspot.centerPoint.y * 100
               }%)`}
             >
               <circle r="5" className="fill-netflix-red" />
               {hotspot.mapPin && (
                 <image
                   href={hotspot.mapPin.accessUrl}
                   width="32"
                   height="32"
                   x="-16"
                   y="-32"
                   className="pointer-events-none"
                 />
               )}
             </g>
           )}
         </svg>
       </div>
     );
   };
   ```

3. **Integration with Experience Component**:

   ```jsx
   // In Experience.jsx
   const Experience = () => {
     // ...other code
     return (
       <div className="relative w-screen h-screen">
         <VideoPlayer /* props */ />

         {/* Only render hotspots during AERIAL state */}
         {videoState === "AERIAL" && (
           <div className="absolute inset-0 pointer-events-none">
             {hotspots.map((hotspot) => (
               <Hotspot
                 key={hotspot._id}
                 hotspot={hotspot}
                 onClick={(hotspot) =>
                   videoStateMachine.activateHotspot(hotspot)
                 }
               />
             ))}
           </div>
         )}
         {/* ...other UI elements */}
       </div>
     );
   };
   ```

### Video Preloading Strategy

1. **Initial Load**:

   - On first visit to `/home`, download all video assets for all locations
   - Show progress indicator with percentage and file count
   - Store videos in service worker cache AND browser HTTP cache

2. **Version Tracking**:

   - Each video will have a content hash in filename or metadata
   - Admin panel updates automatically update the hash
   - Service worker validates cache against newest hash

3. **Playing Strategy**:
   - Pre-buffer next likely videos based on user interaction
   - Maintain multiple video elements for seamless transitions
   - Use cache API to retrieve videos without network requests

## Testing Strategy

1. **Network Conditions**:

   - Test under perfect WiFi conditions
   - Test with throttled connections
   - Test with completely offline mode

2. **Device Testing**:

   - Desktop Chrome/Safari
   - iPad Pro (primary target)
   - Other iOS devices as available

3. **Key Test Scenarios**:
   - Initial load experience
   - Location transitions
   - Hotspot interaction
   - Recovery from network loss
   - App refresh/reopening

## Lessons Learned From v1

Key issues to address from the current implementation:

1. Inconsistent video loading causing UI flickering
2. Network dependency for every video transition
3. Multiple redundant video requests
4. No offline capability
5. Memory management issues with multiple video elements
6. Excessive re-rendering during transitions

## Technical Limitations & Considerations

1. **Storage Limits**:

   - iPads typically have sufficient storage for our needs (~100MB estimated for 20 videos)
   - Service Worker storage varies by browser but is typically sufficient

2. **Browser Support**:

   - iPad Safari has full support for Service Workers since iOS 11.3
   - All modern browsers support Cache API and IndexedDB

3. **Memory Management**:
   - Need to be careful about how many videos are loaded in memory simultaneously
   - Use object URLs and release them properly to avoid memory leaks

## Development Guidelines

### Getting Started with the Codebase

1. **Initial Setup**:

   - The v2 experience routes through `/home`
   - Development takes place in the `client/src/experienceV2` directory
   - Original experience remains accessible at root path

2. **Running the Project**:

   - Start both client and server: `npm run dev` from project root
   - Client runs on port 3000, server on port 3001

3. **Key Development Rules**:
   - Follow RULE #4: Keep files under 500 lines and avoid code duplication
   - Use ES6+ features and modern React patterns (hooks, context)
   - Use the strategy pattern for extensible behavior
   - Maintain clear separation between UI and business logic

### Common Workflows

1. **Adding a New Component**:

   - Create a subdirectory in `components/` with component name
   - Create component file + any supporting files
   - Import and use in appropriate parent component

2. **Modifying the Data Flow**:

   - Add methods to ExperienceContext if globally needed
   - Create a custom hook if functionality is reusable
   - Use local state for component-specific state

3. **Working with Videos**:

   - Use the VideoPreloader via the ExperienceContext
   - Prefer existing strategies for loading videos
   - Always implement proper cleanup to avoid memory leaks

4. **Testing**:

   - Test in Chrome DevTools with throttling to simulate slow connections
   - Test with DevTools Application tab to verify service worker behavior
   - Verify offline functionality by disabling network in DevTools

5. **Implementation Strategy**:
   - Remember RULE #1: One task at a time
   - Get approval before moving to the next task
   - Use the progress tracking to see what's next

## Next Steps

Once this plan is approved, we'll begin with Task 1.1 and proceed sequentially through each task, awaiting review and approval after each one is complete.

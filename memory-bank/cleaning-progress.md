# ExperienceV2 Codebase Cleaning Progress

This document tracks the planned improvements and fixes for the Netflix House Aerial Experience V2 codebase. It's organized file by file with specific issues to address.

## Oversized Components to Split

### 1. Experience.jsx (1030 lines)

- [x] Extract VideoController component to handle video playback logic
  - Created `useVideoController.js` hook to manage all video-related functionality
  - Moved VideoStateManager initialization and management
  - Moved video asset loading and playback control
  - Consolidated video event handlers
  - Removed unused `setUsesServiceWorker` code
- [x] Extract HotspotController component to manage hotspot interactions
  - Created `useHotspotController.js` hook to manage hotspot functionality
  - Moved hotspot loading and click handling
  - Moved InfoPanel management
- [x] Extract LocationController to handle location transitions
  - Created `useLocationController.js` hook to manage location transitions
  - Moved location button click handling
  - Moved navigation logic
- [x] Convert multiple useState hooks to useReducer for related state
  - Implemented useReducer with logically grouped state categories (video, hotspot, location)
  - Defined clear actions for state updates
- [x] Remove unused state variables (setDestinationLocation, setTransitionComplete, setUsesServiceWorker)
  - Removed unused setter functions
  - Integrated state changes through the reducer
- [x] Simplify useEffect hooks with complex dependency arrays
  - Moved complex useEffect hooks to custom hooks for better organization
- [x] Remove unnecessary useCallback wrapping for simple functions
  - Simplified callback implementation in custom hooks
- [x] Consolidate duplicate error handling patterns
  - Standardized error handling patterns across controller hooks

**Implementation Details:**

- Created three custom hooks:
  - `useVideoController.js`: Manages video playback, asset loading, and state transitions
  - `useHotspotController.js`: Manages hotspot loading and interaction
  - `useLocationController.js`: Manages location transitions and navigation
- Implemented a useReducer with clear action types for state updates
- Reduced Experience.jsx from 1030 lines to approximately 160 lines
- Improved maintainability by separating concerns into focused hooks
- Enhanced readability by clearly defining component responsibilities

### 2. HotspotOverlay.jsx (702 lines)

- [x] Extract HotspotPolygon component for rendering polygon hotspots
  - Created `HotspotPolygon.jsx` component for rendering SVG polygons
  - Moved polygon rendering and styling logic
  - Created separate CSS file for polygon-specific styles
- [x] Extract HotspotMarker component for pin-style hotspots
  - Created `HotspotMarker.jsx` component for marker/pin rendering
  - Moved position calculation and styling
  - Created separate CSS file for marker styles
- [x] Extract DebugPanel component for debug UI
  - Created `DebugPanel.jsx` for all debug functionality
  - Separated debug UI from main component
  - Moved cache info fetching to debug component
- [x] Extract DimensionCalculator for handling video dimensions
  - Created `useDimensionCalculator.js` hook to manage complex dimension logic
  - Moved SVG viewBox calculations and management
  - Consolidated position calculation for hotspots
- [x] Consolidate complex dimension handling logic
  - Moved dimension calculations to dedicated hook
  - Standardized calculation approach
- [x] Remove direct DOM manipulation where possible
  - Reduced direct style manipulation
  - Used React refs properly
- [x] Simplify complex timeout and fallback logic
  - Improved fallback dimension logic
  - Cleaned up timeout handling
- [x] Move debug functionality to conditional imports
  - Created `useHotspotDebug.js` hook for debug functionality
  - Separated debug keyboard shortcuts
  - Made debug UI fully modular
- [x] Implement more robust async handling
  - Improved service worker and cache info handling
  - Better error boundaries for async operations

**Implementation Details:**

- Created two custom hooks:
  - `useDimensionCalculator.js`: Manages all dimension calculations
  - `useHotspotDebug.js`: Manages debug mode and keyboard shortcuts
- Created three component files:
  - `HotspotPolygon.jsx`: Renders SVG polygons for area hotspots
  - `HotspotMarker.jsx`: Renders pin-style hotspots
  - `DebugPanel.jsx`: Displays debug information and controls
- Created four CSS files:
  - `HotspotPolygon.css`: Styles for polygon display
  - `HotspotMarker.css`: Styles for marker/pin display
  - `DebugPanel.css`: Styles for debug panel UI
  - `HotspotCommon.css`: Shared styles for hotspot components
- Reduced HotspotOverlay.jsx from 702 lines to approximately 50 lines
- Improved maintainability by separating rendering logic from calculation logic
- Enhanced modularity by extracting debug functionality

### 3. VideoPlayer.jsx (446 lines)

- [x] Extract VideoController for playback control logic
  - Created `useVideoController.js` hook to manage video playback
  - Moved video event handling and source change logic
  - Simplified safePlayVideo function with proper error handling
- [x] Extract VideoErrorHandler for error handling
  - Created `useVideoErrorHandler.js` hook for centralized error handling
  - Added more robust network error detection
  - Improved error UI with dynamic error messages
- [x] Extract VideoSizeCalculator for dimension calculations
  - Created `useVideoSizeCalculator.js` hook for managing video dimensions
  - Implemented proper aspect ratio preservation
  - Added event listeners for video and window size changes
- [x] Simplify safePlayVideo function with nested try/catch blocks
  - Moved to useVideoController hook with improved structure
  - Better handling of browser autoplay restrictions
  - Properly managed async play promises
- [x] Consolidate multiple useEffect hooks with related responsibilities
  - Organized effects by responsibility in separate hooks
  - Improved dependency arrays and cleanup
- [x] Remove commented out code (loading indicator)
  - Removed unused loading indicator code
- [x] Implement more consistent error handling
  - Standardized error reporting and UI presentation
  - Added network error detection and recovery

**Implementation Details:**

- Created three custom hooks in a dedicated hooks/video directory:
  - `useVideoController.js`: Manages playback logic, source changes, and event handling
  - `useVideoErrorHandler.js`: Handles error detection, reporting, and UI presentation
  - `useVideoSizeCalculator.js`: Manages video dimensions and aspect ratio
- Simplified the VideoPlayer component to focus on composition and rendering
- Reduced VideoPlayer.jsx from 446 lines to approximately 80 lines
- Improved error handling with specific error messages and network detection
- Enhanced maintainability by separating logic concerns into focused hooks
- Made the code more testable by isolating core functionality

## State Management Issues

### 4. ExperienceContext.jsx

- [x] Review dependency arrays in useCallback to ensure they're properly specified
  - Removed direct method references from dependency arrays
  - Created local variables for stable function references
  - Fixed circular dependency issues
- [x] Consolidate logging for consistency
  - Added consistent logging with module name
  - Added appropriate log levels for different operations
  - Added more context to logs for better debugging

**Implementation Details:**

- Improved the structure of useCallback hooks by:
  - Creating local variables for frequently used functions to avoid recreating them
  - Removing ESLint disables by properly specifying dependencies
  - Adding descriptive comments about dependency management
- Added centralized logging with consistent patterns
- Added debug logs for key state changes using useEffect
- Improved error handling in key functions
- Enhanced readability with better function organization

### 5. useLocationManagement.js

- [x] Review caching strategy for locations to prevent duplicate loads
  - Added timestamp-based cache validation
  - Implemented staleness check with configurable expiry time
  - Added force refresh capability
- [x] Reduce excessive logging
  - Changed INFO level logs to DEBUG level when appropriate
  - Added more DEBUG logs for improved diagnostics
  - Made logs more descriptive and consistent

**Implementation Details:**

- Created a caching mechanism with timestamp-based expiration (5 minutes)
- Implemented `isCacheValid` function to check cache freshness
- Added force refresh capability with `refreshLocations` function
- Made logging more consistent and less verbose
- Added better error handling for edge cases
- Enhanced method documentation with JSDoc comments
- Improved input validation for API calls

### 6. useVideoPreloader.js

- [x] Simplify preloadAllLocationsVideos function
  - Split into smaller, more focused functions
  - Improved readability by reducing nesting
  - Standardized error handling throughout
- [x] Split complex logic into smaller functions
  - Created `fetchAerialVideos` for aerial video loading
  - Created `fetchTransitionVideos` for transition video loading
  - Created `processHotspot` for playlist and hotspot processing
  - Created `processLocation` for organizing videos by location
- [x] Standardize error handling patterns
  - Added try/catch blocks consistently
  - Enhanced error messages with context
  - Implemented better recovery from non-critical errors

**Implementation Details:**

- Refactored preloadAllLocationsVideos from 100+ lines to a more manageable size
- Created 5 helper functions to handle specific parts of the video loading process
- Implemented a timeout mechanism with a dedicated helper function
- Added proper validation for all inputs and API responses
- Improved error recovery to continue with partial data when possible
- Enhanced error handling with specific error messages for each failure point
- Added comprehensive documentation with JSDoc comments
- Reduced functions reaching the callback hell pattern

## Async Pattern Inconsistencies

### 7. dataLayer.js

- [x] Standardize on async/await throughout
  - Ensured consistent use of async/await pattern
  - Removed Promise chain syntax for better readability
- [x] Split complex makeRequest function into smaller helpers
  - Created checkCache function for cache validation
  - Created makeApiCall function for API request handling
  - Created validateResponse function for response validation
  - Created updateCache function for cache management
- [x] Implement cache size limits or time-based expiration
  - Added 5-minute expiration for cached data
  - Limited each cache type to 50 entries maximum
  - Added timestamp tracking for each cache entry
- [x] Refactor getTransitionVideo method into smaller functions
  - Created findTransitionByIdPattern for ID-based matching
  - Created findTransitionByNamePattern for name-based matching
  - Created findTransitionByMetadata for metadata matching
  - Created findGenericTransition for fallback transitions
- [x] Reduce verbosity of logging in production
  - Changed many INFO level logs to DEBUG in production
  - Added environment checks for verbose logging

**Implementation Details:**

- Redesigned the cache structure to include timestamps and entry counts
- Added CACHE_CONFIG with configurable expiration time and entry limits
- Improved cache validation with timestamp-based expiration
- Separated the complex makeRequest function into 4 smaller helper functions
- Refactored the getTransitionVideo method into 4 focused search functions
- Reduced log verbosity in production to improve performance
- Improved cache cleanup strategy to avoid memory leaks

### 8. useServiceWorker.js

- [x] Refactor complex setupServiceWorker function
  - Extracted registration logic to a separate hook
  - Simplified async flow with better error handling
  - Improved service worker activation tracking
- [x] Standardize on async/await pattern
  - Replaced all Promise chains with async/await
  - Added proper error handling for async operations
  - Ensured consistent async patterns throughout
- [x] Split into smaller, more focused hooks:
  - [x] useServiceWorkerRegistration
    - Handles service worker registration and lifecycle
    - Manages online/offline status
    - Provides service worker reset functionality
  - [x] useServiceWorkerMessaging
    - Handles message sending and receiving
    - Provides a clean API for message subscriptions
    - Supports type-based message handling
  - [x] useServiceWorkerCache
    - Manages cache version checks and updates
    - Handles video caching operations
    - Provides progress tracking for caching

**Implementation Details:**

- Created three specialized hooks with single responsibilities
- Maintained backward compatibility in the main useServiceWorker hook
- Improved error handling and logging throughout
- Added comprehensive JSDoc documentation
- Enhanced testing capability by making hooks more modular
- Simplified the main useServiceWorker hook through composition

### 9. serviceWorkerRegistration.js

- [x] Standardize on async/await pattern throughout
- [x] Consolidate duplicate error handling
- [x] Review overlapping functionality in update-related functions

## Direct DOM Manipulation

### 10. LocationNavigation.jsx

- [x] Remove direct dataLayer.getLocations call when locations are passed as props
- [x] Simplify asset loading logic
- [x] Reduce excessive logging

### 11. InfoPanel.jsx

- [x] Move direct style manipulation to CSS classes where possible
- [x] Implement more robust animation handling

## Debug Code Improvements

### 12. HotspotOverlay.css

- [x] Move debug styles to a separate file that can be conditionally imported
- [x] Use CSS custom properties for better theming and consistency

### 13. logger.js

- [x] Ensure production builds suppress DEBUG level logs
  - Verified that currentLogLevel is correctly set based on environment
  - Confirmed that debug method checks currentLogLevel before logging
- [x] Verify log cache implementation for efficiency
  - Added MAX_CACHE_SIZE limit (100 entries)
  - Replaced random cleanup with deterministic approach
  - Added periodic cleanup every 30 seconds
  - Improved cache entry management

**Implementation Details:**

- Added MAX_CACHE_SIZE constant to limit cache entries to 100
- Added a lastCleanup timestamp to track cleanup intervals
- Created dedicated cleanupCache function to run every 30 seconds
- Implemented enforceMaxCacheSize function to remove oldest entries
- Maintained the existing environment-aware log level settings

## Strategy Pattern Improvements

### 14. ServiceWorkerStrategy.js

- [x] Split handleServiceWorkerMessage into smaller methods for each message type
  - Created individual handler methods for each message type (CLIENT_ID_RESPONSE, CACHE_PROGRESS, CACHE_ERROR)
  - Created sub-handlers for VIDEO_CACHE_STATUS messages based on status (progress, complete, error, cached-list)
  - Implemented a clean switch-based routing system for message delegation
- [x] Implement more robust state management for pending operations
  - Added OperationState enum for tracking operation states (PENDING, COMPLETED, ERROR, TIMEOUT)
  - Created a centralized operation creation method with proper state tracking
  - Implemented timestamp-based tracking for better debugging
  - Added periodic cleanup of stale operations every 30 seconds
- [x] Improve timeout handling to prevent race conditions
  - Implemented a dedicated timeout management system with stored references
  - Created a centralized timeout handler method
  - Added descriptive timeout messages
  - Used graceful fallbacks instead of rejections for better error handling
  - Prevented race conditions by properly clearing timeouts when operations complete

### 15. VideoPreloaderV2.js

- [ ] Improve hash algorithm in generateContentHash
- [ ] Implement cache size limits
- [ ] Simplify registerVideos method
- [ ] Add better documentation for strategy pattern implementation

### 16. VideoStateManager.js

- [ ] Implement a more formal state machine pattern
- [ ] Consolidate state variables into a single state object
- [ ] Split large methods into smaller functions
- [ ] Add comprehensive JSDoc documentation
- [ ] Implement more robust error recovery strategies

## Other Files

### 17. ErrorBoundary.jsx

- [x] Add check for window.reportError before calling
- [x] Ensure error reporting is properly conditional for production

### 18. LocationButton.jsx

- [x] Move direct style applications to CSS where possible
- [x] Ensure consistent loading state handling

**Implementation Details:**

- Created a dedicated `LocationButton.css` file with proper CSS classes and variables
- Replaced all inline styles with CSS classes
- Removed React state for hover management, using CSS `:hover` instead for better performance
- Improved loading state handling with individual tracking for both ON and OFF state images
- Added a loading timeout mechanism to prevent indefinite loading states
- Added proper ARIA attributes for accessibility
- Reduced logging verbosity by changing INFO level logs to DEBUG
- Improved error handling with better fallback UI
- Used the `cn()` utility for class name management

### 19. LoadingScreen.jsx

- [ ] Verify aria attributes for accessibility
- [ ] Ensure consistent error handling

### 20. ExperienceRoutes.jsx

- [x] Review for consistent error handling with ErrorBoundary
- [x] Ensure proper context wrapping

## Implementation Plan

1. Start with the foundational utilities (logger.js, dataLayer.js) to establish consistent patterns
2. Move to state management improvements (ExperienceContext.jsx, custom hooks)
3. Refactor oversized components by extracting smaller, focused components
4. Implement consistent error handling with ErrorBoundary
5. Address debug code and ensure proper production/development handling
6. Clean up remaining issues (unused variables, unnecessary callbacks, etc.)
7. Add/update documentation and comments

## Progress Tracking

- [x] Phase 1: Utilities and data layer (Files: 7, 13)
  - [x] File 7: dataLayer.js - Improved caching, async patterns, and reduced logs
  - [x] File 13: logger.js - Enhanced caching mechanism and verified production behavior
- [x] Phase 2: State management (Files: 4, 5, 6)
  - [x] File 4: ExperienceContext.jsx - Fixed dependency arrays and improved logging
  - [x] File 5: useLocationManagement.js - Enhanced caching strategy and logging
  - [x] File 6: useVideoPreloader.js - Decomposed complex functions and standardized error handling
- [x] Phase 3 (Started): Component extraction - Experience.jsx completed
  - [x] File 1: Experience.jsx - Refactored to use custom hooks and useReducer
  - [x] File 2: HotspotOverlay.jsx - Refactored with custom hooks and smaller components
  - [x] File 3: VideoPlayer.jsx - Refactored with dedicated video-related hooks
- [x] Phase 4: Error handling consistency (Files: 17, 20)
  - [x] File 17: ErrorBoundary.jsx - Added conditional error reporting based on environment, improved error recovery options, enhanced documentation, and implemented error count tracking
  - [x] File 20: ExperienceRoutes.jsx - Updated to use the improved ErrorBoundary component with a custom fallback UI and nested error boundaries for specific routes
- [x] Phase 5: Debug code improvements (Files: 12)
  - [x] File 12: HotspotOverlay.css - Created HotspotVariables.css with custom properties for consistent theming, extracted debug styles to DebugStyles.css, and implemented conditional import of debug styles
- [ ] Phase 6: Final cleanup (Remaining files)
  - [x] File 8: useServiceWorker.js - Refactored into three specialized hooks (registration, messaging, cache) with proper separation of concerns while maintaining backward compatibility
  - [x] File 9: serviceWorkerRegistration.js - Standardized on async/await pattern throughout, consolidated duplicate error handling with a performServiceWorkerOperation helper function, and improved update-related functions by reducing duplication
  - [x] File 10: LocationNavigation.jsx - Removed redundant dataLayer.getLocations call when locations are passed as props, simplified asset loading logic with cleaner conditional checks, and reduced excessive logging
  - [x] File 11: InfoPanel.jsx - Moved direct style manipulation to CSS classes, created dedicated InfoPanel.css file, improved animation handling with useRef for timer management, and enhanced accessibility with ARIA attributes
  - [ ] File 14: ServiceWorkerStrategy.js
  - [ ] File 15: VideoPreloaderV2.js
  - [ ] File 16: VideoStateManager.js
  - [x] File 18: LocationButton.jsx - Created a dedicated CSS file to replace inline styles, improved loading state with individual image tracking, added timeout mechanism, enhanced accessibility with ARIA attributes, and used CSS hover effects instead of React state
  - [ ] File 19: LoadingScreen.jsx

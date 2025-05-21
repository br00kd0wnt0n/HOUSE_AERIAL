# Active Context

## Current Focus

The project is currently focused on enhancing the admin interface, improving asset management, and implementing dynamic button asset management:

1. **Admin Interface Enhancement**

   - Adding a new admin page for location management
   - Improving asset management with better database relationships
   - Moving from filesystem-based location structure to a database-driven approach

2. **Asset Management Restructuring**

   - Creating a dedicated uploads directory instead of location-specific folders
   - Using MongoDB to track asset-location relationships rather than filesystem structure
   - Removing filesystem synchronization logic

3. **Video Experience Flow**

   - Implementation of the aerial video experience with hotspot interactions
   - Support for multiple Netflix House locations
   - Video sequence management (aerial → dive-in → floor-level → zoom-out)

4. **UI Framework Migration**

   - Migration from pure CSS to Tailwind CSS (v3.3.0) in progress
   - Implementing shadcn/ui components for a consistent design system
   - Fixed Tailwind CSS configuration issues (PostCSS integration)
   - Focusing on component-by-component migration starting with Admin UI

5. **Button Asset Management**

   - Implementing ON/OFF button asset management for locations
   - Creating a dynamic button system for Menu and Experience pages
   - Ensuring consistent button dimensions and appearance
   - Replacing hardcoded button assets with server-managed assets

6. **Code Refactoring and Cleanup**
   - Refactoring oversized components into smaller, more focused components
   - Extracting complex logic into custom hooks for better separation of concerns
   - Improving utility code for better performance, maintainability, and reliability
   - Implementing consistent patterns for asynchronous operations and caching

## Recent Changes

1. **Repository Initialization and Cleanup**

   - Created Git repository and made initial commit of the codebase
   - Set up proper .gitignore file for Node.js/React project
   - Performed repository cleanup:
     - Removed duplicate directory structures
     - Fixed import consistency for utility functions
     - Eliminated unused AWS S3 related code and dependencies
     - Properly organized assets in storage/uploads directory
     - Updated documentation to reflect current architecture

2. **Documentation**

   - Created memory bank documentation to track project context and progress
   - Documented system architecture and design patterns
   - Set up rules files with proper YAML front matter
   - Updated project intelligence journal

3. **Asset Management System Overhaul**

   - Removed AWS S3 references in favor of direct filesystem asset management
   - Updated Asset schema to use filePath and accessUrl fields
   - Implemented automatic filesystem synchronization at server startup
   - Added bulk deletion capability for assets

4. **UI Modernization Implementation**

   - Installed and configured Tailwind CSS (v3.3.0) in the client project
   - Resolved Tailwind CSS and PostCSS configuration issues
   - Developed Netflix-themed color scheme for shadcn components
   - Created UI component migration examples
   - Currently migrating the Admin interface components

5. **Button Asset Management Implementation**

   - Enhanced Asset page with Button State selection (ON/OFF)
   - Added location requirement for button assets
   - Implemented dimension validation for button pairs
   - Updated Menu and Experience pages to use dynamic buttons
   - Added grouping of ON/OFF buttons by location in the admin UI

6. **Core Component Refactoring**

   - Refactored Experience.jsx (1030 lines) into smaller components and custom hooks:

     - Created useVideoController.js, useHotspotController.js, and useLocationController.js
     - Implemented useReducer for more maintainable state management
     - Reduced component size by over 80%

   - Refactored HotspotOverlay.jsx (702 lines) into smaller components and hooks:

     - Created useDimensionCalculator.js and useHotspotDebug.js hooks
     - Extracted HotspotPolygon, HotspotMarker, and DebugPanel components
     - Improved code organization with dedicated CSS files

   - Refactored VideoPlayer.jsx (446 lines) into more manageable components:
     - Created useVideoController.js, useVideoErrorHandler.js, and useVideoSizeCalculator.js hooks
     - Improved error handling and playback control
     - Enhanced maintainability through separation of concerns

7. **Utility Layer Improvements**

   - Enhanced dataLayer.js utility with:

     - Standardized async/await usage throughout
     - Improved caching with size limits (50 entries per type) and time-based expiration (5 minutes)
     - Refactored complex functions into smaller, focused functions
     - Reduced logging verbosity in production
     - Maintained backward compatibility with existing codebase

   - Improved logger.js utility with:
     - Verified proper DEBUG level suppression in production
     - Enhanced log caching with deterministic cleanup strategies
     - Added maximum cache size limits (100 entries)
     - Improved efficiency with periodic cache cleanup

8. **State Management Improvements**

   - Refactored ExperienceContext.jsx:

     - Fixed dependency arrays in useCallback hooks to prevent unnecessary rerenders
     - Removed ESLint disables by properly handling dependencies
     - Added consistent logging patterns
     - Improved error handling in key functions

   - Enhanced useLocationManagement.js:

     - Implemented timestamp-based cache validation with 5-minute expiration
     - Added force refresh capability with refreshLocations function
     - Reduced excessive logging by changing INFO logs to DEBUG level
     - Added better error handling for edge cases

   - Improved useVideoPreloader.js:
     - Split complex preloadAllLocationsVideos function (100+ lines) into 5 smaller helper functions
     - Standardized error handling with consistent try/catch patterns
     - Added better error recovery to continue with partial data when possible
     - Enhanced documentation with comprehensive JSDoc comments
     - Implemented timeout handling with custom utility function

9. **Error Handling Improvements**

   - Enhanced ErrorBoundary.jsx:

     - Added conditional error reporting based on environment
     - Improved error recovery options with multiple recovery paths
     - Added error count tracking to handle persistent errors
     - Added timestamp tracking to detect errors in rapid succession
     - Enhanced documentation with comprehensive JSDoc comments
     - Improved the fallback UI with more user-friendly options

   - Updated ExperienceRoutes.jsx:
     - Implemented nested error boundaries for specific routes
     - Added development-only error details display
     - Enhanced error recovery with multiple options (try again, home, reload)
     - Added proper error logging with context
     - Improved mobile responsiveness of error UI

10. **Debug Code Improvements**

    - Enhanced HotspotOverlay.css with modern CSS practices:

      - Created HotspotVariables.css with CSS custom properties for consistent styling
      - Extracted debug styles to DebugStyles.css for better separation of concerns
      - Implemented conditional import of debug styles only when debug mode is active
      - Updated the DebugPanel position from bottom-right to top-left corner for better visibility
      - Fixed CSS color format issues by including both hex values and RGB values for all colors
      - Added consistent naming convention for CSS variables with descriptive prefixes
      - Improved organization with semantic grouping of related properties (colors, opacities, dimensions)

    - Updated related components:
      - Modified HotspotOverlay.jsx to dynamically import debug styles
      - Created dedicated useHotspotDebug hook to manage debug state and keyboard shortcuts
      - Removed static import of DebugPanel.css from DebugPanel component
      - Maintained backward compatibility while improving code structure
      - Enhanced mobile responsiveness with consistent spacing variables

11. **Service Worker Refactoring**

    - Refactored useServiceWorker.js into specialized hooks:

      - Created useServiceWorkerRegistration.js for service worker lifecycle management
      - Created useServiceWorkerMessaging.js for message handling and communication
      - Created useServiceWorkerCache.js for video caching operations
      - Reimplemented main hook as a composition of these specialized hooks

    - Improved service worker architecture:
      - Standardized on async/await pattern throughout all hooks
      - Enhanced error handling with proper try/catch blocks
      - Added comprehensive JSDoc documentation
      - Simplified complex functions into more focused ones
      - Maintained backward compatibility with existing code
      - Improved testability through better separation of concerns
    - Refactored serviceWorkerRegistration.js utility:
      - Created a consistent performServiceWorkerOperation helper to standardize error handling
      - Standardized on async/await pattern throughout all functions
      - Consolidated overlapping functionality in update-related functions
      - Added a dedicated updateServiceWorker function for better code organization
      - Improved error handling and recovery throughout
      - Maintained full backward compatibility with existing API

12. **Codebase Cleaning Progress**

    - Completed Phase 5 of the cleaning plan (Debug code improvements):

      - Created HotspotVariables.css with CSS custom properties for consistent styling
      - Extracted debug styles to DebugStyles.css for better separation of concerns
      - Implemented conditional import of debug styles only when debug mode is active
      - Improved organization with semantic grouping of CSS properties
      - Enhanced user experience by updating the debug panel positioning and visibility

    - Continued Phase 6 of the cleaning plan (Final cleanup):
      - Refactored useServiceWorker.js into three specialized hooks with proper separation of concerns
      - Improved serviceWorkerRegistration.js by standardizing on async/await pattern
      - Created a consistent performServiceWorkerOperation helper to consolidate error handling
      - Consolidated overlapping functionality in service worker update-related functions
      - Added better error handling and recovery throughout service worker utilities
      - Maintained backward compatibility with existing APIs while modernizing the implementation
      - Improved LocationNavigation.jsx by:
        - Removing redundant API calls when props already provide the data
        - Simplifying the asset loading logic with cleaner conditional checks
        - Reducing excessive logging by changing INFO logs to DEBUG or removing entirely
        - Improving code organization following the Single Responsibility Principle
        - Using optional chaining for safer property access
        - Preserving the debugMode prop for child components
      - Enhanced InfoPanel.jsx by:
        - Moving direct style manipulation to a dedicated InfoPanel.css file
        - Implementing better animation handling with useRef-managed timers
        - Adding proper cleanup for animations to prevent memory leaks
        - Improving component organization with cleaner conditional rendering
        - Adding accessibility attributes (ARIA roles and labels)
        - Creating more semantic class names for better maintainability

## Next Steps

1. **Location Management Implementation**

   - Create a dedicated LocationController on the backend
   - Update the Asset controller to use a simplified upload directory
   - Create a new Locations.js admin page with CRUD functionality
   - Update the AdminContext to support location management

2. **Asset Management Restructuring**

   - Move from location-based directory structure to a flat upload directory
   - Update asset creation and file serving logic
   - Remove filesystem synchronization functionality

3. **Database Reset**

   - Wipe the database clean instead of migrating existing data
   - Set up new locations through the admin interface

4. **UI Framework Migration - Continued Implementation**

   - Component migration in phases:
     - Phase 1 (Current): Admin navigation interface
     - Phase 2: Asset management interface
     - Phase 3: Hotspot management components
     - Phase 4: Video player and interactive elements
     - Phase 5: Integration testing and refinement

5. **Code Refactoring - Continued**

   - ✅ Completed Phase 4 of the cleaning plan:

     - Improved error handling consistency in ErrorBoundary.jsx
     - Added check for window.reportError before calling
     - Ensured error reporting is properly conditional for production
     - Updated ExperienceRoutes.jsx to use the improved ErrorBoundary properly

   - ✅ Completed Phase 5 of the cleaning plan:

     - Implemented debug code improvements for HotspotOverlay.css
     - Moved debug styles to a separate file that can be conditionally imported
     - Created CSS custom properties for better theming and consistency
     - Improved organization of CSS files with better separation of concerns

   - Continued Phase 6 of the cleaning plan:
     - ✅ Refactored useServiceWorker.js into three specialized hooks with proper separation of concerns
     - ✅ Standardized serviceWorkerRegistration.js on async/await pattern with improved error handling
     - ✅ Improved LocationNavigation.jsx by removing redundant API calls and simplifying logic
     - ✅ Enhanced InfoPanel.jsx by moving styles to CSS and improving animation handling
     - Continue with remaining files:
       - Improve the VideoStateManager.js state machine implementation
       - Enhance remaining service worker related files for better consistency

6. **Testing**
   - Test new location management functionality
   - Verify asset upload and retrieval in the new structure
   - Test hotspot and playlist relationships with locations
   - Verify button asset ON/OFF functionality in Menu and Experience pages

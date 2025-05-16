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

5. **Testing**
   - Test new location management functionality
   - Verify asset upload and retrieval in the new structure
   - Test hotspot and playlist relationships with locations
   - Verify button asset ON/OFF functionality in Menu and Experience pages

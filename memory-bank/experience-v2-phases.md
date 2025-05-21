## 🚨 IMPLEMENTATION RULES 🚨

**RULE #1: DO NOT DO EVERYTHING AT ONCE. JUST ONE TASK AT A TIME.**

**RULE #2: THE HUMAN WILL REVIEW EACH STEP. I WILL ONLY PROCEED TO THE NEXT STEP ONCE HUMAN HAS TESTED, REVIEWED AND APPROVED THE CODE.**

**RULE #3: DO NOT REUSE ANY FILES FROM THE OLD EXPERIENCE. CREATE ALL NEW FILES IN A DEDICATED FOLDER.**

**RULE #4: USE BEST SOFTWARE ENGINEERING PRACTICES FOR SPLITTING FILES WITH BEST SYSTEM PATTERNS TO DO SO, FILES SHOULD NOT BE LONGER THAN 500 LINES AND CODE SHOULD NEVER BE REPEATED.**

# Netflix House Aerial Experience v2 - Implementation Phases

This document outlines the revised implementation phases for the Netflix House Aerial Experience v2. Each phase is designed to deliver incremental value with clear objectives, deliverables, and testing criteria.

## Current Status Summary

As of the latest update, we have completed:

- Phase 1 (Foundation): Project structure, service worker, video preloader, data layer, logging
- Home Page implementation
- Phase 1 (Core Video Experience): VideoPlayer, Experience page, service worker caching

## Revised Phases & Implementation Plan

### Phase 1: Core Video Experience (MVP)

**Objectives:**

- Create a basic, working video player that loads videos from cache
- Demonstrate the offline capability with a single location

**Key Tasks:**

- [x] Enhance VideoPlayer component with seamless playback
- [x] Add support for different video types (aerial, dive-in, floor-level)
- [x] Implement basic Experience page displaying aerial video
- [x] Connect to service worker cache for actual video loading
- [x] Create simplified UI for the Experience page
- [x] Fix error handling and cache detection
- [x] Add autoplay handling with play button overlay
- [x] Ensure robustness with React StrictMode

**Implementation Notes:**

- Used React refs instead of state variables for tracking loading status to prevent issues with StrictMode's double mounting
- Added more robust type checking for API responses to handle edge cases
- Improved the service worker cache detection with custom headers
- Added a play button overlay to handle browser autoplay restrictions
- Implemented fallback mechanisms for finding aerial assets

**Testing Criteria:**

- [x] Videos play without loading spinners after initial load
- [x] Application works when offline (after initial cache)
- [x] Smooth video playback on target iPad device
- [x] Clear UI indicators for cache and network status

**Dependencies:**

- Relies on existing service worker implementation
- Builds on current VideoPlayer component

**Status:** Completed

---

### Phase 2: Interactive Hotspots

**Objectives:**

- Implement the core interactive elements
- Create the video state machine for sequence management

**Key Tasks:**

- [x] Create SVG-based hotspot component using polygon coordinates
- [x] Implement hotspot rendering within Experience page
- [x] Build video state machine (aerial → dive-in → floor-level → zoom-out)
- [x] Add hotspot interaction handling
- [x] Create UI controls for navigation between states

**Implementation Notes:**

- Map pins are no longer used in V2; interactive polygons are used directly
- Added debug mode (Ctrl+Shift+D) to visualize hotspots and see hotspot details
- Implemented a VideoStateManager for state transitions and playlist management
- Used SVG with viewBox/preserveAspectRatio for proper coordinate mapping
- Added accurate hotspot positioning with letterboxing/pillarboxing support
- Made hotspots visible during hover and when debug mode is enabled

**Testing Criteria:**

- Clicking hotspots triggers correct video transitions
- Video sequences play in correct order without loading spinners
- Navigation controls appear in appropriate contexts
- No network requests occur during video transitions
- Debug mode (Ctrl+Shift+D) shows hotspot areas and provides debugging info

**Dependencies:**

- Requires working VideoPlayer from Phase 1
- Needs hotspot data from API

**Status:** Completed

---

### Phase 3: Multi-Location Navigation

**Objectives:**

- Enable navigation between different locations
- Implement transition videos between locations

**Key Tasks:**

- [ ] Design and implement location selection UI
- [ ] Add transition video support to video state machine
- [ ] Implement smooth location navigation flow
- [ ] Ensure state persistence during location changes
- [ ] Add proper loading states during location changes

**Testing Criteria:**

- Users can navigate between all locations
- Transition videos play smoothly between locations
- State is preserved correctly during navigation
- No loading indicators appear after initial caching

**Dependencies:**

- Requires working video state machine from Phase 2
- Needs location data from API

**Status:** Not Started

---

### Phase 4: Performance Optimization

**Objectives:**

- Improve memory management and loading efficiency
- Optimize for iPad performance

**Key Tasks:**

- [ ] Implement proper memory management for video objects
- [ ] Add priority-based loading for immediate needs
- [ ] Optimize rendering to prevent unnecessary re-renders
- [ ] Create network status indicators and offline mode UI
- [ ] Profile and optimize performance bottlenecks

**Testing Criteria:**

- No memory leaks during extended usage
- Smooth performance on target iPad devices
- Clear indication of network status to users
- Graceful behavior in poor network conditions

**Dependencies:**

- Requires full working experience from Phase 3
- Builds on existing offline detection

**Status:** Not Started

---

### Phase 5: Production Readiness

**Objectives:**

- Final polish and testing for event deployment
- Documentation and maintenance guides

**Key Tasks:**

- [ ] Perform comprehensive testing across all scenarios
- [ ] Fix any remaining edge cases or bugs
- [ ] Conduct performance benchmarking on target devices
- [ ] Create documentation including:
  - [ ] Caching strategy overview
  - [ ] Maintenance procedures
  - [ ] Troubleshooting guide
- [ ] Build admin tools for cache management (if needed)

**Testing Criteria:**

- Performance testing under various network conditions
- Extended stress testing on target devices
- Validation of all user flows and edge cases

**Dependencies:**

- Requires optimized experience from Phase 4

**Status:** Not Started

## Progress Tracking

| Phase | Description               | Status      | Started    | Completed  | Notes                                       |
| ----- | ------------------------- | ----------- | ---------- | ---------- | ------------------------------------------- |
| 1     | Core Video Experience     | Completed   | 2023-08-01 | 2023-08-08 | Successfully implemented with cache support |
| 2     | Interactive Hotspots      | Completed   | 2023-08-09 | 2023-08-15 |                                             |
| 3     | Multi-Location Navigation | Not Started | -          | -          |                                             |
| 4     | Performance Optimization  | Not Started | -          | -          |                                             |
| 5     | Production Readiness      | Not Started | -          | -          |                                             |

## Next Steps

1. Prepare for Phase 2 implementation:

   - Research SVG polygon implementation for hotspots
   - Design video state machine for handling transitions
   - Plan hotspot data structure and integration

2. Initial tasks for Phase 2:

   - Create hotspot component design
   - Implement video state machine architecture
   - Add support for additional video types (dive-in, floor-level)

3. Continued testing:
   - Verify that current implementation works on actual iPad devices
   - Test with various network conditions including complete offline use
   - Ensure service worker handles cache invalidation correctly

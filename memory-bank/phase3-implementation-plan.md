**RULE #1: DO NOT DO EVERYTHING AT ONCE. JUST ONE TASK AT A TIME.**

**RULE #2: THE HUMAN WILL REVIEW EACH STEP. I WILL ONLY PROCEED TO THE NEXT STEP ONCE HUMAN HAS TESTED, REVIEWED AND APPROVED THE CODE.**

**RULE #3: DO NOT REUSE ANY FILES FROM THE OLD EXPERIENCE. CREATE ALL NEW FILES IN A DEDICATED FOLDER.**

**RULE #4: USE BEST SOFTWARE ENGINEERING PRACTICES FOR SPLITTING FILES WITH BEST SYSTEM PATTERNS TO DO SO, FILES SHOULD NOT BE LONGER THAN 500 LINES AND CODE SHOULD NEVER BE REPEATED.**

# Phase 3 Implementation Plan: Multi-Location Navigation

## Overview

This plan outlines the implementation steps for Phase 3 of the Netflix House Aerial Experience v2, focusing on enabling navigation between different locations using location-specific buttons and transition videos.

## Key Requirements

1. Show location navigation buttons in the bottom right corner of the aerial view

   - Each location has ON/OFF button states stored in the assets
   - Implement hover effect to switch between ON/OFF states
   - Show all available location buttons except for the current location
   - Button should be visible only during aerial video playback

2. Implement smooth transitions between locations

   - Play location-specific transition videos when switching locations
   - If transition video isn't available, use a CSS transition effect as fallback
   - No loading spinners or indicators during transitions
   - Ensure the experience feels seamless with pre-cached videos

3. State persistence
   - Only need to preserve that user is in the experience
   - No need to track historical state or visited hotspots

## Implementation Steps

### Step 1: Create Location Button Component

1. Create a new component `LocationButton.jsx` in the `experienceV2/components/Experience` directory

   - Accept props for location data, current location ID, and onclick handler
   - Implement ON/OFF state switching on hover
   - Handle image loading for button assets

2. Create a `LocationNavigation.jsx` container component
   - Accept all locations and current location as props
   - Filter out current location from the button list
   - Position buttons in the bottom right corner
   - Handle button click events

### Step 2: Extend VideoStateManager for Location Transitions

1. Add a new video state type for transitions between locations

   - Update `VIDEO_STATES` object to include a `LOCATION_TRANSITION` state
   - Extend state transition rules to allow `AERIAL` → `LOCATION_TRANSITION` → `AERIAL`

2. Implement location transition handling in VideoStateManager
   - Add method to start location transition sequence
   - Track source and destination locations
   - Handle transition video playback and completion

### Step 3: Update Experience Component

1. Modify Experience page to support location transitions

   - Add state for tracking location transition status
   - Include LocationNavigation component in the render function
   - Implement handler for location button clicks

2. Update video playback flow to handle location transitions
   - Add support for playing transition videos
   - Implement logic to load new location data after transition
   - Handle aerial video playback after transition completion

### Step 4: Enhance API Integration and Caching

1. Update video preloading logic to prioritize transition videos

   - Ensure transition videos are preloaded for all available locations
   - Implement caching strategy for transition videos

2. Add methods to dataLayer for fetching location transition data
   - Get transition videos between locations
   - Efficiently load new location data when needed

### Step 5: Implement Fallback Transitions

1. Create CSS-based transition effect as fallback

   - Implement a smooth fade or slide transition
   - Ensure it's only used when video transitions aren't available

2. Add detection logic for missing transition videos
   - Check if transition video exists before attempting to play
   - Fallback to CSS transition when needed

### Step 6: Error Handling and Edge Cases

1. Handle network-related edge cases

   - Ensure offline use works with cached videos
   - Gracefully handle missing assets

2. Implement proper URL handling
   - Update URL when changing locations without full page reload
   - Support direct navigation to different locations via URL

## Detailed Tasks Breakdown

1. **LocationButton Component**

   - Implement button component with hover effects
   - Load button images from assets API
   - Handle ON/OFF state switching

2. **VideoStateManager Extension**

   - Add LOCATION_TRANSITION state
   - Implement changeLocation method
   - Handle transition video playback

3. **Experience Component Updates**

   - Add LocationNavigation component
   - Implement location change handler
   - Update video loading logic

4. **Data Layer Enhancements**

   - Add method to get transition video between locations
   - Optimize preloading for transition videos
   - Update caching strategy

5. **Fallback Implementation**

   - Create CSS transition component
   - Implement detection for missing videos
   - Add fallback logic

6. **Testing and Refinement**
   - Test all transitions between available locations
   - Verify offline functionality
   - Ensure no loading indicators appear

## Progress Tracking

### Phase 3.1: Location Button UI Components

| Task          | Description                                     | Status        | Completed Date | Notes                                                                        |
| ------------- | ----------------------------------------------- | ------------- | -------------- | ---------------------------------------------------------------------------- |
| 3.1.1         | Create basic LocationButton component           | Completed     | 2023-05-20     | Created LocationButton.jsx with support for ON/OFF state switching on hover  |
| 3.1.2         | Implement ON/OFF state switching on hover       | Completed     | 2023-05-20     | Implemented opacity transitions for smooth state changes                     |
| 3.1.3         | Create LocationNavigation container             | Completed     | 2023-05-20     | Created container component that fetches button assets and filters locations |
| 3.1.4         | Position buttons correctly in Experience view   | Completed     | 2023-05-20     | Positioned in bottom right corner with proper z-index                        |
| 3.1.5         | Test button rendering with sample location data | Completed     | 2023-05-20     | Fixed import paths and ESLint warnings                                       |
| **PHASE 3.1** | **Location Button UI Components**               | **Completed** | 2023-05-20     | All components created and bugs fixed                                        |

### Phase 3.2: Video State Manager Extensions

| Task          | Description                                        | Status          | Completed Date | Notes |
| ------------- | -------------------------------------------------- | --------------- | -------------- | ----- |
| 3.2.1         | Add LOCATION_TRANSITION state to VideoStateManager | Not Started     |                |       |
| 3.2.2         | Update state transition rules                      | Not Started     |                |       |
| 3.2.3         | Implement basic location transition method         | Not Started     |                |       |
| 3.2.4         | Add source/destination location tracking           | Not Started     |                |       |
| 3.2.5         | Test state transitions with mock data              | Not Started     |                |       |
| **PHASE 3.2** | **Video State Manager Extensions**                 | **Not Started** |                |       |

### Phase 3.3: Experience Component Integration

| Task          | Description                                           | Status          | Completed Date | Notes |
| ------------- | ----------------------------------------------------- | --------------- | -------------- | ----- |
| 3.3.1         | Add location transition state to Experience component | Not Started     |                |       |
| 3.3.2         | Integrate LocationNavigation component                | Not Started     |                |       |
| 3.3.3         | Implement location button click handlers              | Not Started     |                |       |
| 3.3.4         | Update video playback flow for transitions            | Not Started     |                |       |
| 3.3.5         | Test basic location switching (without videos)        | Not Started     |                |       |
| **PHASE 3.3** | **Experience Component Integration**                  | **Not Started** |                |       |

### Phase 3.4: Transition Video Implementation

| Task          | Description                                          | Status          | Completed Date | Notes |
| ------------- | ---------------------------------------------------- | --------------- | -------------- | ----- |
| 3.4.1         | Update dataLayer to support transition videos        | Not Started     |                |       |
| 3.4.2         | Add transition video preloading to cache             | Not Started     |                |       |
| 3.4.3         | Implement transition video playback in state manager | Not Started     |                |       |
| 3.4.4         | Handle video completion and location switch          | Not Started     |                |       |
| 3.4.5         | Test transition videos between locations             | Not Started     |                |       |
| **PHASE 3.4** | **Transition Video Implementation**                  | **Not Started** |                |       |

### Phase 3.5: Fallbacks and Edge Cases

| Task          | Description                                | Status          | Completed Date | Notes |
| ------------- | ------------------------------------------ | --------------- | -------------- | ----- |
| 3.5.1         | Create CSS transition fallback             | Not Started     |                |       |
| 3.5.2         | Implement missing video detection          | Not Started     |                |       |
| 3.5.3         | Handle URL updates during location changes | Not Started     |                |       |
| 3.5.4         | Ensure offline functionality               | Not Started     |                |       |
| 3.5.5         | Final testing and bug fixes                | Not Started     |                |       |
| **PHASE 3.5** | **Fallbacks and Edge Cases**               | **Not Started** |                |       |

## Completion Checklist

- [ ] All location buttons are visible in the bottom right corner
- [ ] Buttons show ON/OFF state properly on hover
- [ ] Clicking location button plays transition video
- [ ] Transition to new location is smooth with no loading indicators
- [ ] New location loads properly after transition
- [ ] CSS fallback works when video isn't available
- [ ] URL updates correctly when changing locations
- [ ] Everything works in offline mode
- [ ] No console errors during transitions
- [ ] Performance is smooth on target iPad devices

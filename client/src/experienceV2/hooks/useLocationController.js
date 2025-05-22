import { useEffect, useCallback, useRef } from 'react';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';

const MODULE = 'LocationController';

/**
 * Custom hook for location management
 * Extracts location-related logic from the Experience component
 */
export function useLocationController({
  locationId,
  locations,
  videoStateManagerRef,
  state,
  dispatch,
  navigate
}) {
  // Add a ref to track when a transition was started to prevent immediate completion
  const transitionStartTimeRef = useRef(0);
  
  // Find current location from locations list and update when locationId changes
  useEffect(() => {
    if (!locationId) return;
    
    if (locations && locations.length > 0) {
      const location = locations.find(loc => loc._id === locationId);
      if (location) {
        logger.info(MODULE, `Setting current location: ${location.name} (${location._id})`);
        dispatch({ type: 'SET_CURRENT_LOCATION', payload: location });
        
        // If we're in a location transition, complete it, but only if it's not a transition that just started
        // We use a 500ms buffer to prevent a race condition that completes transitions immediately
        const now = Date.now();
        const timeSinceTransitionStart = now - transitionStartTimeRef.current;
        
        if (state.inLocationTransition && videoStateManagerRef.current && timeSinceTransitionStart > 500) {
          logger.info(MODULE, `Location ID changed during transition, completing transition to ${location.name}`);
          videoStateManagerRef.current.completeLocationTransition();
          
          // Load the new location's aerial video
          if (videoStateManagerRef.current.getCurrentState() === 'aerial') {
            logger.info(MODULE, 'Loading aerial video for new location after transition');
            
            // Reset any previous hotspot activity
            videoStateManagerRef.current.resetPlaylist();
            dispatch({ type: 'RESET_HOTSPOTS' });
          }
        } else if (state.inLocationTransition && timeSinceTransitionStart <= 500) {
          logger.info(MODULE, `Skipping immediate transition completion (${timeSinceTransitionStart}ms since start)`);
        }
      } else {
        logger.warn(MODULE, `Location not found: ${locationId}`);
      }
    }
  }, [locations, locationId, state.inLocationTransition, videoStateManagerRef, dispatch]);

  // Handle location button click
  const handleLocationButtonClick = useCallback(async (destinationLoc) => {
    logger.info(MODULE, `Location button clicked: ${destinationLoc.name} (${destinationLoc._id})`);
    
    // Skip if we're already in a transition or playlist
    if (state.inLocationTransition || state.inPlaylistMode) {
      logger.warn(MODULE, 'Cannot change location during transition or playlist playback');
      return;
    }
    
    // Skip if video state manager not initialized
    if (!videoStateManagerRef.current) {
      logger.error(MODULE, 'Cannot handle location button click: video state manager not initialized');
      return;
    }
    
    try {
      // Record transition start time to prevent immediate completion
      transitionStartTimeRef.current = Date.now();
      
      // Get current location info - either from state or look it up using locationId
      let sourceLoc = state.currentLocation;
      
      // If currentLocation isn't set yet, try to find it from locations array
      if (!sourceLoc && locations && locations.length > 0 && locationId) {
        sourceLoc = locations.find(loc => loc._id === locationId);
        
        // If we found it, update the currentLocation state
        if (sourceLoc) {
          logger.info(MODULE, `Found current location from locations array: ${sourceLoc.name}`);
          dispatch({ type: 'SET_CURRENT_LOCATION', payload: sourceLoc });
        }
      }
      
      // If we still don't have a source location, create a basic one from locationId
      if (!sourceLoc && locationId) {
        logger.warn(MODULE, 'Creating basic source location from locationId');
        sourceLoc = {
          _id: locationId,
          name: 'Current Location'
        };
      }
      
      // Final check - if no sourceLoc, we really can't proceed
      if (!sourceLoc) {
        logger.error(MODULE, 'Cannot change location: current location unknown');
        return;
      }
      
      // Update destination location state immediately to ensure components have latest data
      dispatch({ type: 'SET_DESTINATION_LOCATION', payload: destinationLoc });
      
      // Set the location transition state
      dispatch({ type: 'SET_IN_LOCATION_TRANSITION', payload: true });
      
      // Try to find a transition video between these locations
      const transitionVideo = await dataLayer.getTransitionVideo(
        sourceLoc._id, 
        destinationLoc._id
      );
      
      logger.info(MODULE, `Starting transition from ${sourceLoc.name} to ${destinationLoc.name}`);
      
      // Start location transition in the video state manager
      videoStateManagerRef.current.startLocationTransition(
        sourceLoc,
        destinationLoc,
        transitionVideo
      );
      
      // If we don't have a transition video, the CSS transition will handle it
      // The navigation will happen after the CSS transition completes
      if (!transitionVideo) {
        logger.info(MODULE, 'No transition video available, using CSS transition');
      }
    } catch (error) {
      logger.error(MODULE, `Error handling location transition: ${error.message}`);
      
      // Reset transition state in case of error
      dispatch({ type: 'SET_IN_LOCATION_TRANSITION', payload: false });
      dispatch({ type: 'SET_DESTINATION_LOCATION', payload: null });
    }
  }, [state.currentLocation, state.inLocationTransition, state.inPlaylistMode, locations, locationId, videoStateManagerRef, dispatch]);

  // Handle CSS transition completion - this is called when the CSS transition is done
  const handleCssTransitionComplete = useCallback(() => {
    logger.info(MODULE, 'CSS transition completed');
    
    // Get the destination location ID
    const destinationLocationId = state.destinationLocation?._id;
    if (!destinationLocationId) {
      logger.error(MODULE, 'Cannot complete transition: no destination location ID');
      dispatch({ type: 'SET_IN_LOCATION_TRANSITION', payload: false });
      return;
    }
    
    // Navigate programmatically to change the URL
    if (destinationLocationId !== locationId) {
      logger.info(MODULE, `Navigating to destination location: ${destinationLocationId}`);
      navigate(`/experience/${destinationLocationId}`);
    } else {
      // If we're already at the destination (unlikely but possible), just complete the transition
      dispatch({ type: 'COMPLETE_TRANSITION' });
    }
  }, [state.destinationLocation, locationId, navigate, dispatch]);

  // Back to home navigation
  const handleBackToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Return the location controller API
  return {
    handleLocationButtonClick,
    handleCssTransitionComplete,
    handleBackToHome
  };
} 
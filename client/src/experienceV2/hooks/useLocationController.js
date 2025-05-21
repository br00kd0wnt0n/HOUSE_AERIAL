import { useEffect, useCallback } from 'react';
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
  // Find current location from locations list and update when locationId changes
  useEffect(() => {
    if (!locationId) return;
    
    if (locations && locations.length > 0) {
      const location = locations.find(loc => loc._id === locationId);
      if (location) {
        logger.info(MODULE, `Setting current location: ${location.name} (${location._id})`);
        dispatch({ type: 'SET_CURRENT_LOCATION', payload: location });
        
        // If we're in a location transition, complete it
        if (state.inLocationTransition && videoStateManagerRef.current) {
          logger.info(MODULE, `Location ID changed during transition, completing transition to ${location.name}`);
          videoStateManagerRef.current.completeLocationTransition();
          
          // Load the new location's aerial video
          if (videoStateManagerRef.current.getCurrentState() === 'aerial') {
            logger.info(MODULE, 'Loading aerial video for new location after transition');
            
            // Reset any previous hotspot activity
            videoStateManagerRef.current.resetPlaylist();
            dispatch({ type: 'RESET_HOTSPOTS' });
          }
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
      
      // Try to find a transition video between these locations
      const transitionVideo = await dataLayer.getTransitionVideo(
        sourceLoc._id, 
        destinationLoc._id
      );
      
      logger.info(MODULE, `Starting transition from ${sourceLoc.name} to ${destinationLoc.name}`);
      
      // Start location transition
      videoStateManagerRef.current.startLocationTransition(
        sourceLoc,
        destinationLoc,
        transitionVideo
      );
      
      // If we don't have a transition video, navigate immediately
      if (!transitionVideo) {
        logger.info(MODULE, 'No transition video available, navigating directly');
        
        // Only change URL if needed
        if (destinationLoc._id !== locationId) {
          // Navigate programmatically to change the URL
          navigate(`/experience/${destinationLoc._id}`);
        }
      }
    } catch (error) {
      logger.error(MODULE, `Error handling location transition: ${error.message}`);
    }
  }, [state.currentLocation, state.inLocationTransition, state.inPlaylistMode, locations, locationId, videoStateManagerRef, dispatch, navigate]);

  // Back to home navigation
  const handleBackToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Return the location controller API
  return {
    handleLocationButtonClick,
    handleBackToHome
  };
} 
import { useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';

const MODULE = 'HotspotController';

/**
 * Custom hook for hotspot management
 * Extracts hotspot-related logic from the Experience component
 */
export function useHotspotController({
  locationId,
  videoStateManagerRef,
  state,
  dispatch,
  startFadeToBlack
}) {
  // Load hotspots for the current location
  useEffect(() => {
    const loadHotspots = async () => {
      if (!locationId) return;
      
      try {
        logger.info(MODULE, `Loading hotspots for location: ${locationId}`);
        const response = await dataLayer.getHotspotsByLocation(locationId);
        
        if (response && Array.isArray(response) && response.length > 0) {
          logger.info(MODULE, `Found ${response.length} hotspots for location: ${locationId}`);
          
          // Log the hotspot data for debugging
          logger.debug(MODULE, 'Hotspot details:', JSON.stringify(response.map(h => ({
            id: h._id,
            name: h.name,
            type: h.type,
            hasCoordinates: Boolean(h.coordinates && h.coordinates.length >= 3),
            coordinateCount: h.coordinates ? h.coordinates.length : 0
          }))));
          
          dispatch({ type: 'SET_HOTSPOTS', payload: response });
        } else {
          logger.warn(MODULE, `No hotspots found for location: ${locationId}`);
          dispatch({ type: 'SET_HOTSPOTS', payload: [] });
        }
      } catch (error) {
        logger.error(MODULE, `Error loading hotspots: ${error.message}`);
        dispatch({ type: 'SET_HOTSPOTS', payload: [] });
      }
    };
    
    loadHotspots();
  }, [locationId, dispatch]);

  // Handle hotspot click with separate handling for PRIMARY and SECONDARY hotspots
  const handleHotspotClick = useCallback(async (hotspot) => {
    // If hotspot is null (called from InfoPanel close), just clear the active secondary hotspot
    if (!hotspot) {
      dispatch({ type: 'CLEAR_SECONDARY_HOTSPOT' });
      return;
    }
    
    logger.info(MODULE, `Hotspot clicked: ${hotspot.name} (${hotspot._id}) - Type: ${hotspot.type}`);
    
    // Handle hotspots differently based on type
    if (hotspot.type === 'PRIMARY') {
      // Set the active PRIMARY hotspot for sequence handling
      dispatch({ type: 'SET_ACTIVE_PRIMARY_HOTSPOT', payload: hotspot });
      dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: hotspot });
      
      // Skip if video state manager not initialized
      if (!videoStateManagerRef.current) {
        logger.error(MODULE, 'Cannot handle hotspot click: video state manager not initialized');
        return;
      }
      
      try {
        // Fetch the playlist for this hotspot
        logger.info(MODULE, `Fetching playlist for hotspot: ${hotspot._id}`);
        const playlist = await dataLayer.getPlaylistByHotspot(hotspot._id);
        
        if (!playlist) {
          logger.warn(MODULE, `No playlist found for hotspot: ${hotspot._id}`);
          return;
        }
        
        logger.info(MODULE, `Starting fade to black before hotspot playlist: ${hotspot.name}`);
        
        // If we have the startFadeToBlack function, use it before starting the playlist
        if (startFadeToBlack && typeof startFadeToBlack === 'function') {
          // Start the fade to black effect and pass a callback to start the playlist after fade completes
          startFadeToBlack(() => {
            logger.info(MODULE, `Fade to black completed, starting playlist for hotspot: ${hotspot.name}`);
            
            // Start the playlist using the video state manager
            videoStateManagerRef.current.startHotspotPlaylist(hotspot, playlist);
            
            // After starting the playlist, turn off the fade effect
            dispatch({ type: 'SET_FADE_TO_BLACK_ACTIVE', payload: false });
          });
        } else {
          // Fallback if fade effect not available
          logger.info(MODULE, `Fade to black not available, starting playlist directly: ${hotspot.name}`);
          videoStateManagerRef.current.startHotspotPlaylist(hotspot, playlist);
        }
      } catch (error) {
        logger.error(MODULE, `Error handling hotspot click: ${error.message}`);
        // Make sure to turn off fade effect in case of error
        dispatch({ type: 'SET_FADE_TO_BLACK_ACTIVE', payload: false });
      }
    } else if (hotspot.type === 'SECONDARY') {
      // For SECONDARY hotspots, just display the info panel without interrupting video
      logger.info(MODULE, `Showing info panel for secondary hotspot: ${hotspot.name}`);
      
      // Save video state before showing info panel (to ensure we maintain playback)
      const wasPlaying = state.videoRef?.current && !state.videoRef.current.paused;
      
      // Update both tracking states
      dispatch({ type: 'SET_ACTIVE_SECONDARY_HOTSPOT', payload: hotspot });
      dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: hotspot });
      
      // Ensure video keeps playing if it was playing before
      if (wasPlaying && state.videoRef?.current) {
        // Use setTimeout to ensure this happens after the InfoPanel is rendered
        setTimeout(() => {
          if (state.videoRef.current && state.videoRef.current.paused) {
            logger.debug(MODULE, 'Ensuring video continues playing while InfoPanel is shown');
            state.videoRef.current.play().catch(err => {
              logger.error(MODULE, 'Error ensuring video continues playing:', err);
            });
          }
        }, 100);
      }
    }
  }, [videoStateManagerRef, state.videoRef, dispatch, startFadeToBlack]);

  // Modal close handler that preserves video state
  const handleInfoPanelClose = useCallback(() => {
    logger.debug(MODULE, 'Closing secondary hotspot info panel');
    dispatch({ type: 'CLEAR_SECONDARY_HOTSPOT' });
  }, [dispatch]);

  // Return the hotspot controller API
  return {
    handleHotspotClick,
    handleInfoPanelClose
  };
} 
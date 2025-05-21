import { useRef, useEffect, useCallback } from 'react';
import VideoStateManager from '../utils/VideoStateManager';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';

const MODULE = 'VideoController';

/**
 * Custom hook for video playback control
 * Extracts video-related logic from the Experience component
 */
export function useVideoController({
  locationId,
  videoPreloaderRef,
  serviceWorkerReady,
  state,
  dispatch,
  navigate,
  locations
}) {
  // References
  const videoRef = useRef(null);
  const videoStateManagerRef = useRef(null);
  const assetLoadingRef = useRef(false);
  const assetLoadedRef = useRef(false);

  // Define VIDEO_STATES for state comparisons
  const VIDEO_STATES = {
    AERIAL: 'aerial',
    DIVE_IN: 'diveIn',
    FLOOR_LEVEL: 'floorLevel',
    ZOOM_OUT: 'zoomOut',
    LOCATION_TRANSITION: 'locationTransition'
  };

  // Helper function to preload a video with proper error handling and status updates
  const preloadVideoAsset = useCallback(async (url, id) => {
    try {
      if (!videoPreloaderRef.current) {
        logger.warn(MODULE, `Video preloader not available for ${id}`);
        return;
      }
      
      logger.info(MODULE, `Preloading video: ${id} (${url.substring(0, 30)}...)`);
      
      // Force clean version of URL to avoid duplicates in cache
      const cleanUrl = url.replace(/\?.*$/, '');
      
      await videoPreloaderRef.current.preloadSingleVideo(
        id,
        cleanUrl,
        serviceWorkerReady
      );
      
      // We're removing the code related to setUsesServiceWorker since it's unused
      
    } catch (err) {
      logger.error(MODULE, `Error preloading video ${id}: ${err.message}`);
    }
  }, [videoPreloaderRef, serviceWorkerReady]);

  // Initialize the video state manager
  useEffect(() => {
    const handleVideoChange = (videoType) => {
      logger.info(MODULE, `Video state changed to: ${videoType}`);
      dispatch({ type: 'SET_CURRENT_VIDEO', payload: videoType });
    };
    
    const handleLoadVideo = (video) => {
      logger.info(MODULE, `Loading video: ${video.type} - ${video.id}`);
      
      // Special case for aerial_return - find the cached aerial video URL
      if (video.id === 'aerial_return') {
        logger.info(MODULE, 'Handling special aerial_return request');
        
        // Try to find the proper aerial video URL using multiple possible IDs
        const possibleAerialIds = [
          `aerial_${locationId}_api`,      // From API
          `aerial_${locationId}_direct`,   // Direct match
          `aerial_${locationId}`,          // Simple format
          `aerial_fallback`                // Fallback
        ];
        
        // Try each ID pattern
        let foundAerialUrl = null;
        
        for (const id of possibleAerialIds) {
          if (videoPreloaderRef.current) {
            const url = videoPreloaderRef.current.getVideoUrl(id);
            if (url) {
              logger.info(MODULE, `Found aerial URL for ID: ${id}`);
              foundAerialUrl = url;
              break;
            }
          }
        }
        
        if (foundAerialUrl) {
          logger.info(MODULE, `Setting aerial return URL: ${foundAerialUrl.substring(0, 50)}...`);
          dispatch({ type: 'SET_VIDEO_URL', payload: foundAerialUrl });
          return;
        } else {
          logger.warn(MODULE, 'Could not find aerial URL, using fallback methods');
          // If no aerial video found in preloader, try to reload the original URL
          // Using void operator to explicitly indicate we're ignoring the promise result
          void dataLayer.getAssetsByType('AERIAL', locationId)
            .then(assets => {
              if (assets && assets.length > 0 && assets[0].accessUrl) {
                logger.info(MODULE, 'Found aerial asset from API');
                dispatch({ type: 'SET_VIDEO_URL', payload: assets[0].accessUrl });
              }
            })
            .catch(err => {
              logger.error(MODULE, 'Error loading aerial asset:', err);
            });
          
          // Don't wait for promise to complete
          return;
        }
      }
      
      // Special case for location-specific aerial after transition
      if (video.type === 'aerial' && video.locationId && video.locationId !== locationId) {
        logger.info(MODULE, `Loading aerial video for new location: ${video.locationId}`);
        
        // Look for cached aerial video for the new location
        const newLocationAerialIds = [
          `aerial_${video.locationId}_api`,
          `aerial_${video.locationId}_direct`,
          `aerial_${video.locationId}`,
        ];
        
        // Try each ID pattern for the new location
        let newLocationUrl = null;
        
        for (const id of newLocationAerialIds) {
          if (videoPreloaderRef.current) {
            const url = videoPreloaderRef.current.getVideoUrl(id);
            if (url) {
              logger.info(MODULE, `Found aerial URL for new location: ${id}`);
              newLocationUrl = url;
              break;
            }
          }
        }
        
        if (newLocationUrl) {
          logger.info(MODULE, `Setting aerial URL for new location: ${newLocationUrl.substring(0, 50)}...`);
          dispatch({ type: 'SET_VIDEO_URL', payload: newLocationUrl });
          return;
        } else {
          // If not found in cache, try to get it from the API
          logger.info(MODULE, `Fetching aerial asset from API for location: ${video.locationId}`);
          
          void dataLayer.getAssetsByType('AERIAL', video.locationId)
            .then(assets => {
              if (assets && assets.length > 0 && assets[0].accessUrl) {
                logger.info(MODULE, `Found aerial asset for new location: ${assets[0].name}`);
                dispatch({ type: 'SET_VIDEO_URL', payload: assets[0].accessUrl });
              } else {
                logger.warn(MODULE, 'No aerial assets found for new location, using fallback');
                // Try generic aerial asset as fallback
                dataLayer.getAssetsByType('AERIAL')
                  .then(allAssets => {
                    if (allAssets && allAssets.length > 0) {
                      dispatch({ type: 'SET_VIDEO_URL', payload: allAssets[0].accessUrl });
                    }
                  })
                  .catch(err => {
                    logger.error(MODULE, 'Error loading fallback aerial asset:', err);
                  });
              }
            })
            .catch(err => {
              logger.error(MODULE, 'Error loading aerial asset for new location:', err);
            });
          
          return;
        }
      }
      
      // Normal case - get the video URL from the preloader if available
      let url = null;
      
      if (videoPreloaderRef.current) {
        url = videoPreloaderRef.current.getVideoUrl(video.id);
      }
      
      // If not found in preloader, use the direct URL
      if (!url && video.accessUrl) {
        url = video.accessUrl;
      }
      
      if (url) {
        dispatch({ type: 'SET_VIDEO_URL', payload: url });
      } else {
        logger.error(MODULE, `Failed to get URL for video: ${video.id}`);
      }
    };
    
    const handleError = (error) => {
      logger.error(MODULE, `Video state manager error: ${error}`);
    };
    
    // Create the video state manager
    videoStateManagerRef.current = new VideoStateManager({
      onVideoChange: handleVideoChange,
      onLoadVideo: handleLoadVideo,
      onError: handleError
    });
    
    logger.info(MODULE, 'Video state manager initialized');
    
    return () => {
      // Reset state when unmounting
      videoStateManagerRef.current = null;
    };
  }, [videoPreloaderRef, locationId, dispatch]);

  // Handle user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      // User has interacted, ensure playing is set to true
      dispatch({ type: 'SET_IS_PLAYING', payload: true });
      
      // If video is paused, try to play it
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(err => {
          // If autoplay fails despite user interaction, log the error
          logger.error(MODULE, 'Error playing video after user interaction:', err);
          
          // If it's a NotAllowedError, force muted playback
          if (err.name === 'NotAllowedError') {
            logger.info(MODULE, 'Forcing muted playback after user interaction');
            videoRef.current.muted = true;
            videoRef.current.play().catch(mutedErr => {
              logger.error(MODULE, 'Error playing muted video after user interaction:', mutedErr);
            });
          }
        });
      }
      
      // Remove listeners after successful interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    // Add listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [dispatch]);

  // Load aerial asset for the location
  useEffect(() => {
    const getAerialAsset = async () => {
      // Skip if no locationId or already loading/loaded
      if (!locationId || assetLoadingRef.current || assetLoadedRef.current) return;
      
      // Mark as loading to prevent duplicate calls
      assetLoadingRef.current = true;
      
      try {
        // Get assets for this location
        logger.info(MODULE, `Fetching aerial asset for location: ${locationId}`);
        
        // First try getting all aerial assets to see what's available
        const allAerialAssets = await dataLayer.getAssetsByType('AERIAL');
        
        if (allAerialAssets && Array.isArray(allAerialAssets)) {
          logger.info(MODULE, `Found ${allAerialAssets.length || 0} total aerial assets`);
          
          if (allAerialAssets.length > 0) {
            logger.info(MODULE, `Available aerial assets:`, 
              allAerialAssets.map(a => ({
                name: a.name,
                location: a.location,
                id: a._id
              }))
            );
            
            // Check if any of these assets match our location
            const matchingAsset = allAerialAssets.find(asset => 
              asset.location && asset.location.toString() === locationId
            );
            
            if (matchingAsset) {
              logger.info(MODULE, `Found matching asset directly: ${matchingAsset.name}`);
              
              if (matchingAsset.accessUrl) {
                const fullUrl = matchingAsset.accessUrl.startsWith('http') 
                  ? matchingAsset.accessUrl 
                  : `${window.location.origin}${matchingAsset.accessUrl}`;
                
                logger.info(MODULE, `Setting video URL from direct match: ${fullUrl}`);
                dispatch({ type: 'SET_VIDEO_URL', payload: fullUrl });
                
                // Preload this asset
                await preloadVideoAsset(fullUrl, `aerial_${locationId}_direct`);
                assetLoadedRef.current = true;
                return; // Exit early since we found a match
              }
            }
          }
        }
        
        // If we get here, try the standard API call as a fallback
        try {
          const response = await dataLayer.getAssetsByType('AERIAL', locationId);
          
          if (response && Array.isArray(response)) {
            logger.info(MODULE, `getAssetsByType returned ${response.length || 0} assets for location ${locationId}`);
            
            if (response.length > 0) {
              const asset = response[0]; // Take the first aerial asset
              logger.info(MODULE, `Found aerial asset: ${asset.name}`);
              
              // Set the video URL directly
              if (asset.accessUrl) {
                const fullUrl = asset.accessUrl.startsWith('http') 
                  ? asset.accessUrl 
                  : `${window.location.origin}${asset.accessUrl}`;
                
                logger.info(MODULE, `Setting video URL: ${fullUrl}`);
                dispatch({ type: 'SET_VIDEO_URL', payload: fullUrl });
                
                // Preload this asset
                await preloadVideoAsset(fullUrl, `aerial_${locationId}_api`);
                assetLoadedRef.current = true;
                return; // Exit early with success
              }
            } else {
              logger.warn(MODULE, `No aerial assets found for location: ${locationId}`);
            }
          } else {
            logger.warn(MODULE, `Invalid response from getAssetsByType: ${typeof response}`);
          }
        } catch (apiError) {
          logger.error(MODULE, `API call error: ${apiError.message}`);
        }
        
        // If we got this far, we couldn't find an asset specifically for this location
        // Fall back to any aerial asset if available
        if (allAerialAssets && Array.isArray(allAerialAssets) && allAerialAssets.length > 0) {
          const fallbackAsset = allAerialAssets[0];
          logger.info(MODULE, `Using fallback aerial asset: ${fallbackAsset.name}`);
          
          if (fallbackAsset.accessUrl) {
            const fullUrl = fallbackAsset.accessUrl.startsWith('http') 
              ? fallbackAsset.accessUrl 
              : `${window.location.origin}${fallbackAsset.accessUrl}`;
            
            logger.info(MODULE, `Setting fallback video URL: ${fullUrl}`);
            dispatch({ type: 'SET_VIDEO_URL', payload: fullUrl });
            
            // Preload fallback asset
            await preloadVideoAsset(fullUrl, `aerial_fallback`);
            assetLoadedRef.current = true;
          }
        } else {
          // Only log error if we truly couldn't find any aerial assets
          logger.error(MODULE, `No aerial assets found at all`);
        }
      } catch (error) {
        logger.error(MODULE, `Error fetching aerial asset: ${error.message}`);
      } finally {
        // Reset loading flag regardless of success/failure
        assetLoadingRef.current = false;
      }
    };
    
    getAerialAsset();
  }, [locationId, preloadVideoAsset, dispatch]);

  // Reset aerial video state when returning from a PRIMARY hotspot sequence
  useEffect(() => {
    // Check if we've just transitioned back to aerial view from a PRIMARY hotspot sequence
    if (state.currentVideo === 'aerial' && !state.inPlaylistMode && state.activePrimaryHotspot === null && assetLoadedRef.current) {
      logger.info(MODULE, 'Detected return to aerial view, reloading aerial video');
      
      // Instead of immediately reloading, we need to make sure our state is cleared properly
      // Set a short timeout to ensure state has settled
      setTimeout(() => {
        // Only reload aerial asset if we're still in aerial view
        if (state.currentVideo === 'aerial' && videoRef.current) {
          logger.info(MODULE, 'Reloading aerial video from cache');
          
          // If video element exists, force a reload
          if (videoRef.current.currentTime !== 0) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(err => {
              logger.error(MODULE, 'Error playing aerial video after reset:', err);
            });
          }
        }
      }, 50);
    }
  }, [state.currentVideo, state.inPlaylistMode, state.activePrimaryHotspot]);

  // Update inPlaylistMode and activeHotspot when the video state manager changes
  useEffect(() => {
    // Skip if not initialized
    if (!videoStateManagerRef.current) return;
    
    // Check and update the playlist mode state
    dispatch({ type: 'SET_IN_PLAYLIST_MODE', payload: videoStateManagerRef.current.isInPlaylistMode() });
    
    // Check and update location transition state
    const isInTransitionNow = videoStateManagerRef.current.isInLocationTransition();
    dispatch({ type: 'SET_IN_LOCATION_TRANSITION', payload: isInTransitionNow });
    
    // Get destination location from state manager during transition
    if (isInTransitionNow) {
      const destLoc = videoStateManagerRef.current.getDestinationLocation();
      if (destLoc && destLoc._id) {
        logger.info(MODULE, `Current transition destination: ${destLoc.name} (${destLoc._id})`);
        dispatch({ type: 'SET_DESTINATION_LOCATION', payload: destLoc });
        
        // If URL doesn't match destination, update it (happens if transition ends early)
        if (destLoc._id !== locationId && state.currentVideo === 'aerial') {
          logger.info(MODULE, `Updating URL to match destination: ${destLoc._id}`);
          navigate(`/experience/${destLoc._id}`);
        }
      }
    } else if (!isInTransitionNow && state.inLocationTransition) {
      // Transition just ended
      const destLoc = videoStateManagerRef.current.getDestinationLocation();
      if (destLoc && destLoc._id) {
        logger.info(MODULE, `Transition completed to: ${destLoc.name} (${destLoc._id})`);
        
        // If URL doesn't match destination, update it
        if (destLoc._id !== locationId) {
          logger.info(MODULE, `Updating URL to match destination after transition: ${destLoc._id}`);
          navigate(`/experience/${destLoc._id}`);
        }
      }
      
      dispatch({ type: 'SET_TRANSITION_COMPLETE', payload: true });
      
      // Reset transition complete flag after a short delay
      setTimeout(() => {
        dispatch({ type: 'SET_TRANSITION_COMPLETE', payload: false });
      }, 100);
    }
    
    // Check and update the active hotspot
    const hotspot = videoStateManagerRef.current.getCurrentHotspot();
    if (hotspot) {
      // Only update the PRIMARY hotspot tracking
      dispatch({ type: 'SET_ACTIVE_PRIMARY_HOTSPOT', payload: hotspot });
      dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: hotspot });
    } else {
      dispatch({ type: 'SET_ACTIVE_PRIMARY_HOTSPOT', payload: null });
      // Don't clear activeHotspot here as it might be a SECONDARY hotspot
      if (state.inPlaylistMode) {
        dispatch({ type: 'SET_ACTIVE_HOTSPOT', payload: null });
      }
    }
  }, [state.currentVideo, state.inPlaylistMode, state.inLocationTransition, locationId, navigate, dispatch]);

  // Video event handlers
  const handleVideoEnded = useCallback((videoType) => {
    logger.debug(MODULE, `Video ended: ${videoType}`);
    
    // Check if this is a location transition video
    const isLocationTransition = videoType.startsWith('locationTransition') || 
                               videoType === 'locationTransition';
    
    // Pass control to the video state manager
    if (videoStateManagerRef.current) {
      // If this is a location transition video, handle special location navigation
      if (isLocationTransition && videoStateManagerRef.current.isInLocationTransition()) {
        logger.info(MODULE, 'Location transition video ended');
        
        // Get destination location ID before completing transition
        const destinationLoc = videoStateManagerRef.current.getDestinationLocation();
        const destLocationId = destinationLoc?._id;
        
        // Tell the state manager the video has ended
        videoStateManagerRef.current.handleVideoEnded(videoType);
        
        // If we have a valid destination ID, navigate to it
        if (destLocationId && destLocationId !== locationId) {
          logger.info(MODULE, `Navigating to new location: ${destinationLoc.name}`);
          
          // Navigate programmatically to change the URL
          navigate(`/experience/${destLocationId}`);
        }
        
        return;
      }
      
      // Detect zoom-out videos
      const isZoomOut = videoType.startsWith('zoomOut');
      
      // If this is a zoom-out video, ensure we properly transition back to aerial
      if (isZoomOut) {
        logger.info(MODULE, 'Zoom-out video ended, ensuring proper transition to aerial');
        
        // Tell the state manager this video has ended
        videoStateManagerRef.current.handleVideoEnded(videoType);
        
        // Additional safety check - force aerial state if needed
        if (videoStateManagerRef.current.getCurrentState() !== 'aerial') {
          logger.warn(MODULE, 'Forcing transition to aerial state');
          videoStateManagerRef.current.resetPlaylist();
          videoStateManagerRef.current.changeState('aerial');
        }
        
        // Force reload of aerial video if we have a valid URL
        // Try multiple ID patterns since the aerial video might be cached with different IDs
        const possibleAerialIds = [
          `aerial_${locationId}_api`,      // From API
          `aerial_${locationId}_direct`,   // Direct match
          `aerial_${locationId}`,          // Simple format
          `aerial_fallback`                // Fallback
        ];
        
        // Try to find the URL using the possible IDs
        let aerialUrl = null;
        for (const id of possibleAerialIds) {
          const url = videoPreloaderRef.current?.getVideoUrl(id);
          if (url) {
            logger.info(MODULE, `Found aerial URL for ID: ${id}`);
            aerialUrl = url;
            break;
          }
        }
        
        // If we found a URL, update the video source
        if (aerialUrl) {
          logger.info(MODULE, `Forcing reload of aerial video URL: ${aerialUrl.substring(0, 50)}...`);
          dispatch({ type: 'SET_VIDEO_URL', payload: aerialUrl });
        } else {
          logger.warn(MODULE, 'Could not find aerial video URL in preloader, trying alternate methods');
          
          // Fallback: Try to find the URL in the locations data
          const locationAerialAssets = locations?.filter(loc => loc._id === locationId)
            .flatMap(loc => {
              // If the location has an aerial asset, use it
              if (loc.aerialAsset && loc.aerialAsset.accessUrl) {
                return [loc.aerialAsset.accessUrl];
              }
              return [];
            });
          
          if (locationAerialAssets?.length > 0) {
            logger.info(MODULE, 'Using aerial URL from location data');
            dispatch({ type: 'SET_VIDEO_URL', payload: locationAerialAssets[0] });
          } else {
            // Last resort: Force a reload of the current video element
            logger.warn(MODULE, 'No aerial URL found, forcing video element reload');
            if (videoRef.current) {
              // Try to reset the video element completely
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
              videoRef.current.load();
            }
          }
        }
      } else {
        // For other video types, just notify the state manager
        videoStateManagerRef.current.handleVideoEnded(videoType);
      }
    } else {
      // Fallback if manager not available
      if (videoType !== 'aerial') {
        dispatch({ type: 'SET_CURRENT_VIDEO', payload: 'aerial' });
      }
    }
  }, [videoStateManagerRef, locationId, locations, videoPreloaderRef, navigate, dispatch]);

  const handleVideoLoadStart = useCallback((videoType) => {
    logger.debug(MODULE, `Video load started: ${videoType}`);
    // Don't set loading status since we're pre-caching
  }, []);

  const handleVideoLoadComplete = useCallback((videoType) => {
    logger.debug(MODULE, `Video load completed: ${videoType}`);
  }, []);

  const handleVideoPlaying = useCallback(() => {
    logger.debug(MODULE, `Video is now playing`);
    
    // Add a significant delay before setting the playing state to true
    // This gives the video element more time to fully establish its dimensions
    setTimeout(() => {
      logger.info(MODULE, 'Delayed video playing state update - now safe to render hotspots');
      dispatch({ type: 'SET_VIDEO_PLAYING', payload: true });
    }, 1000); // 1 second delay
  }, [dispatch]);

  const handlePlayClick = useCallback(() => {
    dispatch({ type: 'SET_IS_PLAYING', payload: true });
  }, [dispatch]);

  const handleVideoRef = useCallback((videoElement) => {
    videoRef.current = videoElement;
  }, []);

  // Return the video controller API
  return {
    videoRef,
    videoStateManagerRef,
    handleVideoEnded,
    handleVideoLoadStart,
    handleVideoLoadComplete,
    handleVideoPlaying,
    handlePlayClick,
    handleVideoRef,
    VIDEO_STATES
  };
} 
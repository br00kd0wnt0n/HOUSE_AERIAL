import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExperience } from '../context/ExperienceContext';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import HotspotOverlay from '../components/Hotspot/HotspotOverlay';
import InfoPanel from '../components/Hotspot/InfoPanel';
import VideoStateManager from '../utils/VideoStateManager';
import LocationNavigation from '../components/Experience/LocationNavigation';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';

/**
 * Experience.jsx - Main experience view for a selected location
 * Handles displaying videos, hotspots, and transitions with offline capability
 * Phase 2: Adds interactive hotspot playlist playback and secondary hotspot modals
 * Phase 3: Adds multi-location navigation support
 */
const Experience = () => {
  // Module name for logging
  const MODULE = 'Experience';
  
  // Get location ID from URL params
  const { locationId } = useParams();
  const navigate = useNavigate();
  
  // Access the experience context
  const { 
    locations,
    serviceWorkerReady,
    videoPreloaderRef
  } = useExperience();
  
  // Local state
  const [currentVideo, setCurrentVideo] = useState('aerial');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // New state to track actual playback
  const [currentLocation, setCurrentLocation] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [, setUsesServiceWorker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true); // Start with playing set to true for autoplay
  const [hotspots, setHotspots] = useState([]);
  const [inPlaylistMode, setInPlaylistMode] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [activeHotspot, setActiveHotspot] = useState(null); // Used for both PRIMARY and SECONDARY hotspots
  // Separate state for tracking PRIMARY hotspot sequences vs SECONDARY hotspot modals
  const [activePrimaryHotspot, setActivePrimaryHotspot] = useState(null);
  const [activeSecondaryHotspot, setActiveSecondaryHotspot] = useState(null);
  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  
  // Location transition state
  const [inLocationTransition, setInLocationTransition] = useState(false);
  const [, setDestinationLocation] = useState(null); // Only using setter
  const [, setTransitionComplete] = useState(false); // Only using setter
  
  // Reference to the video element
  const videoRef = useRef(null);
  
  // Use refs to track loading state and prevent duplicate API calls
  const assetLoadingRef = useRef(false);
  const assetLoadedRef = useRef(false);
  
  // Video state manager ref
  const videoStateManagerRef = useRef(null);
  
  // Import VIDEO_STATES for state comparisons
  const VIDEO_STATES = {
    AERIAL: 'aerial',
    DIVE_IN: 'diveIn',
    FLOOR_LEVEL: 'floorLevel',
    ZOOM_OUT: 'zoomOut',
    LOCATION_TRANSITION: 'locationTransition'
  };
  
  // Initialize the video state manager
  useEffect(() => {
    const handleVideoChange = (videoType) => {
      logger.info(MODULE, `Video state changed to: ${videoType}`);
      setCurrentVideo(videoType);
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
          setVideoUrl(foundAerialUrl);
          return;
        } else {
          logger.warn(MODULE, 'Could not find aerial URL, using fallback methods');
          // If no aerial video found in preloader, try to reload the original URL
          // Using void operator to explicitly indicate we're ignoring the promise result
          void dataLayer.getAssetsByType('AERIAL', locationId)
            .then(assets => {
              if (assets && assets.length > 0 && assets[0].accessUrl) {
                logger.info(MODULE, 'Found aerial asset from API');
                setVideoUrl(assets[0].accessUrl);
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
          setVideoUrl(newLocationUrl);
          return;
        } else {
          // If not found in cache, try to get it from the API
          logger.info(MODULE, `Fetching aerial asset from API for location: ${video.locationId}`);
          
          void dataLayer.getAssetsByType('AERIAL', video.locationId)
            .then(assets => {
              if (assets && assets.length > 0 && assets[0].accessUrl) {
                logger.info(MODULE, `Found aerial asset for new location: ${assets[0].name}`);
                setVideoUrl(assets[0].accessUrl);
              } else {
                logger.warn(MODULE, 'No aerial assets found for new location, using fallback');
                // Try generic aerial asset as fallback
                dataLayer.getAssetsByType('AERIAL')
                  .then(allAssets => {
                    if (allAssets && allAssets.length > 0) {
                      setVideoUrl(allAssets[0].accessUrl);
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
        setVideoUrl(url);
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
  }, [videoPreloaderRef, locationId]);
  
  // Handle user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      // User has interacted, ensure playing is set to true
      setIsPlaying(true);
      
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
  }, []);
  
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
          
          setHotspots(response);
        } else {
          logger.warn(MODULE, `No hotspots found for location: ${locationId}`);
          setHotspots([]);
        }
      } catch (error) {
        logger.error(MODULE, `Error loading hotspots: ${error.message}`);
        setHotspots([]);
      }
    };
    
    loadHotspots();
  }, [locationId]);
  
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
                setVideoUrl(fullUrl);
                
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
                setVideoUrl(fullUrl);
                
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
            setVideoUrl(fullUrl);
            
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
    
    // Helper function to preload a video with proper error handling and status updates
    const preloadVideoAsset = async (url, id) => {
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
        
        // Explicitly check if we're using the service worker by looking at request cache status
        try {
          // Make a HEAD request with special header to check cache status
          const response = await fetch(url, { 
            method: 'HEAD', 
            cache: 'no-store',
            headers: {
              'x-cache-check': 'true'
            }
          });
          
          // Check for our custom header from the service worker
          const fromServiceWorker = response.headers.get('x-from-sw-cache') === 'true';
          
          logger.info(MODULE, `Cache check for ${id}: fromServiceWorker=${fromServiceWorker}, serviceWorkerReady=${serviceWorkerReady}, status=${response.status}`);
          
          // If service worker is ready but we're not loading from it, log a warning
          if (serviceWorkerReady && !fromServiceWorker) {
            logger.warn(MODULE, `Service worker is ready but not serving the video`);
          }
          
          // Update status based on direct cache headers check
          setUsesServiceWorker(fromServiceWorker);
          logger.info(MODULE, `Using ${fromServiceWorker ? 'service worker cache' : 'browser cache'} for video ${id}`);
        } catch (cacheCheckError) {
          logger.error(MODULE, `Error checking cache status: ${cacheCheckError}`);
          // Fall back to strategy check
          const strategy = videoPreloaderRef.current.currentStrategy;
          const usingServiceWorker = strategy && 
            strategy.constructor.name === 'ServiceWorkerStrategy' &&
            serviceWorkerReady;
          
          setUsesServiceWorker(usingServiceWorker);
        }
      } catch (err) {
        logger.error(MODULE, `Error preloading video ${id}: ${err.message}`);
      }
    };
    
    getAerialAsset();
  }, [locationId, serviceWorkerReady, videoPreloaderRef]);
  
  // Find current location from locations list and update when locationId changes
  useEffect(() => {
    if (!locationId) return;
    
    if (locations && locations.length > 0) {
      const location = locations.find(loc => loc._id === locationId);
      if (location) {
        logger.info(MODULE, `Setting current location: ${location.name} (${location._id})`);
        setCurrentLocation(location);
        
        // If we're in a location transition, complete it
        if (inLocationTransition && videoStateManagerRef.current) {
          logger.info(MODULE, `Location ID changed during transition, completing transition to ${location.name}`);
          videoStateManagerRef.current.completeLocationTransition();
          
          // Load the new location's aerial video
          if (videoStateManagerRef.current.getCurrentState() === VIDEO_STATES.AERIAL) {
            logger.info(MODULE, 'Loading aerial video for new location after transition');
            
            // Reset any previous hotspot activity
            videoStateManagerRef.current.resetPlaylist();
            setActiveHotspot(null);
            setActivePrimaryHotspot(null);
            setActiveSecondaryHotspot(null);
          }
        }
      } else {
        logger.warn(MODULE, `Location not found: ${locationId}`);
      }
    }
  }, [locations, locationId, inLocationTransition, videoStateManagerRef, VIDEO_STATES.AERIAL]);
  
  // Reset aerial video state when returning from a PRIMARY hotspot sequence
  useEffect(() => {
    // Check if we've just transitioned back to aerial view from a PRIMARY hotspot sequence
    if (currentVideo === 'aerial' && !inPlaylistMode && activePrimaryHotspot === null && assetLoadedRef.current) {
      logger.info(MODULE, 'Detected return to aerial view, reloading aerial video');
      
      // Instead of immediately reloading, we need to make sure our state is cleared properly
      // Set a short timeout to ensure state has settled
      setTimeout(() => {
        // Only reload aerial asset if we're still in aerial view
        if (currentVideo === 'aerial' && videoRef.current) {
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
  }, [currentVideo, inPlaylistMode, activePrimaryHotspot]);
  
  // Update inPlaylistMode and activeHotspot when the video state manager changes
  useEffect(() => {
    // Skip if not initialized
    if (!videoStateManagerRef.current) return;
    
    // Check and update the playlist mode state
    setInPlaylistMode(videoStateManagerRef.current.isInPlaylistMode());
    
    // Check and update location transition state
    const isInTransitionNow = videoStateManagerRef.current.isInLocationTransition();
    setInLocationTransition(isInTransitionNow);
    
    // Get destination location from state manager during transition
    if (isInTransitionNow) {
      const destLoc = videoStateManagerRef.current.getDestinationLocation();
      if (destLoc && destLoc._id) {
        logger.info(MODULE, `Current transition destination: ${destLoc.name} (${destLoc._id})`);
        setDestinationLocation(destLoc);
        
        // If URL doesn't match destination, update it (happens if transition ends early)
        if (destLoc._id !== locationId && currentVideo === 'aerial') {
          logger.info(MODULE, `Updating URL to match destination: ${destLoc._id}`);
          navigate(`/experience/${destLoc._id}`);
        }
      }
    } else if (!isInTransitionNow && inLocationTransition) {
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
      
      setTransitionComplete(true);
      
      // Reset transition complete flag after a short delay
      setTimeout(() => {
        setTransitionComplete(false);
      }, 100);
    }
    
    // Check and update the active hotspot
    const hotspot = videoStateManagerRef.current.getCurrentHotspot();
    if (hotspot) {
      // Only update the PRIMARY hotspot tracking
      setActivePrimaryHotspot(hotspot);
      setActiveHotspot(hotspot);
    } else {
      setActivePrimaryHotspot(null);
      // Don't clear activeHotspot here as it might be a SECONDARY hotspot
      if (inPlaylistMode) {
        setActiveHotspot(null);
      }
    }
  }, [currentVideo, inPlaylistMode, inLocationTransition, locationId, navigate]);
  
  // Handle video end event
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
          setVideoUrl(aerialUrl);
        } else {
          logger.warn(MODULE, 'Could not find aerial video URL in preloader, trying alternate methods');
          
          // Fallback: Try to find the URL in the locations data
          const locationAerialAssets = locations.filter(loc => loc._id === locationId)
            .flatMap(loc => {
              // If the location has an aerial asset, use it
              if (loc.aerialAsset && loc.aerialAsset.accessUrl) {
                return [loc.aerialAsset.accessUrl];
              }
              return [];
            });
          
          if (locationAerialAssets.length > 0) {
            logger.info(MODULE, 'Using aerial URL from location data');
            setVideoUrl(locationAerialAssets[0]);
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
        setCurrentVideo('aerial');
      }
    }
  }, [videoStateManagerRef, locationId, locations, videoPreloaderRef, navigate]);
  
  // Handle video load start
  const handleVideoLoadStart = useCallback((videoType) => {
    logger.debug(MODULE, `Video load started: ${videoType}`);
    // Don't set loading status since we're pre-caching
  }, []);
  
  // Handle video load complete
  const handleVideoLoadComplete = useCallback((videoType) => {
    logger.debug(MODULE, `Video load completed: ${videoType}`);
  }, []);
  
  // Add a new handler for actual video playback
  const handleVideoPlaying = useCallback(() => {
    logger.debug(MODULE, `Video is now playing`);
    
    // Add a significant delay before setting the playing state to true
    // This gives the video element more time to fully establish its dimensions
    setTimeout(() => {
      logger.info(MODULE, 'Delayed video playing state update - now safe to render hotspots');
      setIsVideoPlaying(true);
    }, 1000); // 1 second delay
  }, []);
  
  // Handle back to home button click
  const handleBackToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);
  
  // Handle play button click
  const handlePlayClick = useCallback(() => {
    setIsPlaying(true);
  }, []);
  
  // Handle hotspot click with separate handling for PRIMARY and SECONDARY hotspots
  const handleHotspotClick = useCallback(async (hotspot) => {
    // If hotspot is null (called from InfoPanel close), just clear the active secondary hotspot
    if (!hotspot) {
      setActiveSecondaryHotspot(null);
      // Only clear the main activeHotspot if there's no active PRIMARY hotspot
      if (!activePrimaryHotspot) {
        setActiveHotspot(null);
      }
      return;
    }
    
    logger.info(MODULE, `Hotspot clicked: ${hotspot.name} (${hotspot._id}) - Type: ${hotspot.type}`);
    
    // Handle hotspots differently based on type
    if (hotspot.type === 'PRIMARY') {
      // Set the active PRIMARY hotspot for sequence handling
      setActivePrimaryHotspot(hotspot);
      setActiveHotspot(hotspot);
      
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
        
        logger.info(MODULE, `Starting playlist for hotspot: ${hotspot.name}`);
        
        // Start the playlist using the video state manager
        videoStateManagerRef.current.startHotspotPlaylist(hotspot, playlist);
      } catch (error) {
        logger.error(MODULE, `Error handling hotspot click: ${error.message}`);
      }
    } else if (hotspot.type === 'SECONDARY') {
      // For SECONDARY hotspots, just display the info panel without interrupting video
      logger.info(MODULE, `Showing info panel for secondary hotspot: ${hotspot.name}`);
      
      // Save video state before showing info panel (to ensure we maintain playback)
      const wasPlaying = videoRef.current && !videoRef.current.paused;
      
      // Update both tracking states
      setActiveSecondaryHotspot(hotspot);
      setActiveHotspot(hotspot);
      
      // Ensure video keeps playing if it was playing before
      if (wasPlaying && videoRef.current) {
        // Use setTimeout to ensure this happens after the InfoPanel is rendered
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            logger.debug(MODULE, 'Ensuring video continues playing while InfoPanel is shown');
            videoRef.current.play().catch(err => {
              logger.error(MODULE, 'Error ensuring video continues playing:', err);
            });
          }
        }, 100);
      }
    }
  }, [videoStateManagerRef, activePrimaryHotspot]);
  
  // Save reference to video element
  const handleVideoRef = useCallback((videoElement) => {
    videoRef.current = videoElement;
  }, []);
  
  // Modal close handler that preserves video state
  const handleInfoPanelClose = useCallback(() => {
    logger.debug(MODULE, 'Closing secondary hotspot info panel');
    setActiveSecondaryHotspot(null);
    // Only clear the main activeHotspot if there's no active PRIMARY hotspot
    if (!activePrimaryHotspot) {
      setActiveHotspot(null);
    }
  }, [activePrimaryHotspot]);
  
  // Set up debug mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => {
          const newValue = !prev;
          // Only log in development mode to avoid cluttering production logs
          if (process.env.NODE_ENV !== 'production') {
            logger.info(MODULE, `Debug mode ${newValue ? 'enabled' : 'disabled'}`);
          }
          return newValue;
        });
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Only log in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.info(MODULE, 'Debug mode shortcut available (Ctrl+Shift+D)');
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Handle location button click
  const handleLocationButtonClick = useCallback(async (destinationLoc) => {
    logger.info(MODULE, `Location button clicked: ${destinationLoc.name} (${destinationLoc._id})`);
    
    // Skip if we're already in a transition or playlist
    if (inLocationTransition || inPlaylistMode) {
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
      let sourceLoc = currentLocation;
      
      // If currentLocation isn't set yet, try to find it from locations array
      if (!sourceLoc && locations && locations.length > 0 && locationId) {
        sourceLoc = locations.find(loc => loc._id === locationId);
        
        // If we found it, update the currentLocation state
        if (sourceLoc) {
          logger.info(MODULE, `Found current location from locations array: ${sourceLoc.name}`);
          setCurrentLocation(sourceLoc);
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
      setDestinationLocation(destinationLoc);
      
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
  }, [currentLocation, locations, locationId, inLocationTransition, inPlaylistMode, videoStateManagerRef, navigate]);
  
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ 
      background: currentVideo === 'aerial' && !inPlaylistMode
        ? 'linear-gradient(to bottom, rgb(207 234 235), rgb(239 249 251))'
        : 'black'
    }}>
      {/* Main video player */}
      <VideoPlayer 
        src={videoUrl}
        type={currentVideo}
        onEnded={handleVideoEnded}
        onLoadStart={handleVideoLoadStart}
        onLoadComplete={handleVideoLoadComplete}
        onPlaying={handleVideoPlaying}
        isPlaying={isPlaying}
        onVideoRef={handleVideoRef}
        key={`video-player-${videoUrl}`}
      />
      
      {/* Hotspot overlay - only shown for aerial video when playing */}
      {currentVideo === 'aerial' && isVideoPlaying && videoRef.current && (
        <HotspotOverlay 
          hotspots={hotspots}
          onHotspotClick={handleHotspotClick}
          videoRef={videoRef}
          debugMode={debugMode}
          key={`hotspot-overlay-${videoUrl}`}
        />
      )}
      
      {/* Info panel for secondary hotspots */}
      {activeSecondaryHotspot && currentVideo === 'aerial' && (
        <InfoPanel 
          hotspot={activeSecondaryHotspot}
          onClose={handleInfoPanelClose}
        />
      )}
      
      {/* Location navigation buttons - only show during aerial view */}
      {currentVideo === 'aerial' && !inPlaylistMode && (
        <LocationNavigation 
          locations={locations}
          currentLocationId={locationId}
          onClick={handleLocationButtonClick}
          debugMode={debugMode}
          key={`location-nav-${locationId}`}
        />
      )}
      
      {/* Play button overlay if autoplay fails - show only if not playing and not loading */}
      {!isPlaying && videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <button 
            className="w-24 h-24 bg-netflix-red rounded-full flex items-center justify-center hover:bg-netflix-red/80 transition-colors"
            onClick={handlePlayClick}
          >
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[25px] border-l-white ml-2"></div>
          </button>
        </div>
      )}
      
      {/* UI Controls - Back to Home button with fixed positioning */}
      <div 
        className="fixed top-4 right-4 z-30"
      >
        <button 
          className="px-6 py-3 bg-netflix-red text-white rounded-lg hover:bg-netflix-red/80 transition-colors text-lg font-medium"
          onClick={handleBackToHome}
        >
          Back to Home
        </button>
      </div>
      
      {/* Debug info - only shown in debug mode */}
      {debugMode && (
        <>
          {/* Location info */}
          {currentLocation && !inPlaylistMode && (
            <div className="absolute bottom-8 left-8 z-10 bg-black/70 p-4 rounded text-white">
              <h2 className="text-2xl font-bold">{currentLocation.name}</h2>
              {currentLocation.description && (
                <p className="mt-2 text-sm max-w-md">{currentLocation.description}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Experience; 
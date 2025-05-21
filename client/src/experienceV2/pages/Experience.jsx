import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExperience } from '../context/ExperienceContext';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import HotspotOverlay from '../components/Hotspot/HotspotOverlay';
import LoadingScreen from '../components/LoadingScreen/LoadingScreen';
import VideoStateManager from '../utils/VideoStateManager';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';

/**
 * Experience.jsx - Main experience view for a selected location
 * Handles displaying videos, hotspots, and transitions with offline capability
 * Phase 2: Adds interactive hotspot playlist playback
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
    isLoading: globalLoading, 
    serviceWorkerReady,
    offlineMode,
    videoPreloaderRef
  } = useExperience();
  
  // Local state
  const [currentVideo, setCurrentVideo] = useState('aerial');
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [usesServiceWorker, setUsesServiceWorker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused to avoid autoplay issues
  const [hotspots, setHotspots] = useState([]);
  const [inPlaylistMode, setInPlaylistMode] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState(null);
  
  // Reference to the video element
  const videoRef = useRef(null);
  
  // Use refs to track loading state and prevent duplicate API calls
  const assetLoadingRef = useRef(false);
  const assetLoadedRef = useRef(false);
  
  // Video state manager ref
  const videoStateManagerRef = useRef(null);
  
  // Initialize the video state manager
  useEffect(() => {
    const handleVideoChange = (videoType) => {
      logger.info(MODULE, `Video state changed to: ${videoType}`);
      setCurrentVideo(videoType);
    };
    
    const handleLoadVideo = (video) => {
      logger.info(MODULE, `Loading video: ${video.type} - ${video.id}`);
      
      // Get the video URL from the preloader if available
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
  }, [videoPreloaderRef]);
  
  // Handle user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      setIsPlaying(true);
      // Remove listener after first interaction
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
                setIsVideoLoading(false);
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
                setIsVideoLoading(false);
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
            setIsVideoLoading(false);
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
  
  // Find current location from locations list
  useEffect(() => {
    if (locations && locations.length > 0 && locationId) {
      const location = locations.find(loc => loc._id === locationId);
      if (location) {
        logger.info(MODULE, `Setting current location: ${location.name} (${location._id})`);
        setCurrentLocation(location);
      } else {
        logger.warn(MODULE, `Location not found: ${locationId}`);
      }
    }
  }, [locations, locationId]);
  
  // Update inPlaylistMode and activeHotspot when the video state manager changes
  useEffect(() => {
    // Skip if not initialized
    if (!videoStateManagerRef.current) return;
    
    // Check and update the playlist mode state
    setInPlaylistMode(videoStateManagerRef.current.isInPlaylistMode());
    
    // Check and update the active hotspot
    const hotspot = videoStateManagerRef.current.getCurrentHotspot();
    if (hotspot) {
      setActiveHotspot(hotspot);
    } else {
      setActiveHotspot(null);
    }
  }, [currentVideo]);
  
  // Handle video end event
  const handleVideoEnded = useCallback((videoType) => {
    logger.debug(MODULE, `Video ended: ${videoType}`);
    
    // Pass control to the video state manager
    if (videoStateManagerRef.current) {
      videoStateManagerRef.current.handleVideoEnded(videoType);
    } else {
      // Fallback if manager not available
      if (videoType !== 'aerial') {
        setCurrentVideo('aerial');
      }
    }
  }, [videoStateManagerRef]);
  
  // Handle video load start
  const handleVideoLoadStart = useCallback((videoType) => {
    logger.debug(MODULE, `Video load started: ${videoType}`);
    setIsVideoLoading(true);
  }, []);
  
  // Handle video load complete
  const handleVideoLoadComplete = useCallback((videoType) => {
    logger.debug(MODULE, `Video load completed: ${videoType}`);
    setIsVideoLoading(false);
  }, []);
  
  // Handle back to home button click
  const handleBackToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);
  
  // Handle play button click
  const handlePlayClick = useCallback(() => {
    setIsPlaying(true);
  }, []);
  
  // Handle hotspot click - now with playlist functionality
  const handleHotspotClick = useCallback(async (hotspot) => {
    logger.info(MODULE, `Hotspot clicked: ${hotspot.name} (${hotspot._id})`);
    
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
  }, []);
  
  // Save reference to video element
  const handleVideoRef = useCallback((videoElement) => {
    videoRef.current = videoElement;
  }, []);
  
  // Show loading screen if global loading is true
  if (globalLoading) {
    return <LoadingScreen isComplete={false} text="Loading Experience..." />;
  }
  
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Main video player */}
      <VideoPlayer 
        src={videoUrl}
        type={currentVideo}
        onEnded={handleVideoEnded}
        onLoadStart={handleVideoLoadStart}
        onLoadComplete={handleVideoLoadComplete}
        isPlaying={isPlaying}
        onVideoRef={handleVideoRef}
      />
      
      {/* Hotspot overlay - only shown for aerial video when not loading */}
      {currentVideo === 'aerial' && !isVideoLoading && videoRef.current && (
        <HotspotOverlay 
          hotspots={hotspots}
          onHotspotClick={handleHotspotClick}
          videoRef={videoRef}
        />
      )}
      
      {/* Play button overlay if not playing */}
      {!isPlaying && videoUrl && !isVideoLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <button 
            className="w-24 h-24 bg-netflix-red rounded-full flex items-center justify-center hover:bg-netflix-red/80 transition-colors"
            onClick={handlePlayClick}
          >
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[25px] border-l-white ml-2"></div>
          </button>
        </div>
      )}
      
      {/* UI Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
        {/* Back button */}
        <button 
          className="px-4 py-2 bg-netflix-red text-white rounded hover:bg-netflix-red/80 transition-colors"
          onClick={handleBackToHome}
        >
          Back to Home
        </button>
        
        {/* Status indicator (combines offline, cache status, and playlist mode) */}
        <div className={`px-3 py-1 rounded text-sm text-white ${
          inPlaylistMode 
            ? 'bg-blue-600' 
            : offlineMode 
              ? 'bg-yellow-600' 
              : usesServiceWorker 
                ? 'bg-green-600' 
                : 'bg-orange-500'
        }`}>
          {inPlaylistMode 
            ? 'Hotspot Experience' 
            : offlineMode 
              ? 'Offline Mode' 
              : usesServiceWorker 
                ? 'Cache Ready' 
                : 'Online Mode'}
        </div>
      </div>
      
      {/* Location info */}
      {currentLocation && !inPlaylistMode && (
        <div className="absolute bottom-8 left-8 z-10 bg-black/70 p-4 rounded text-white">
          <h2 className="text-2xl font-bold">{currentLocation.name}</h2>
          {currentLocation.description && (
            <p className="mt-2 text-sm max-w-md">{currentLocation.description}</p>
          )}
        </div>
      )}
      
      {/* Hotspot info (shown during playlist mode) */}
      {activeHotspot && inPlaylistMode && (
        <div className="absolute bottom-8 left-8 z-10 bg-black/70 p-4 rounded text-white">
          <h2 className="text-2xl font-bold">{activeHotspot.name}</h2>
          {activeHotspot.description && (
            <p className="mt-2 text-sm max-w-md">{activeHotspot.description}</p>
          )}
        </div>
      )}
      
      {/* Loading indicator overlay */}
      {isVideoLoading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-black/80 p-6 rounded-lg">
            <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-white text-center">Loading video...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Experience; 
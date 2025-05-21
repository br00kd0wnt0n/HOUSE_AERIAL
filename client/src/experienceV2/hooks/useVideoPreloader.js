import { useState, useRef, useCallback, useEffect } from 'react';
import VideoPreloaderV2 from '../utils/videoLoading/VideoPreloaderV2';
import dataLayer from '../utils/dataLayer';
import logger from '../utils/logger';

/**
 * Custom hook for video preloader management
 * Extracts video preloading functionality from ExperienceContext
 */
export const useVideoPreloader = (setIsLoading) => {
  // Module name for logging
  const MODULE = 'VideoPreloader';
  
  // Video state
  const [currentVideo, setCurrentVideo] = useState('aerial');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  
  // Reference to video preloader
  const videoPreloaderRef = useRef(null);
  
  // Initialize video preloader
  useEffect(() => {
    // Create the video preloader with a progress callback
    const videoPreloader = new VideoPreloaderV2((loaded, total, details) => {
      setLoadingProgress({
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
        ...details
      });
      
      // Mark as preloaded when the loading is complete
      if (details?.status === 'complete' || details?.status === 'complete-with-errors') {
        setIsPreloaded(true);
        setIsLoading(false);
      }
    });
    
    // Store the reference
    videoPreloaderRef.current = videoPreloader;
    
    logger.debug(MODULE, 'Video preloader initialized');
    
    // Clean up on unmount
    return () => {
      if (videoPreloaderRef.current) {
        videoPreloaderRef.current.dispose();
        logger.debug(MODULE, 'Video preloader disposed');
      }
    };
  }, [setIsLoading]);

  // Preload videos for all locations
  const preloadAllLocationsVideos = useCallback(async (serviceWorkerReady, locationsData = null) => {
    if (!videoPreloaderRef.current) {
      logger.error(MODULE, 'Video preloader not initialized');
      return { loaded: 0, total: 0 };
    }
    
    try {
      setIsLoading(true);
      
      // Use provided locationsData if available, otherwise don't preload
      if (!locationsData || locationsData.length === 0) {
        logger.warn(MODULE, 'No locations data provided for preloading');
        setIsLoading(false);
        return { loaded: 0, total: 0 };
      }
      
      logger.info(MODULE, `Starting to preload videos for ${locationsData.length} locations`);
      
      // Store video info for each location
      const locationVideosMap = {};
      
      // Load video lists for each location - this can be done in parallel
      const promises = locationsData.map(async location => {
        try {
          // Fetch aerial video
          logger.debug(MODULE, `Fetching aerial videos for location ${location._id}`);
          const aerialVideos = await dataLayer.getAssetsByType('AERIAL', location._id);
          
          // Fetch transition video (same for all locations)
          logger.debug(MODULE, 'Fetching transition videos');
          const transitionVideos = await dataLayer.getAssetsByType('Transition');
          
          // Fetch hotspots for the location
          logger.debug(MODULE, `Fetching hotspots for location ${location._id}`);
          const hotspots = await dataLayer.getHotspotsByLocation(location._id) || [];
          
          // Collect videos for this location
          const locationVideos = [];
          
          // Add aerial video
          if (aerialVideos && aerialVideos.length > 0) {
            const aerialVideo = aerialVideos[0];
            locationVideos.push({
              id: `aerial_${location._id}`,
              url: aerialVideo.accessUrl,
              type: 'aerial',
              name: aerialVideo.name,
              lastModified: aerialVideo.updatedAt || Date.now()
            });
          }
          
          // Add transition video if available
          if (transitionVideos && transitionVideos.length > 0) {
            const transitionVideo = transitionVideos[0];
            locationVideos.push({
              id: `transition_${location._id}`,
              url: transitionVideo.accessUrl,
              type: 'transition',
              name: transitionVideo.name,
              lastModified: transitionVideo.updatedAt || Date.now()
            });
          }
          
          // Process hotspots and their videos
          logger.debug(MODULE, `Processing ${hotspots.length} hotspots for location ${location._id}`);
          for (const hotspot of hotspots) {
            try {
              // Fetch playlist for hotspot
              logger.debug(MODULE, `Fetching playlist for hotspot ${hotspot._id}`);
              const playlist = await dataLayer.getPlaylistByHotspot(hotspot._id);
              
              if (playlist && playlist.sequence) {
                // Add dive-in video
                if (playlist.sequence.diveInVideo) {
                  locationVideos.push({
                    id: `diveIn_${hotspot._id}`,
                    url: playlist.sequence.diveInVideo.accessUrl,
                    type: 'diveIn',
                    name: playlist.sequence.diveInVideo.name,
                    lastModified: playlist.sequence.diveInVideo.updatedAt || Date.now(),
                    hotspotId: hotspot._id
                  });
                }
                
                // Add floor-level video
                if (playlist.sequence.floorLevelVideo) {
                  locationVideos.push({
                    id: `floorLevel_${hotspot._id}`,
                    url: playlist.sequence.floorLevelVideo.accessUrl,
                    type: 'floorLevel',
                    name: playlist.sequence.floorLevelVideo.name,
                    lastModified: playlist.sequence.floorLevelVideo.updatedAt || Date.now(),
                    hotspotId: hotspot._id
                  });
                }
                
                // Add zoom-out video
                if (playlist.sequence.zoomOutVideo) {
                  locationVideos.push({
                    id: `zoomOut_${hotspot._id}`,
                    url: playlist.sequence.zoomOutVideo.accessUrl,
                    type: 'zoomOut',
                    name: playlist.sequence.zoomOutVideo.name,
                    lastModified: playlist.sequence.zoomOutVideo.updatedAt || Date.now(),
                    hotspotId: hotspot._id
                  });
                }
              }
            } catch (error) {
              logger.error(MODULE, `Error loading playlist for hotspot ${hotspot._id}`, error);
            }
          }
          
          // Store videos for this location
          locationVideosMap[location._id] = locationVideos;
          
          logger.info(MODULE, `Collected ${locationVideos.length} videos for location ${location._id}`);
          
          return {
            locationId: location._id,
            videosCount: locationVideos.length
          };
        } catch (error) {
          logger.error(MODULE, `Error loading videos for location ${location._id}`, error);
          return {
            locationId: location._id,
            error: error.message,
            videosCount: 0
          };
        }
      });
      
      // Wait for all video fetching to complete
      await Promise.all(promises);
      
      logger.info(MODULE, 'All location videos loaded from API, initializing preloader');
      
      // Initialize video preloader with all location videos
      videoPreloaderRef.current.initialize({
        locations: locationVideosMap,
        resetExisting: true
      });
      
      logger.info(MODULE, 'Starting to preload all videos');
      
      // Start preloading all videos with a timeout to prevent hanging
      const PRELOAD_TIMEOUT = 180000; // 3 minutes (increased from 30 seconds)
      const preloadPromise = videoPreloaderRef.current.preloadAll({
        useServiceWorker: serviceWorkerReady
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          logger.warn(MODULE, 'Video preloading timed out - continuing anyway');
          resolve({ timedOut: true });
        }, PRELOAD_TIMEOUT);
      });
      
      // Race between preloading and timeout
      const result = await Promise.race([preloadPromise, timeoutPromise]);
      
      if (result && result.timedOut) {
        logger.warn(MODULE, 'Video preloading timed out but experience will continue');
      } else {
        logger.info(MODULE, 'All videos preloaded successfully');
      }
      
      setIsLoading(false);
      return videoPreloaderRef.current.loadingProgress || { loaded: 0, total: 0 };
    } catch (error) {
      logger.error(MODULE, 'Error preloading all location videos', error);
      setIsLoading(false);
      return { loaded: 0, total: 0 };
    }
  }, [setIsLoading]);

  // Get a video URL from the preloader
  const getVideoUrl = useCallback((videoId) => {
    if (!videoPreloaderRef.current) {
      logger.warn(MODULE, `Cannot get URL for video ${videoId}: preloader not initialized`);
      return null;
    }
    
    return videoPreloaderRef.current.getVideoUrl(videoId);
  }, []);

  // Get a video object from the preloader
  const getVideo = useCallback((videoId) => {
    if (!videoPreloaderRef.current) {
      logger.warn(MODULE, `Cannot get video ${videoId}: preloader not initialized`);
      return null;
    }
    
    return videoPreloaderRef.current.getVideo(videoId);
  }, []);

  return {
    currentVideo,
    setCurrentVideo,
    isPreloaded,
    setIsPreloaded,
    loadingProgress,
    setLoadingProgress,
    videoPreloaderRef,
    preloadAllLocationsVideos,
    getVideoUrl,
    getVideo
  };
};

export default useVideoPreloader; 
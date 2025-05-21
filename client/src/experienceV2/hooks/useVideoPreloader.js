import { useState, useRef, useCallback, useEffect } from 'react';
import VideoPreloaderV2 from '../utils/videoLoading/VideoPreloaderV2';
import dataLayer from '../utils/dataLayer';
import logger from '../utils/logger';

// Module name for logging
const MODULE = 'VideoPreloader';

// Constants
const PRELOAD_TIMEOUT = 180000; // 3 minutes timeout for preloading

/**
 * Custom hook for video preloader management
 * Extracts video preloading functionality from ExperienceContext
 */
export const useVideoPreloader = (setIsLoading) => {
  // Video state
  const [currentVideo, setCurrentVideo] = useState('aerial');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  
  // Reference to video preloader
  const videoPreloaderRef = useRef(null);
  
  /**
   * Initialize video preloader
   */
  useEffect(() => {
    // Create the video preloader with a progress callback
    const videoPreloader = new VideoPreloaderV2((loaded, total, details) => {
      // Update loading progress state
      const progressData = {
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
        ...details
      };
      
      setLoadingProgress(progressData);
      
      // Mark as preloaded when the loading is complete
      if (details?.status === 'complete' || details?.status === 'complete-with-errors') {
        logger.debug(MODULE, `Preloading complete. Status: ${details?.status}`);
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

  /**
   * Create a promise that resolves after a timeout
   * @param {number} ms - Timeout in milliseconds
   * @returns {Promise} Promise that resolves after timeout
   */
  const createTimeoutPromise = useCallback((ms) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        logger.warn(MODULE, `Operation timed out after ${ms}ms`);
        resolve({ timedOut: true });
      }, ms);
    });
  }, []);

  /**
   * Fetch aerial videos for a location
   * @param {Object} location - Location object
   * @returns {Promise<Array>} - Array of video objects
   */
  const fetchAerialVideos = useCallback(async (location) => {
    try {
      logger.debug(MODULE, `Fetching aerial videos for location ${location._id}`);
      const aerialVideos = await dataLayer.getAssetsByType('AERIAL', location._id);
      
      if (!aerialVideos || !Array.isArray(aerialVideos) || aerialVideos.length === 0) {
        logger.warn(MODULE, `No aerial videos found for location ${location._id}`);
        return [];
      }
      
      // Convert to video objects format
      return aerialVideos.map(video => ({
        id: `aerial_${location._id}`,
        url: video.accessUrl,
        type: 'aerial',
        name: video.name,
        lastModified: video.updatedAt || Date.now()
      }));
    } catch (error) {
      logger.error(MODULE, `Error fetching aerial videos for location ${location._id}`, error);
      return [];
    }
  }, []);

  /**
   * Fetch transition videos
   * @returns {Promise<Array>} - Array of video objects
   */
  const fetchTransitionVideos = useCallback(async (locationId) => {
    try {
      logger.debug(MODULE, 'Fetching transition videos');
      const transitionVideos = await dataLayer.getAssetsByType('Transition');
      
      if (!transitionVideos || !Array.isArray(transitionVideos) || transitionVideos.length === 0) {
        logger.warn(MODULE, 'No transition videos found');
        return [];
      }
      
      // Convert to video objects format
      return transitionVideos.map(video => ({
        id: `transition_${locationId}`,
        url: video.accessUrl,
        type: 'transition',
        name: video.name,
        lastModified: video.updatedAt || Date.now()
      }));
    } catch (error) {
      logger.error(MODULE, 'Error fetching transition videos', error);
      return [];
    }
  }, []);

  /**
   * Process a video for a playlist
   * @param {Object} video - Video object from playlist
   * @param {string} type - Video type (diveIn, floorLevel, zoomOut)
   * @param {string} hotspotId - ID of hotspot
   * @returns {Object|null} - Processed video object or null if invalid
   */
  const processPlaylistVideo = useCallback((video, type, hotspotId) => {
    if (!video || !video.accessUrl) {
      return null;
    }
    
    return {
      id: `${type}_${hotspotId}`,
      url: video.accessUrl,
      type,
      name: video.name,
      lastModified: video.updatedAt || Date.now(),
      hotspotId
    };
  }, []);

  /**
   * Process a hotspot and get its videos
   * @param {Object} hotspot - Hotspot object
   * @param {string} locationId - Location ID
   * @returns {Promise<Array>} - Array of video objects
   */
  const processHotspot = useCallback(async (hotspot, locationId) => {
    try {
      logger.debug(MODULE, `Processing hotspot ${hotspot._id} for location ${locationId}`);
      
      // Fetch playlist for hotspot
      const playlist = await dataLayer.getPlaylistByHotspot(hotspot._id);
      
      if (!playlist || !playlist.sequence) {
        logger.warn(MODULE, `No valid playlist found for hotspot ${hotspot._id}`);
        return [];
      }
      
      const videos = [];
      
      // Process each video type
      const diveInVideo = processPlaylistVideo(
        playlist.sequence.diveInVideo,
        'diveIn',
        hotspot._id
      );
      if (diveInVideo) videos.push(diveInVideo);
      
      const floorLevelVideo = processPlaylistVideo(
        playlist.sequence.floorLevelVideo,
        'floorLevel',
        hotspot._id
      );
      if (floorLevelVideo) videos.push(floorLevelVideo);
      
      const zoomOutVideo = processPlaylistVideo(
        playlist.sequence.zoomOutVideo,
        'zoomOut',
        hotspot._id
      );
      if (zoomOutVideo) videos.push(zoomOutVideo);
      
      return videos;
    } catch (error) {
      logger.error(MODULE, `Error processing hotspot ${hotspot._id}`, error);
      return [];
    }
  }, [processPlaylistVideo]);

  /**
   * Process a location and get all its videos
   * @param {Object} location - Location object
   * @returns {Promise<Object>} - Object with locationId and videos
   */
  const processLocation = useCallback(async (location) => {
    try {
      logger.debug(MODULE, `Processing videos for location ${location._id}`);
      
      let locationVideos = [];
      
      // Fetch aerial videos
      const aerialVideos = await fetchAerialVideos(location);
      locationVideos = [...locationVideos, ...aerialVideos];
      
      // Fetch transition videos
      const transitionVideos = await fetchTransitionVideos(location._id);
      locationVideos = [...locationVideos, ...transitionVideos];
      
      // Fetch hotspots for the location
      const hotspots = await dataLayer.getHotspotsByLocation(location._id) || [];
      logger.debug(MODULE, `Found ${hotspots.length} hotspots for location ${location._id}`);
      
      // Process each hotspot in sequence to avoid too many parallel requests
      for (const hotspot of hotspots) {
        const hotspotVideos = await processHotspot(hotspot, location._id);
        locationVideos = [...locationVideos, ...hotspotVideos];
      }
      
      logger.debug(MODULE, `Collected ${locationVideos.length} videos for location ${location._id}`);
      
      return {
        locationId: location._id,
        videos: locationVideos
      };
    } catch (error) {
      logger.error(MODULE, `Error processing location ${location._id}`, error);
      return {
        locationId: location._id,
        videos: [],
        error: error.message
      };
    }
  }, [fetchAerialVideos, fetchTransitionVideos, processHotspot]);

  /**
   * Preload videos for all locations
   * @param {boolean} serviceWorkerReady - Whether service worker is ready
   * @param {Array} locationsData - Array of location objects
   * @returns {Promise<Object>} - Loading progress object
   */
  const preloadAllLocationsVideos = useCallback(async (serviceWorkerReady, locationsData = null) => {
    if (!videoPreloaderRef.current) {
      logger.error(MODULE, 'Video preloader not initialized');
      return { loaded: 0, total: 0 };
    }
    
    try {
      setIsLoading(true);
      
      // Validate locations data
      if (!locationsData || !Array.isArray(locationsData) || locationsData.length === 0) {
        logger.warn(MODULE, 'No locations data provided for preloading');
        setIsLoading(false);
        return { loaded: 0, total: 0 };
      }
      
      logger.info(MODULE, `Starting to preload videos for ${locationsData.length} locations`);
      
      // Process each location in parallel and collect videos
      const locationVideosMap = {};
      const locationProcessingPromises = locationsData.map(location => processLocation(location));
      
      const processedLocations = await Promise.all(locationProcessingPromises);
      
      // Organize videos by location
      processedLocations.forEach(result => {
        if (result && result.locationId && result.videos) {
          locationVideosMap[result.locationId] = result.videos;
        }
      });
      
      // Check if we have any videos to preload
      const totalVideos = Object.values(locationVideosMap)
        .reduce((total, videos) => total + videos.length, 0);
        
      if (totalVideos === 0) {
        logger.warn(MODULE, 'No videos found to preload');
        setIsLoading(false);
        return { loaded: 0, total: 0 };
      }
      
      logger.info(MODULE, `Found ${totalVideos} videos to preload across ${locationsData.length} locations`);
      
      // Initialize video preloader with all location videos
      videoPreloaderRef.current.initialize({
        locations: locationVideosMap,
        resetExisting: true
      });
      
      logger.info(MODULE, 'Starting to preload all videos');
      
      // Start preloading all videos with a timeout to prevent hanging
      const preloadPromise = videoPreloaderRef.current.preloadAll({
        useServiceWorker: serviceWorkerReady
      });
      
      // Create a timeout promise
      const timeoutPromise = createTimeoutPromise(PRELOAD_TIMEOUT);
      
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
  }, [setIsLoading, processLocation, createTimeoutPromise]);

  /**
   * Get a video URL from the preloader
   * @param {string} videoId - ID of video to get URL for
   * @returns {string|null} - Video URL or null if not found
   */
  const getVideoUrl = useCallback((videoId) => {
    if (!videoPreloaderRef.current) {
      logger.warn(MODULE, `Cannot get URL for video ${videoId}: preloader not initialized`);
      return null;
    }
    
    try {
      return videoPreloaderRef.current.getVideoUrl(videoId);
    } catch (error) {
      logger.error(MODULE, `Error getting URL for video ${videoId}`, error);
      return null;
    }
  }, []);

  /**
   * Get a video object from the preloader
   * @param {string} videoId - ID of video to get
   * @returns {Object|null} - Video object or null if not found
   */
  const getVideo = useCallback((videoId) => {
    if (!videoPreloaderRef.current) {
      logger.warn(MODULE, `Cannot get video ${videoId}: preloader not initialized`);
      return null;
    }
    
    try {
      return videoPreloaderRef.current.getVideo(videoId);
    } catch (error) {
      logger.error(MODULE, `Error getting video ${videoId}`, error);
      return null;
    }
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
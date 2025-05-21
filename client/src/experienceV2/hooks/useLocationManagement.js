import { useState, useCallback, useRef } from 'react';
import dataLayer from '../utils/dataLayer';
import logger from '../utils/logger';

// Module name for logging
const MODULE = 'LocationManager';

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

/**
 * Custom hook for location management
 * Extracts location-related functionality from ExperienceContext
 */
export const useLocationManagement = (setIsLoading) => {
  // Locations state
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Use a ref to cache locations with timestamp for the loadLocations function
  const locationsCache = useRef({
    data: [],
    timestamp: 0
  });
  
  // Update ref whenever locations state changes
  if (locations !== locationsCache.current.data) {
    locationsCache.current = {
      data: locations,
      timestamp: Date.now()
    };
  }

  /**
   * Check if the cached locations data is valid (not stale)
   * @returns {boolean} Whether the cache is valid
   */
  const isCacheValid = useCallback(() => {
    const { data, timestamp } = locationsCache.current;
    const now = Date.now();
    
    // Cache is valid if it's not empty, not too old, and has data
    return (
      data.length > 0 && 
      (now - timestamp) < CACHE_EXPIRY_TIME
    );
  }, []);

  /**
   * Load locations from the server or cache
   * @param {boolean} forceRefresh - Whether to force a fresh load from server
   * @returns {Promise<Array>} - Array of location objects
   */
  const loadLocations = useCallback(async (forceRefresh = false) => {
    try {
      // Use cache if valid and not forcing refresh
      if (!forceRefresh && isCacheValid()) {
        logger.debug(MODULE, 'Using cached locations data');
        return locationsCache.current.data;
      }
      
      setIsLoading(true);
      logger.debug(MODULE, 'Loading locations from server');
      
      // Fetch locations using dataLayer
      const locationsData = await dataLayer.getLocations(forceRefresh);
      
      if (!locationsData || !Array.isArray(locationsData) || locationsData.length === 0) {
        logger.warn(MODULE, 'No locations found');
        setIsLoading(false);
        return [];
      }
      
      logger.debug(MODULE, `Loaded ${locationsData.length} locations`);
      
      // Update state and cache
      setLocations(locationsData);
      locationsCache.current = {
        data: locationsData,
        timestamp: Date.now()
      };
      
      return locationsData;
    } catch (error) {
      logger.error(MODULE, 'Error loading locations', error);
      setIsLoading(false);
      return [];
    }
  }, [setIsLoading, isCacheValid]);

  /**
   * Load a specific location and its associated videos
   * @param {string} locationId - ID of the location to load
   * @param {Object} videoPreloader - Video preloader object
   * @param {boolean} serviceWorkerReady - Whether the service worker is ready
   * @returns {Promise<Object|null>} - Location object or null if not found
   */
  const loadLocation = useCallback(async (locationId, videoPreloader, serviceWorkerReady) => {
    // Validate input
    if (!locationId) {
      logger.error(MODULE, 'Cannot load location: locationId is required');
      return null;
    }
    
    try {
      setIsLoading(true);
      logger.debug(MODULE, `Loading location ${locationId}`);
      
      // First check if the location is in our cached locations
      let location = null;
      
      // If we have cached locations, check there first
      if (isCacheValid()) {
        location = locationsCache.current.data.find(loc => loc._id === locationId);
        
        if (location) {
          logger.debug(MODULE, `Found location ${locationId} in cache`);
        }
      }
      
      // If not found in cache, fetch from server
      if (!location) {
        logger.debug(MODULE, `Fetching location ${locationId} from server`);
        location = await dataLayer.getLocation(locationId);
        
        if (!location) {
          logger.error(MODULE, `Location ${locationId} not found on server`);
          setIsLoading(false);
          return null;
        }
      }
      
      // Update current location state
      setCurrentLocation(location);
      
      // Skip video preloading if preloader not available
      if (!videoPreloader) {
        logger.debug(MODULE, 'Video preloader not available, skipping video preload');
        setIsLoading(false);
        return location;
      }
      
      // Check if videos for this location are already preloaded
      const isVideoPreloaded = 
        videoPreloader.isComplete && 
        typeof videoPreloader.isComplete === 'function' && 
        videoPreloader.isComplete(locationId);
        
      if (isVideoPreloaded) {
        logger.debug(MODULE, `Videos for location ${locationId} already preloaded`);
        setIsLoading(false);
        return location;
      }
      
      // Preload videos for this location
      logger.debug(MODULE, `Preloading videos for location ${locationId}`);
      
      // Validate preloader method exists before calling
      if (videoPreloader.preloadLocation && typeof videoPreloader.preloadLocation === 'function') {
        try {
          await videoPreloader.preloadLocation(locationId, {
            useServiceWorker: serviceWorkerReady
          });
          logger.debug(MODULE, `Videos preloaded for location ${locationId}`);
        } catch (preloadError) {
          // Don't fail the whole operation if preloading fails
          logger.warn(MODULE, `Error preloading videos for location ${locationId}, continuing anyway`, preloadError);
        }
      } else {
        logger.warn(MODULE, 'Video preloader does not have preloadLocation method');
      }
      
      setIsLoading(false);
      return location;
    } catch (error) {
      logger.error(MODULE, `Error loading location ${locationId}`, error);
      setIsLoading(false);
      return null;
    }
  }, [setIsLoading, isCacheValid]);

  /**
   * Force reload of locations data from server
   * @returns {Promise<Array>} - Fresh array of location objects
   */
  const refreshLocations = useCallback(async () => {
    logger.debug(MODULE, 'Forcing refresh of locations data');
    return await loadLocations(true);
  }, [loadLocations]);

  return {
    locations,
    setLocations,
    currentLocation,
    setCurrentLocation,
    loadLocations,
    loadLocation,
    refreshLocations
  };
};

export default useLocationManagement; 
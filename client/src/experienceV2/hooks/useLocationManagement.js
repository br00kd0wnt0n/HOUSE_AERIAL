import { useState, useCallback, useRef } from 'react';
import dataLayer from '../utils/dataLayer';
import logger from '../utils/logger';

/**
 * Custom hook for location management
 * Extracts location-related functionality from ExperienceContext
 */
export const useLocationManagement = (setIsLoading) => {
  // Module name for logging
  const MODULE = 'LocationManager';
  
  // Locations state
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Use another ref to cache locations for the loadLocations function 
  // without creating a circular dependency
  const locationsRef = useRef([]);
  
  // Update ref whenever locations state changes
  // This doesn't trigger re-renders
  if (locations !== locationsRef.current) {
    locationsRef.current = locations;
  }

  // Load locations from the server
  const loadLocations = useCallback(async () => {
    try {
      // Skip loading if locations were already loaded
      if (locationsRef.current.length > 0) {
        logger.debug(MODULE, 'Locations already loaded, using cached data');
        return locationsRef.current;
      }
      
      setIsLoading(true);
      logger.info(MODULE, 'Loading locations');
      
      // Fetch locations using dataLayer instead of direct API call
      const locationsData = await dataLayer.getLocations();
      
      if (!locationsData || locationsData.length === 0) {
        logger.warn(MODULE, 'No locations found');
        setIsLoading(false);
        return [];
      }
      
      logger.info(MODULE, `Loaded ${locationsData.length} locations`);
      setLocations(locationsData);
      
      return locationsData;
    } catch (error) {
      logger.error(MODULE, 'Error loading locations', error);
      setIsLoading(false);
      return [];
    }
  }, [setIsLoading]); // Remove locations from dependencies

  // Load a specific location
  const loadLocation = useCallback(async (locationId, videoPreloader, serviceWorkerReady) => {
    if (!locationId) {
      logger.error(MODULE, 'Location ID is required');
      return null;
    }
    
    try {
      setIsLoading(true);
      logger.info(MODULE, `Loading location ${locationId}`);
      
      // Fetch location details using dataLayer
      const location = await dataLayer.getLocation(locationId);
      
      if (!location) {
        logger.error(MODULE, `Location ${locationId} not found`);
        setIsLoading(false);
        return null;
      }
      
      setCurrentLocation(location);
      
      // Check if videos for this location are already preloaded
      if (videoPreloader && videoPreloader.isComplete && videoPreloader.isComplete(locationId)) {
        logger.debug(MODULE, `Videos for location ${locationId} already preloaded`);
        setIsLoading(false);
        return location;
      }
      
      // Preload videos for this location
      logger.info(MODULE, `Preloading videos for location ${locationId}`);
      if (videoPreloader && videoPreloader.preloadLocation) {
        await videoPreloader.preloadLocation(locationId, {
          useServiceWorker: serviceWorkerReady
        });
      }
      
      setIsLoading(false);
      return location;
    } catch (error) {
      logger.error(MODULE, `Error loading location ${locationId}`, error);
      setIsLoading(false);
      return null;
    }
  }, [setIsLoading]);

  return {
    locations,
    setLocations,
    currentLocation,
    setCurrentLocation,
    loadLocations,
    loadLocation
  };
};

export default useLocationManagement; 
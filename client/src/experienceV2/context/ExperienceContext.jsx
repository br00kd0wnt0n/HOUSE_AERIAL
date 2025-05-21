import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import useServiceWorker from '../hooks/useServiceWorker';
import useLocationManagement from '../hooks/useLocationManagement';
import useVideoPreloader from '../hooks/useVideoPreloader';
import logger from '../utils/logger';

// Module name for logging
const MODULE = 'ExperienceContext';

// Create context
const ExperienceContext = createContext();

// Custom hook for using the context
export const useExperience = () => {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error('useExperience must be used within an ExperienceProvider');
  }
  return context;
};

/**
 * ExperienceProvider - Provides global state management for the v2 experience
 * Handles video caching, preloading, and state transitions
 */
export const ExperienceProvider = ({ children }) => {
  logger.debug(MODULE, 'Initializing ExperienceProvider');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Hooks for different parts of functionality
  const serviceWorker = useServiceWorker();
  const locationManager = useLocationManagement(setIsLoading);
  const videoPreloader = useVideoPreloader(setIsLoading);
  
  // Store stable references to functions we need in dependency arrays
  const { serviceWorkerReady } = serviceWorker;
  const { loadLocations } = locationManager;
  const { 
    preloadAllLocationsVideos,
    videoPreloaderRef
  } = videoPreloader;
  
  // Enhanced preload function combining multiple hooks
  const preloadAllVideos = useCallback(async () => {
    logger.info(MODULE, 'Starting preload of all videos');
    
    // First load the locations data
    const locationsData = await loadLocations();
    
    // Then pass the data directly to the preloader
    const result = await preloadAllLocationsVideos(serviceWorkerReady, locationsData);
    
    logger.info(MODULE, `Preload complete. Loaded ${result.loaded}/${result.total} videos`);
    return result;
  }, [loadLocations, preloadAllLocationsVideos, serviceWorkerReady]);
  
  // Enhanced load location function
  const loadLocation = useCallback(async (locationId) => {
    logger.info(MODULE, `Loading location: ${locationId}`);
    
    if (!locationId) {
      logger.error(MODULE, 'Cannot load location: locationId is required');
      return null;
    }
    
    const videoPreloader = videoPreloaderRef.current;
    const result = await locationManager.loadLocation(
      locationId, 
      videoPreloader,
      serviceWorkerReady
    );
    
    if (result) {
      logger.info(MODULE, `Location loaded successfully: ${locationId}`);
    } else {
      logger.error(MODULE, `Failed to load location: ${locationId}`);
    }
    
    return result;
  }, [locationManager, videoPreloaderRef, serviceWorkerReady]);

  // Log when key dependencies change
  useEffect(() => {
    logger.debug(MODULE, `Service worker ready: ${serviceWorkerReady}`);
  }, [serviceWorkerReady]);
  
  useEffect(() => {
    if (locationManager.locations.length > 0) {
      logger.debug(MODULE, `Locations loaded: ${locationManager.locations.length}`);
    }
  }, [locationManager.locations]);

  // Value to be provided by the context
  const value = {
    // Loading state
    isLoading,
    setIsLoading,
    loadingProgress: videoPreloader.loadingProgress,
    isPreloaded: videoPreloader.isPreloaded,
    
    // Locations
    locations: locationManager.locations,
    currentLocation: locationManager.currentLocation,
    setCurrentLocation: locationManager.setCurrentLocation,
    loadLocations: locationManager.loadLocations,
    loadLocation,
    
    // Video state
    currentVideo: videoPreloader.currentVideo,
    setCurrentVideo: videoPreloader.setCurrentVideo,
    getVideoUrl: videoPreloader.getVideoUrl,
    getVideo: videoPreloader.getVideo,
    videoPreloaderRef: videoPreloader.videoPreloaderRef,
    preloadAllLocationsVideos: preloadAllVideos,
    
    // Service worker state and methods
    serviceWorkerReady: serviceWorker.serviceWorkerReady,
    offlineMode: serviceWorker.offlineMode,
    cacheVersions: serviceWorker.cacheVersions,
    cacheVideos: serviceWorker.cacheVideos,
    clearCaches: serviceWorker.clearCaches,
    checkCacheVersion: serviceWorker.checkCacheVersion
  };
  
  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
};

export default ExperienceContext; 
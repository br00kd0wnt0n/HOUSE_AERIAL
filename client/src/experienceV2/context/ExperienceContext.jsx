import React, { createContext, useContext, useState, useCallback } from 'react';
import useServiceWorker from '../hooks/useServiceWorker';
import useLocationManagement from '../hooks/useLocationManagement';
import useVideoPreloader from '../hooks/useVideoPreloader';

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
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Hooks for different parts of functionality
  const serviceWorker = useServiceWorker();
  const locationManager = useLocationManagement(setIsLoading);
  const videoPreloader = useVideoPreloader(setIsLoading);
  
  // Enhanced preload function combining multiple hooks - memoized to prevent recreation
  const preloadAllVideos = useCallback(async () => {
    // First load the locations data
    const locationsData = await locationManager.loadLocations();
    
    // Then pass the data directly to the preloader
    return await videoPreloader.preloadAllLocationsVideos(
      serviceWorker.serviceWorkerReady,
      locationsData
    );
  // We're only including the specific methods/properties that are used, not the entire objects.
  // Including the entire objects would cause unnecessary re-creation of this function on every render
  // because the objects (locationManager, videoPreloader) are recreated on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPreloader.preloadAllLocationsVideos, serviceWorker.serviceWorkerReady, locationManager.loadLocations]);
  
  // Enhanced load location function - memoized to prevent recreation
  const loadLocation = useCallback(async (locationId) => {
    return await locationManager.loadLocation(
      locationId, 
      videoPreloader.videoPreloaderRef.current,
      serviceWorker.serviceWorkerReady
    );
  // We're only including the specific methods/properties that are used, not the entire objects.
  // Including the entire objects would cause unnecessary re-creation of this function on every render
  // because the objects (locationManager, videoPreloader) are recreated on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationManager.loadLocation, videoPreloader.videoPreloaderRef, serviceWorker.serviceWorkerReady]);

  // Value to be provided by the context - memoized to prevent recreation on every render
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
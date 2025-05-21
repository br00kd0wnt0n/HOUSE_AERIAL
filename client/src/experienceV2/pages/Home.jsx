import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperience } from '../context/ExperienceContext';
import LoadingScreen from '../components/LoadingScreen/LoadingScreen';
import logger from '../utils/logger';

/**
 * Home.jsx - Main entry point for the v2 experience
 * Displays the location selection menu with real data from API
 */
const Home = () => {
  // Module name for logging
  const MODULE = 'Home';
  
  const navigate = useNavigate();
  const {
    loadLocations,
    serviceWorkerReady,
    isLoading: globalLoading,
    setIsLoading,
    locations,
    preloadAllLocationsVideos,
    loadingProgress: globalProgress
  } = useExperience();
  
  const [error, setError] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState('initial'); // 'initial', 'locations', 'videos', 'complete'

  // Handle location loading process
  const handleLocationLoad = useCallback(async () => {
    try {
      setError(null);
      setLoadingPhase('locations');
      setIsLoading(true);
      
      // Load all locations from the API
      const locationData = await loadLocations();
      
      if (!locationData || locationData.length === 0) {
        setError('No locations found. Please check the server configuration.');
        setLoadingPhase('complete');
        setIsLoading(false);
        return;
      }
      
      // If service worker is ready, preload videos but don't block on failure
      if (serviceWorkerReady) {
        setLoadingPhase('videos');
        try {
          // Add timeout of 5 minutes for the entire preloading operation
          const preloadTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Preloading videos timed out'));
            }, 300000); // 5 minutes timeout (increased from 45 seconds)
          });
          
          // Race between preloading and timeout
          await Promise.race([
            preloadAllLocationsVideos(),
            preloadTimeoutPromise
          ]);
        } catch (err) {
          logger.error(MODULE, 'Error preloading videos:', err);
          setError('Failed to preload some videos. The experience will continue with limited offline capability.');
          // Continue to loading complete - don't block on video preload failure
        }
      }
      
      // Always complete loading, even if preloading fails
      setLoadingPhase('complete');
      setIsLoading(false);
    } catch (err) {
      logger.error(MODULE, 'Error loading locations:', err);
      setError('Failed to load locations. Please try refreshing the page.');
      setLoadingPhase('complete');
      setIsLoading(false);
    }
  }, [loadLocations, preloadAllLocationsVideos, serviceWorkerReady, setIsLoading]);

  // Load locations on component mount
  useEffect(() => {
    handleLocationLoad();
  }, [handleLocationLoad]);

  // Handle location selection
  const handleLocationSelect = (locationId) => {
    navigate(`/experience/${locationId}`);
  };

  // Show loading screen during loading phases
  const isLoadingActive = loadingPhase === 'initial' || loadingPhase === 'locations' || loadingPhase === 'videos' || globalLoading;
  
  if (isLoadingActive) {
    // Determine loading text based on phase
    let loadingText = 'Preparing Experience';
    if (loadingPhase === 'locations') loadingText = 'Loading Locations';
    if (loadingPhase === 'videos') {
      // More informative loading text for video phase
      const percent = globalProgress.percent || 0;
      const loaded = globalProgress.loaded || 0;
      const total = globalProgress.total || 0;
      
      loadingText = `Preloading Videos for Offline Use (${loaded}/${total} videos)`;
      
      // Add note about caching process
      if (percent < 10) {
        loadingText += ' - Starting cache process...';
      } else if (percent < 100) {
        loadingText += ' - Caching in progress...';
      } else {
        loadingText += ' - Finalizing...';
      }
    }
    
    return (
      <LoadingScreen 
        progress={globalProgress.loaded}
        total={globalProgress.total}
        isComplete={false}
        text={loadingText}
      />
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-4">Netflix House</h1>
      <p className="text-xl mb-6">Aerial Experience</p>
      
      {/* Show error message if any */}
      {error && (
        <div className="bg-red-800 text-white p-4 rounded-md mb-6 max-w-md">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      <p className="text-base mb-8">Select a location to begin</p>
      
      {locations && locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map(location => (
            <div 
              key={location._id}
              className="w-80 h-48 bg-netflix-red/10 hover:bg-netflix-red/30 rounded-md overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 flex flex-col shadow-lg"
              onClick={() => handleLocationSelect(location._id)}
            >
              <div className="h-1/2 bg-netflix-red/20 flex items-center justify-center">
                {/* This could be an image in the future */}
                <span className="text-3xl">📍</span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <h3 className="text-xl font-semibold">{location.name}</h3>
                {location.description && (
                  <p className="text-sm text-gray-300 mt-1 line-clamp-2">{location.description}</p>
                )}
                <div className="mt-2">
                  <span className="text-xs bg-netflix-red/50 py-1 px-2 rounded-full">
                    {serviceWorkerReady ? 'Offline Ready' : 'Online Only'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No locations available. Please add locations in the admin panel.</p>
      )}
      
      {/* Service worker status indicator */}
      <div className="absolute bottom-4 left-4 flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${serviceWorkerReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <span className="text-xs text-gray-400">
          {serviceWorkerReady ? 'Offline Ready' : 'Online Only'}
        </span>
      </div>
    </div>
  );
};

export default Home; 
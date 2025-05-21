import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperience } from '../context/ExperienceContext';
import LoadingScreen from '../components/LoadingScreen/LoadingScreen';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';

/**
 * Home.jsx - Main entry point for the v2 experience
 * Displays the location selection menu with real data from API
 * Styled to match the v0 main menu look while maintaining v2 functionality
 */
const Home = () => {
  // Module name for logging
  const MODULE = 'Home';
  
  const navigate = useNavigate();
  const {
    loadLocations,
    serviceWorkerReady,
    isLoading: globalLoading,
    setIsLoading: setGlobalLoading,
    locations,
    preloadAllLocationsVideos,
    loadingProgress: globalProgress
  } = useExperience();
  
  const [error, setError] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState('initial'); // 'initial', 'locations', 'videos', 'complete'
  const [buttonAssets, setButtonAssets] = useState({});
  const [hoveredButton, setHoveredButton] = useState(null);

  // Handle location loading process
  const handleLocationLoad = useCallback(async () => {
    try {
      setError(null);
      setLoadingPhase('locations');
      setGlobalLoading(true);
      
      // Load all locations from the API
      const locationData = await loadLocations();
      
      if (!locationData || locationData.length === 0) {
        setError('No locations found. Please check the server configuration.');
        setLoadingPhase('complete');
        setGlobalLoading(false);
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
      setGlobalLoading(false);
    } catch (err) {
      logger.error(MODULE, 'Error loading locations:', err);
      setError('Failed to load locations. Please try refreshing the page.');
      setLoadingPhase('complete');
      setGlobalLoading(false);
    }
  }, [loadLocations, preloadAllLocationsVideos, serviceWorkerReady, setGlobalLoading]);

  // Load locations on component mount
  useEffect(() => {
    handleLocationLoad();
  }, [handleLocationLoad]);
  
  // Fetch button assets from API (similar to v0 menu)
  useEffect(() => {
    const fetchButtonAssets = async () => {
      try {
        // Use dataLayer to get button assets
        const buttonAssets = await dataLayer.getAssetsByType('Button');
        
        if (buttonAssets && Array.isArray(buttonAssets)) {
          // Organize buttons by location and state (ON/OFF)
          const buttons = {};
          
          buttonAssets.forEach(asset => {
            if (!asset.location || !asset.location.name) return;
            
            const locationName = asset.location.name;
            const locationId = asset.location._id;
            
            if (!buttons[locationId]) {
              buttons[locationId] = {
                name: locationName,
                normal: null, // OFF button
                hover: null   // ON button
              };
            }
            
            // Determine button state from name
            if (asset.name.endsWith('_Button_ON')) {
              buttons[locationId].hover = asset.accessUrl;
            } else if (asset.name.endsWith('_Button_OFF')) {
              buttons[locationId].normal = asset.accessUrl;
            }
          });
          
          setButtonAssets(buttons);
          logger.info(MODULE, 'Fetched button assets');
        }
      } catch (err) {
        logger.error(MODULE, 'Error fetching button assets:', err);
        setError('Failed to load button assets.');
      }
    };
    
    fetchButtonAssets();
  }, []);

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
    <div className="flex flex-col justify-between items-center h-screen w-screen bg-black text-white overflow-hidden relative">
      {/* Menu Header - similar to v0 */}
      <div className="pt-[5vh] flex flex-col items-center z-10 w-full text-center">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png" 
          alt="Netflix" 
          className="w-[180px] h-auto mb-2.5"
        />
        <h1 className="text-5xl font-bold my-5 drop-shadow-lg">Welcome to Netflix House</h1>
      </div>
      
      {/* Menu Content - similar to v0 */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full text-center">
        <h2 className="text-4xl mb-10 drop-shadow-lg">Select a Location</h2>
        
        {/* Show error message if any */}
        {error && (
          <div className="bg-red-800 text-white p-4 rounded-md mb-6 max-w-md">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        <div className="flex justify-center flex-wrap gap-[60px] m-0 p-0">
          {locations && locations.length > 0 ? (
            locations.map(location => (
              <button
                key={location._id}
                className="w-[200px] h-[120px] bg-transparent border-none p-0 cursor-pointer transition-transform duration-300 block overflow-hidden rounded-none hover:scale-105 focus:outline-none"
                onClick={() => handleLocationSelect(location._id)}
                onMouseEnter={() => setHoveredButton(location._id)}
                onMouseLeave={() => setHoveredButton(null)}
              >
                {buttonAssets[location._id] && (
                  buttonAssets[location._id].normal || buttonAssets[location._id].hover
                ) ? (
                  <img 
                    src={
                      hoveredButton === location._id && buttonAssets[location._id].hover
                        ? buttonAssets[location._id].hover 
                        : buttonAssets[location._id].normal
                          ? buttonAssets[location._id].normal
                          : buttonAssets[location._id].hover
                    } 
                    alt={location.name} 
                    className="block w-full h-full object-contain" 
                  />
                ) : (
                  <div className="text-2xl font-bold text-white drop-shadow-lg p-[15px_25px] bg-[rgba(229,9,20,0.8)] rounded">
                    {location.name}
                  </div>
                )}
              </button>
            ))
          ) : (
            <p>No locations available. Please add locations in the admin panel.</p>
          )}
        </div>
      </div>
      
      {/* Menu Footer - similar to v0 */}
      <div className="pb-[2vh] z-10 w-full text-center">
        <p className="text-xl opacity-80 m-0">Experience the magic of Netflix in real life</p>
      </div>
      
      {/* Service worker status indicator - positioned discreetly */}
      {serviceWorkerReady !== undefined && (
        <div className="absolute bottom-2 left-2 flex items-center z-10 opacity-50">
          <div className={`w-2 h-2 rounded-full mr-1.5 ${serviceWorkerReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-xs text-gray-400">
            {serviceWorkerReady ? 'Offline Ready' : 'Online Only'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Home; 
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperience } from '../context/ExperienceContext';
import LoadingScreen from '../components/LoadingScreen/LoadingScreen';
import logger from '../utils/logger';
import dataLayer from '../utils/dataLayer';
import { baseBackendUrl } from '../../utils/api';

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
    loadingProgress: globalProgress,
    imageLoadingProgress,
    preloadHotspotImages,
    preloadAllLocationsVideos
  } = useExperience();
  
  const [error, setError] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState('initial'); // 'initial', 'locations', 'images', 'videos', 'complete'
  const [buttonAssets, setButtonAssets] = useState({});
  const [bannerAssets, setBannerAssets] = useState({});
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
      
      // Phase 2: Preload hotspot images if service worker is ready
      if (serviceWorkerReady) {
        setLoadingPhase('images');
        try {
          logger.info(MODULE, 'Starting image preloading phase');
          
          // Preload hotspot images with service worker caching
          await preloadHotspotImages(locationData, { 
            useServiceWorker: true 
          });
          
          logger.info(MODULE, 'Image preloading phase complete');
        } catch (err) {
          logger.error(MODULE, 'Error preloading images:', err);
          setError('Failed to preload some images. The experience will continue with reduced performance.');
          // Continue to next phase - don't block on image preload failure
        }
        
        // Phase 3: Preload videos
        setLoadingPhase('videos');
        try {
          logger.info(MODULE, 'Starting video preloading phase');
          
          // Add timeout of 5 minutes for the entire video preloading operation
          const preloadTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Preloading videos timed out'));
            }, 300000); // 5 minutes timeout (increased from 45 seconds)
          });
          
          // Race between video preloading and timeout
          await Promise.race([
            preloadAllLocationsVideos(serviceWorkerReady, locationData),
            preloadTimeoutPromise
          ]);
          
          logger.info(MODULE, 'Video preloading phase complete');
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
  }, [loadLocations, preloadHotspotImages, preloadAllLocationsVideos, serviceWorkerReady, setGlobalLoading]);

  // Load locations on component mount
  useEffect(() => {
    handleLocationLoad();
  }, [handleLocationLoad]);
  
  // Fetch location banner assets from API
  useEffect(() => {
    const fetchBannerAssets = async () => {
      try {
        // Get all assets and filter locally to ensure we get the right ones
        const allAssets = await dataLayer.getAssets();
        
        if (allAssets && Array.isArray(allAssets)) {
          // Organize location banners by location ID
          const banners = {};
          
          // Filter and process LocationBanner assets
          allAssets
            .filter(asset => asset.type === 'LocationBanner' && asset.location)
            .forEach(asset => {
              const locationId = asset.location._id;
              if (!locationId) return;
              
              if (!banners[locationId]) {
                banners[locationId] = {
                  url: asset.accessUrl,
                  name: asset.location.name || 'Unknown Location'
                };
              }
            });
          
          setBannerAssets(banners);
          logger.info(MODULE, `Fetched ${Object.keys(banners).length} location banner assets`);
        }
      } catch (err) {
        logger.error(MODULE, 'Error fetching location banner assets:', err);
        setError('Failed to load location banner assets.');
      }
    };
    
    fetchBannerAssets();
    
    // Also fetch button assets as fallback
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
          logger.info(MODULE, 'Fetched button assets as fallback');
        }
      } catch (err) {
        logger.error(MODULE, 'Error fetching button assets:', err);
      }
    };
    
    fetchButtonAssets();
  }, []);

  // Handle location selection
  const handleLocationSelect = (locationId) => {
    navigate(`/experience/${locationId}`);
  };

  // Show loading screen during loading phases
  const isLoadingActive = loadingPhase === 'initial' || loadingPhase === 'locations' || loadingPhase === 'images' || loadingPhase === 'videos' || globalLoading;
  
  if (isLoadingActive) {
    // Determine loading text and progress based on phase
    let loadingText = 'Preparing Experience';
    let progress = 0;
    let total = 0;
    
    if (loadingPhase === 'locations') {
      loadingText = 'Loading Locations';
      progress = 0;
      total = 1;
    } else if (loadingPhase === 'images') {
      // Image preloading phase
      const imagePercent = imageLoadingProgress.percent || 0;
      const imageLoaded = imageLoadingProgress.loaded || 0;
      const imageTotal = imageLoadingProgress.total || 0;
      
      loadingText = `Preloading UI Images for Offline Use`;
      if (imageTotal > 0) {
        loadingText += `\nImages: ${imageLoaded}/${imageTotal} (${imagePercent}%)`;
      }
      
      // Add note about caching process
      if (imagePercent < 10) {
        loadingText += '\n- Starting image cache process...';
      } else if (imagePercent < 100) {
        loadingText += '\n- Caching images...';
      } else {
        loadingText += '\n- Images cached successfully';
      }
      
      progress = imageLoaded;
      total = imageTotal;
    } else if (loadingPhase === 'videos') {
      // Video preloading phase
      const videoPercent = globalProgress.percent || 0;
      const videoLoaded = globalProgress.loaded || 0;
      const videoTotal = globalProgress.total || 0;
      
      loadingText = `Preloading Videos for Offline Use`;
      if (videoTotal > 0) {
        loadingText += `\nVideos: ${videoLoaded}/${videoTotal} (${videoPercent}%)`;
      }
      
      // Add note about caching process
      if (videoPercent < 10) {
        loadingText += '\n- Starting video cache process...';
      } else if (videoPercent < 100) {
        loadingText += '\n- Caching videos...';
      } else {
        loadingText += '\n- Videos cached successfully';
      }
      
      progress = videoLoaded;
      total = videoTotal;
    }
    
    return (
      <LoadingScreen 
        progress={progress}
        total={total}
        isComplete={false}
        text={loadingText}
      />
    );
  }

  return (
    <div className="flex flex-col justify-between items-center h-screen w-screen bg-gray-200 text-netflix-black overflow-hidden relative">
      {/* Menu Content - centered vertically in the screen */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full text-center">
        <h2 className="text-4xl mb-10 text-netflix-black font-medium">Select a Location</h2>
        
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
                className="w-[220px] h-[140px] bg-transparent rounded-lg border-2 border-transparent hover:border-netflix-red focus:outline-none focus:border-netflix-red group p-0 cursor-pointer overflow-hidden"
                onClick={() => handleLocationSelect(location._id)}
                onMouseEnter={() => setHoveredButton(location._id)}
                onMouseLeave={() => setHoveredButton(null)}
              >
                {/* Use Location Banner if available */}
                {bannerAssets[location._id] ? (
                  <div className="w-full h-full relative overflow-hidden rounded-lg p-2">
                    <img 
                      src={`${baseBackendUrl}${bannerAssets[location._id].url}`}
                      alt={location.name} 
                      className="block w-full h-full object-contain transition-all duration-300 shadow-none" 
                    />
                  </div>
                ) : (
                  // Fallback to Button assets if available
                  buttonAssets[location._id] && (
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
                      className="block w-full h-full object-contain transition-all duration-300" 
                    />
                  ) : (
                    // Fallback to text if no assets available
                    <div className="text-2xl font-bold text-white p-[25px_35px] bg-[rgba(229,9,20,0.8)] rounded-lg transition-all duration-300 h-full flex items-center justify-center shadow-none">
                      {location.name}
                    </div>
                  )
                )}
              </button>
            ))
          ) : (
            <p>No locations available. Please add locations in the admin panel.</p>
          )}
        </div>
      </div>
      
      {/* Service worker status indicator - positioned discreetly */}
      {serviceWorkerReady !== undefined && (
        <div className="absolute bottom-2 left-2 flex items-center z-10 opacity-70">
          <div className={`w-2 h-2 rounded-full mr-1.5 ${serviceWorkerReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-xs text-gray-600">
            {serviceWorkerReady ? 'Offline Ready' : 'Online Only'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Home; 
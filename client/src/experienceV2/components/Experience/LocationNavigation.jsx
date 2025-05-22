import React, { useState, useEffect, useMemo } from 'react';
import LocationButton from './LocationButton';
import logger from '../../utils/logger';
import dataLayer from '../../utils/dataLayer';

/**
 * LocationNavigation.jsx - Container for location navigation buttons
 * Shows all available locations except the current one
 * Uses fixed positioning in the bottom right corner
 */
const LocationNavigation = ({ locations, currentLocationId, onClick, debugMode }) => {
  const MODULE = 'LocationNavigation';
  const [buttonAssets, setButtonAssets] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [prevLocationId, setPrevLocationId] = useState(null);
  const [buttonsReady, setButtonsReady] = useState(false);
  
  // Force re-render when currentLocationId changes by using it in a key
  // Log current location ID to help with debugging
  useEffect(() => {
    logger.info(MODULE, `Current location ID updated: ${currentLocationId}`);
    
    // If location has changed, reset button assets to force a refresh
    if (prevLocationId && prevLocationId !== currentLocationId) {
      logger.info(MODULE, `Location changed from ${prevLocationId} to ${currentLocationId}, refreshing navigation buttons`);
      setButtonAssets({});
      setLoadAttempts(0);
      setButtonsReady(false);
    }
    
    setPrevLocationId(currentLocationId);
  }, [currentLocationId, prevLocationId]);
  
  // Filter locations to exclude current location
  const availableLocations = useMemo(() => {
    if (!locations || locations.length === 0) {
      logger.debug(MODULE, `No locations available to filter`);
      return [];
    }
    
    if (!currentLocationId) {
      logger.debug(MODULE, `No current location ID provided`);
      return locations;
    }
    
    // Make sure we're comparing strings to strings
    const currentIdStr = String(currentLocationId);
    
    // Filter out the current location by comparing string IDs
    const filtered = locations.filter(loc => {
      if (!loc || !loc._id) return false;
      return String(loc._id) !== currentIdStr;
    });
    
    logger.debug(MODULE, `Filtered to ${filtered.length} available locations (excluding current: ${currentIdStr})`);
    
    return filtered;
  }, [locations, currentLocationId]);

  // Fetch button assets for available locations
  useEffect(() => {
    const loadButtonAssets = async () => {
      if (!availableLocations.length) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setButtonsReady(false);
      
      try {
        // Get button assets with type filter - force refresh when location changes
        const buttonAssets = await dataLayer.getAssetsByType('Button', null, prevLocationId !== currentLocationId);
        
        if (!buttonAssets || !Array.isArray(buttonAssets) || buttonAssets.length === 0) {
          logger.warn(MODULE, 'Failed to load button assets or none found');
          setIsLoading(false);
          
          // If this is our first few attempts, try again in a moment
          if (loadAttempts < 3) {
            setTimeout(() => {
              setLoadAttempts(prev => prev + 1);
            }, 1000);
          }
          return;
        }
        
        // Create a map of location IDs to their ON/OFF button assets
        const assetsMap = {};
        
        // Process available locations to find their button assets
        for (const location of availableLocations) {
          const locationId = String(location._id);
          
          // Find assets for this location
          const locationAssets = buttonAssets.filter(asset => {
            const assetLocId = asset.location?._id || asset.location;
            return assetLocId && String(assetLocId) === locationId;
          });
          
          if (!locationAssets.length) continue;
          
          // Try to find ON/OFF button pair
          let onButton = locationAssets.find(asset => 
            asset.name?.toLowerCase().includes('_on')
          ) || locationAssets.find(asset => 
            asset.name?.toLowerCase().includes('on') || 
            asset.name?.toLowerCase().endsWith('on')
          );
          
          let offButton = locationAssets.find(asset => 
            asset.name?.toLowerCase().includes('_off')
          ) || locationAssets.find(asset => 
            asset.name?.toLowerCase().includes('off') || 
            asset.name?.toLowerCase().endsWith('off')
          );
          
          // Use available assets even if we don't have a perfect match
          if (locationAssets.length >= 2) {
            // If we couldn't find clear ON/OFF assets, use the first two
            if (!onButton || !offButton) {
              onButton = locationAssets[0];
              offButton = locationAssets[1];
            }
            
            assetsMap[locationId] = { on: onButton, off: offButton };
          } else if (locationAssets.length === 1) {
            // Use the same asset for both states if only one is available
            assetsMap[locationId] = { 
              on: locationAssets[0], 
              off: locationAssets[0] 
            };
          }
        }
        
        setButtonAssets(assetsMap);
        setIsLoading(false);
        logger.info(MODULE, `Successfully loaded button assets for ${Object.keys(assetsMap).length} locations`);
        
        // Preload all button images before displaying them
        await preloadButtonImages(assetsMap);
      } catch (error) {
        logger.error(MODULE, 'Error loading button assets:', error);
        setIsLoading(false);
        
        // If this is our first few attempts, try again in a moment
        if (loadAttempts < 3) {
          setTimeout(() => {
            setLoadAttempts(prev => prev + 1);
          }, 1000);
        }
      }
    };
    
    loadButtonAssets();
  }, [availableLocations, loadAttempts, currentLocationId, prevLocationId]);

  // Preload all button images to prevent flickering
  const preloadButtonImages = async (assetsMap) => {
    try {
      const preloadPromises = [];
      
      // Create promises for all image preloads
      Object.entries(assetsMap).forEach(([locationId, assets]) => {
        if (assets.on?.accessUrl) {
          preloadPromises.push(preloadImage(assets.on.accessUrl));
        }
        if (assets.off?.accessUrl) {
          preloadPromises.push(preloadImage(assets.off.accessUrl));
        }
      });
      
      // Wait for all images to preload
      await Promise.all(preloadPromises);
      logger.info(MODULE, 'All button images preloaded successfully');
      
      // Delay showing buttons slightly to ensure smooth render
      setTimeout(() => {
        setButtonsReady(true);
      }, 100);
    } catch (error) {
      logger.warn(MODULE, 'Error preloading button images:', error);
      // Show buttons anyway after a delay
      setTimeout(() => {
        setButtonsReady(true);
      }, 500);
    }
  };
  
  // Helper to preload an individual image
  const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  // Retry loading if we have locations but no buttons
  useEffect(() => {
    if (availableLocations.length > 0 && 
        Object.keys(buttonAssets).length === 0 && 
        !isLoading && 
        loadAttempts < 3) {
      // Schedule another attempt
      const timer = setTimeout(() => {
        logger.info(MODULE, `Retrying button asset load (attempt ${loadAttempts + 1})`);
        setLoadAttempts(prev => prev + 1);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [availableLocations.length, buttonAssets, isLoading, loadAttempts]);

  // Don't render anything if no locations
  if (availableLocations.length === 0) {
    return null;
  }
  
  // Don't render anything until buttons are ready
  if (!buttonsReady) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-4 items-center">
      {/* Location buttons */}
      {availableLocations.map(location => {
        const assets = buttonAssets[location._id];
        
        // If no assets found, don't render anything for this location
        if (!assets) {
          return null;
        }
        
        // Render the location button with assets
        return (
          <LocationButton 
            key={`${location._id}-${currentLocationId}`}
            location={location}
            onButtonAssets={assets.on}
            offButtonAssets={assets.off}
            onClick={onClick}
            debugMode={debugMode}
          />
        );
      })}
    </div>
  );
};

export default LocationNavigation; 
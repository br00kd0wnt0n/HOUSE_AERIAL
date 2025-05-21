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
  const [allLocations, setAllLocations] = useState([]);
  
  // Log when currentLocationId changes for debugging
  useEffect(() => {
    logger.info(MODULE, `Received currentLocationId prop: ${currentLocationId}`);
  }, [currentLocationId]);

  // Load all locations directly to ensure we have data
  useEffect(() => {
    logger.info(MODULE, `Loading all locations directly`);
    
    dataLayer.getLocations(true).then(fetchedLocations => {
      if (fetchedLocations && Array.isArray(fetchedLocations) && fetchedLocations.length > 0) {
        logger.info(MODULE, `Loaded ${fetchedLocations.length} locations directly: ${fetchedLocations.map(loc => loc.name).join(', ')}`);
        setAllLocations(fetchedLocations);
      } else {
        logger.warn(MODULE, `Failed to load locations directly`);
      }
    }).catch(err => {
      logger.error(MODULE, `Error loading locations directly: ${err.message}`);
    });
  }, [currentLocationId]); // Re-fetch when current location changes

  // Filter locations to exclude current location
  const availableLocations = useMemo(() => {
    // Use our directly loaded locations
    const locationsToFilter = allLocations;
    
    if (!locationsToFilter || locationsToFilter.length === 0) {
      logger.warn(MODULE, `No locations available to filter`);
      return [];
    }
    
    if (!currentLocationId) {
      logger.warn(MODULE, `No current location ID provided`);
      return locationsToFilter;
    }
    
    // Make sure we're comparing strings to strings
    const currentIdStr = String(currentLocationId);
    
    // Log all locations for debugging
    logger.info(MODULE, `Filtering locations with currentLocationId=${currentIdStr}`);
    locationsToFilter.forEach(loc => {
      logger.info(MODULE, `Available location: ${loc.name} (${loc._id})`);
    });
    
    // Filter out the current location by comparing string IDs
    const filtered = locationsToFilter.filter(loc => {
      if (!loc || !loc._id) {
        return false;
      }
      const locIdStr = String(loc._id);
      const isMatch = locIdStr !== currentIdStr;
      logger.debug(MODULE, `Location ${loc.name} (${locIdStr}) matches current? ${!isMatch}`);
      return isMatch;
    });
    
    logger.info(MODULE, `Filtered locations: ${filtered.length} available after removing current location`);
    
    return filtered;
  }, [allLocations, currentLocationId]);

  // Fetch button assets for all locations
  useEffect(() => {
    const loadButtonAssets = async () => {
      if (!availableLocations.length) {
        logger.warn(MODULE, 'No available locations to load assets for');
        return;
      }

      try {
        logger.info(MODULE, `Loading button assets for ${availableLocations.length} locations`);
        
        // Get button assets directly with type filter
        const buttonAssets = await dataLayer.getAssetsByType('Button');
        
        if (!buttonAssets || !Array.isArray(buttonAssets)) {
          logger.error(MODULE, 'Failed to load button assets');
          return;
        }
        
        logger.info(MODULE, `Found ${buttonAssets.length} button assets`);
        
        // Log all button assets
        buttonAssets.forEach(asset => {
          logger.info(MODULE, `Button asset: ${asset.name}, Location: ${asset.location?._id || asset.location || 'none'}`);
        });
        
        // Create a map of location IDs to their ON/OFF button assets
        const assetsMap = {};
        
        // Process all locations to find their button assets
        for (const location of availableLocations) {
          const locationId = String(location._id);
          logger.info(MODULE, `Finding assets for location: ${location.name} (${locationId})`);
          
          // Find assets for this location
          const locationAssets = buttonAssets.filter(asset => {
            const assetLocId = asset.location?._id || asset.location;
            return assetLocId && String(assetLocId) === locationId;
          });
          
          logger.info(MODULE, `Found ${locationAssets.length} assets for ${location.name}`);
          
          if (locationAssets.length >= 2) {
            // Find ON button for this location
            let onButton = locationAssets.find(asset => 
              asset.name && asset.name.toLowerCase().includes('_on')
            );
            
            // Find OFF button for this location
            let offButton = locationAssets.find(asset => 
              asset.name && asset.name.toLowerCase().includes('_off')
            );
            
            // If not found, try more general patterns
            if (!onButton) {
              onButton = locationAssets.find(asset => 
                asset.name && 
                (asset.name.toLowerCase().includes('on') || 
                 asset.name.toLowerCase().endsWith('on'))
              );
            }
            
            if (!offButton) {
              offButton = locationAssets.find(asset => 
                asset.name && 
                (asset.name.toLowerCase().includes('off') || 
                 asset.name.toLowerCase().endsWith('off'))
              );
            }
            
            // If we still don't have a pair, just take the first two assets
            if (!onButton || !offButton) {
              logger.warn(MODULE, `Could not find clear ON/OFF pair for ${location.name}, using first two assets`);
              onButton = locationAssets[0];
              offButton = locationAssets[1];
            }
            
            logger.info(MODULE, `Using buttons for ${location.name}: ON=${onButton.name}, OFF=${offButton.name}`);
            
            assetsMap[locationId] = {
              on: onButton,
              off: offButton
            };
          } else {
            logger.warn(MODULE, `Not enough assets for location: ${location.name}, found: ${locationAssets.length}`);
            
            // Even if we only have one asset, use it for both states
            if (locationAssets.length === 1) {
              logger.info(MODULE, `Using single asset for both states: ${locationAssets[0].name}`);
              assetsMap[locationId] = {
                on: locationAssets[0],
                off: locationAssets[0]
              };
            }
          }
        }
        
        logger.info(MODULE, `Final button assets count: ${Object.keys(assetsMap).length}`);
        setButtonAssets(assetsMap);
      } catch (error) {
        logger.error(MODULE, 'Error loading button assets:', error);
      }
    };
    
    loadButtonAssets();
  }, [availableLocations]);

  // Don't render anything if no locations
  if (availableLocations.length === 0) {
    return null;
  }

  // Log what we're rendering (but only once per unique set of locations)
  logger.info(MODULE, `Rendering navigation with ${availableLocations.length} locations and ${Object.keys(buttonAssets).length} asset pairs`);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-4 items-center">
      {/* Location buttons */}
      {availableLocations.map(location => {
        const assets = buttonAssets[location._id];
        
        // If no assets found, render a fallback button
        if (!assets) {
          logger.info(MODULE, `Using fallback button for location: ${location.name}`);
          return (
            <div 
              key={`${location._id}-${currentLocationId}`}
              className="w-[140px] h-[140px] bg-netflix-red rounded-full flex items-center justify-center cursor-pointer hover:bg-netflix-red/80 transition-all"
              onClick={() => onClick(location)}
            >
              <span className="text-white text-xl font-bold">{location.name.substring(0, 2)}</span>
            </div>
          );
        }
        
        // Render the location button with assets
        logger.info(MODULE, `Rendering button for ${location.name} with assets: ${assets.on.name} / ${assets.off.name}`);
        return (
          <LocationButton 
            key={`${location._id}-${currentLocationId}`}
            location={location}
            onButtonAssets={assets.on}
            offButtonAssets={assets.off}
            onClick={onClick}
            debugMode={false} // Ensure debug mode is off
          />
        );
      })}
    </div>
  );
};

export default LocationNavigation; 
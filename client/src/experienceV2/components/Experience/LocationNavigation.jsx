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
    
    logger.debug(MODULE, `Filtered to ${filtered.length} available locations (excluding current)`);
    
    return filtered;
  }, [locations, currentLocationId]);

  // Fetch button assets for available locations
  useEffect(() => {
    const loadButtonAssets = async () => {
      if (!availableLocations.length) return;

      try {
        // Get button assets with type filter
        const buttonAssets = await dataLayer.getAssetsByType('Button');
        
        if (!buttonAssets || !Array.isArray(buttonAssets)) {
          logger.warn(MODULE, 'Failed to load button assets');
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

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-4 items-center">
      {/* Location buttons */}
      {availableLocations.map(location => {
        const assets = buttonAssets[location._id];
        
        // If no assets found, render a fallback button
        if (!assets) {
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
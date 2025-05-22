import React, { useEffect, useState } from 'react';
import { baseBackendUrl } from '../../../utils/api';
import dataLayer from '../../utils/dataLayer';
import logger from '../../utils/logger';

// Module name for logging
const MODULE = 'LocationBanner';

/**
 * LocationBanner component
 * Displays the location banner image in the bottom left corner of the experience
 */
const LocationBanner = ({ locationId }) => {
  const [bannerAsset, setBannerAsset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the location banner asset when the locationId changes
  useEffect(() => {
    const loadBannerAsset = async () => {
      if (!locationId) {
        logger.warn(MODULE, 'No locationId provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        logger.info(MODULE, `Loading banner for location: ${locationId}`);
        
        // Get all assets for this location and filter by type locally
        // This is safer than relying on the API filtering since it might have issues
        const allAssets = await dataLayer.getAssets();
        
        logger.info(MODULE, `Retrieved ${allAssets?.length || 0} total assets`);
        
        // Ensure we have valid assets and filter to just location banners for this location
        if (!allAssets || !Array.isArray(allAssets) || allAssets.length === 0) {
          logger.info(MODULE, 'No assets found in the system');
          setIsLoading(false);
          return;
        }
        
        // Filter for location banner assets for this specific location
        const locationBanners = allAssets.filter(asset => 
          asset.type === 'LocationBanner' && 
          asset.location && 
          asset.location._id === locationId
        );
        
        logger.info(MODULE, `Found ${locationBanners.length} LocationBanner assets for location ${locationId}`);
        
        if (locationBanners.length === 0) {
          logger.info(MODULE, `No LocationBanner assets found for location: ${locationId}`);
          setIsLoading(false);
          return;
        }
        
        // Use the first banner asset found
        const bannerAsset = locationBanners[0];
        logger.info(MODULE, `Using LocationBanner asset: ${bannerAsset.name} for location: ${locationId}`);
        
        setBannerAsset(bannerAsset);
        setIsLoading(false);
      } catch (err) {
        logger.error(MODULE, `Error loading LocationBanner for location: ${locationId}`, err);
        setError(err);
        setIsLoading(false);
      }
    };

    loadBannerAsset();
  }, [locationId]);

  // Don't render anything if there's no banner asset or still loading
  if (isLoading || !bannerAsset) {
    return null;
  }

  // Construct the image URL
  const imageUrl = `${baseBackendUrl}${bannerAsset.accessUrl}`;
  logger.info(MODULE, `Rendering banner with URL: ${imageUrl}`);

  return (
    <div className="absolute bottom-12 left-10 z-30 max-w-[200px] max-h-[120px]">
      <img 
        src={imageUrl} 
        alt="Location Banner"
        className="w-auto h-auto max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export default LocationBanner; 
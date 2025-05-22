/**
 * imageCollector.js - Utility for collecting and organizing hotspot images
 * Collects secondary hotspot UI element images from location data
 */

import dataLayer from '../dataLayer';
import logger from '../logger';

const MODULE = 'ImageCollector';

/**
 * Collect hotspot images from all locations
 * @param {Array} locations - Array of location objects
 * @returns {Promise<Object>} Promise resolving to organized location images map
 */
export const collectHotspotImages = async (locations) => {
  if (!locations || !Array.isArray(locations) || locations.length === 0) {
    logger.warn(MODULE, 'No locations provided for hotspot image collection');
    return {};
  }

  try {
    logger.info(MODULE, `Collecting hotspot images from ${locations.length} locations`);
    
    const locationImagesMap = {};
    
    // Process each location to collect its hotspots
    for (const location of locations) {
      try {
        // Fetch hotspots for this location
        const hotspots = await dataLayer.getHotspotsByLocation(location._id) || [];
        
        // Process hotspots and extract images
        const locationImages = [];
        
        hotspots.forEach(hotspot => {
          // Check if hotspot has a UI element with an image
          if (hotspot.uiElement && hotspot.uiElement.accessUrl) {
            const imageData = {
              id: `${hotspot._id}_uiElement`,
              url: hotspot.uiElement.accessUrl,
              hotspotId: hotspot._id,
              hotspotName: hotspot.name,
              locationId: location._id,
              lastModified: hotspot.uiElement.lastModified || Date.now()
            };
            
            locationImages.push(imageData);
          }
        });
        
        if (locationImages.length > 0) {
          locationImagesMap[location._id] = locationImages;
          logger.debug(MODULE, `Found ${locationImages.length} hotspot images for location ${location.name}`);
        }
      } catch (error) {
        logger.error(MODULE, `Error fetching hotspots for location ${location._id}:`, error);
      }
    }
    
    const totalImages = Object.values(locationImagesMap)
      .reduce((total, images) => total + images.length, 0);
    
    logger.info(MODULE, `Collected ${totalImages} hotspot images from ${Object.keys(locationImagesMap).length} locations`);
    
    return locationImagesMap;
  } catch (error) {
    logger.error(MODULE, 'Error collecting hotspot images:', error);
    return {};
  }
};

/**
 * Get UI element images for a specific location
 * @param {string} locationId - Location ID
 * @returns {Promise<Array>} Promise resolving to array of image objects
 */
export const getLocationUIImages = async (locationId) => {
  if (!locationId) {
    logger.warn(MODULE, 'No location ID provided');
    return [];
  }

  try {
    // Fetch hotspots for this location
    const hotspots = await dataLayer.getHotspotsByLocation(locationId) || [];
    
    // Extract UI element images
    const images = hotspots
      .filter(hotspot => hotspot.uiElement && hotspot.uiElement.accessUrl)
      .map(hotspot => ({
        id: `${hotspot._id}_uiElement`,
        url: hotspot.uiElement.accessUrl,
        hotspotId: hotspot._id,
        hotspotName: hotspot.name,
        locationId: locationId,
        lastModified: hotspot.uiElement.lastModified || Date.now()
      }));
    
    logger.debug(MODULE, `Found ${images.length} UI element images for location ${locationId}`);
    
    return images;
  } catch (error) {
    logger.error(MODULE, `Error fetching UI images for location ${locationId}:`, error);
    return [];
  }
};

/**
 * Get all unique image URLs from locations
 * @param {Array} locations - Array of location objects
 * @returns {Promise<Array>} Promise resolving to array of unique image URLs
 */
export const getAllImageUrls = async (locations) => {
  const locationImagesMap = await collectHotspotImages(locations);
  
  const allUrls = Object.values(locationImagesMap)
    .flat()
    .map(image => image.url);
  
  // Remove duplicates
  const uniqueUrls = [...new Set(allUrls)];
  
  logger.debug(MODULE, `Found ${uniqueUrls.length} unique image URLs`);
  
  return uniqueUrls;
};

/**
 * Validate image accessibility
 * @param {Array} imageObjects - Array of image objects to validate
 * @returns {Promise<Object>} Promise resolving to validation results
 */
export const validateImageAccess = async (imageObjects) => {
  if (!imageObjects || imageObjects.length === 0) {
    return { accessible: [], inaccessible: [] };
  }

  const accessible = [];
  const inaccessible = [];

  // Test each image URL
  await Promise.all(
    imageObjects.map(async (imageObj) => {
      try {
        const response = await fetch(imageObj.url, { method: 'HEAD' });
        if (response.ok) {
          accessible.push(imageObj);
        } else {
          inaccessible.push({
            ...imageObj,
            error: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error) {
        inaccessible.push({
          ...imageObj,
          error: error.message
        });
      }
    })
  );

  logger.info(MODULE, `Image validation complete: ${accessible.length} accessible, ${inaccessible.length} inaccessible`);

  return { accessible, inaccessible };
};

const imageCollectorUtils = {
  collectHotspotImages,
  getLocationUIImages, 
  getAllImageUrls,
  validateImageAccess
};

export default imageCollectorUtils; 
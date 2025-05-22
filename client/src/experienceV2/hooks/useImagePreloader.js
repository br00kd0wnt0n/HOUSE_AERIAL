/**
 * useImagePreloader.js - React hook for managing image preloading
 * Updated to use ImagePreloaderV2 with strategy pattern for better caching
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import ImagePreloaderV2 from '../utils/imageLoading/ImagePreloaderV2';
import logger from '../utils/logger';

const MODULE = 'useImagePreloader';

export const useImagePreloader = () => {
  // Image preloader state
  const [imageLoadingProgress, setImageLoadingProgress] = useState({ loaded: 0, total: 0, percent: 0 });
  const [isImageLoading, setIsImageLoading] = useState(false);
  const imagePreloaderRef = useRef(null);

  // Initialize image preloader
  useEffect(() => {
    // Create the image preloader with a progress callback
    const imagePreloader = new ImagePreloaderV2((loaded, total, details) => {
      // Update loading progress state
      const progressData = {
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
        ...details
      };
      
      setImageLoadingProgress(progressData);
      
      // Mark as complete when loading is finished
      if (details?.status === 'complete' || details?.status === 'complete-with-errors') {
        logger.debug(MODULE, `Image preloading complete. Status: ${details?.status}`);
        setIsImageLoading(false);
      }
    });
    
    // Store the reference
    imagePreloaderRef.current = imagePreloader;
    
    logger.debug(MODULE, 'Image preloader V2 initialized');
    
    // Clean up on unmount
    return () => {
      if (imagePreloaderRef.current) {
        imagePreloaderRef.current.dispose();
        logger.debug(MODULE, 'Image preloader V2 disposed');
      }
    };
  }, []);

  /**
   * Process a hotspot and extract its image
   * @param {Object} hotspot - Hotspot object containing UI element
   * @param {string} locationId - ID of the location this hotspot belongs to
   * @returns {Object|null} Image object or null if no image
   */
  const processHotspotImage = useCallback((hotspot, locationId) => {
    if (!hotspot || !hotspot.uiElement || !hotspot.uiElement.accessUrl) {
      return null;
    }

    return {
      id: `${hotspot._id}_uiElement`,
      url: hotspot.uiElement.accessUrl,
      hotspotId: hotspot._id,
      hotspotName: hotspot.name,
      locationId: locationId,
      lastModified: hotspot.uiElement.lastModified || Date.now()
    };
  }, []);

  /**
   * Collect hotspot images from all locations
   * @param {Array} locations - Array of location objects
   * @returns {Promise<Object>} Promise resolving to organized location images
   */
  const collectHotspotImages = useCallback(async (locations) => {
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      logger.warn(MODULE, 'No locations provided for hotspot image collection');
      return {};
    }

    try {
      logger.info(MODULE, `Collecting hotspot images from ${locations.length} locations`);
      
      // Import dataLayer here to avoid circular dependency issues
      const { default: dataLayer } = await import('../utils/dataLayer');
      
      const locationImagesMap = {};
      
      // Process each location to collect its hotspots
      for (const location of locations) {
        try {
          // Fetch hotspots for this location
          const hotspots = await dataLayer.getHotspotsByLocation(location._id) || [];
          
          // Process hotspots and extract images
          const locationImages = [];
          
          hotspots.forEach(hotspot => {
            const imageData = processHotspotImage(hotspot, location._id);
            if (imageData) {
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
  }, [processHotspotImage]);

  /**
   * Preload all hotspot images for the given locations
   * @param {Array} locations - Array of location objects
   * @param {Object} options - Preloading options
   * @returns {Promise<Object>} Promise resolving to preloading results
   */
  const preloadHotspotImages = useCallback(async (locations, options = {}) => {
    if (!imagePreloaderRef.current) {
      logger.error(MODULE, 'Image preloader not initialized');
      return { loaded: 0, total: 0, errors: [] };
    }

    try {
      setIsImageLoading(true);
      
      // Collect images organized by location
      const locationImagesMap = await collectHotspotImages(locations);
      
      if (Object.keys(locationImagesMap).length === 0) {
        logger.info(MODULE, 'No hotspot images found to preload');
        setIsImageLoading(false);
        return { loaded: 0, total: 0, errors: [] };
      }
      
      // Initialize the preloader with collected images
      imagePreloaderRef.current.initialize({ 
        locations: locationImagesMap,
        resetExisting: true 
      });
      
      // Start preloading with service worker strategy (fallback to browser)
      const useServiceWorker = options.useServiceWorker !== false; // Default to true
      await imagePreloaderRef.current.preloadAll({ 
        useServiceWorker 
      });
      
      // Get final statistics
      const stats = {
        loaded: imagePreloaderRef.current.loaded,
        total: imagePreloaderRef.current.total,
        errors: imagePreloaderRef.current.errors
      };
      
      logger.info(MODULE, `Image preloading completed: ${stats.loaded}/${stats.total} images loaded`);
      
      return stats;
    } catch (error) {
      logger.error(MODULE, 'Error during image preloading:', error);
      setIsImageLoading(false);
      return { loaded: 0, total: 0, errors: [error.message] };
    }
  }, [collectHotspotImages]);

  /**
   * Check if a specific hotspot image is loaded
   * @param {string} hotspotId - ID of the hotspot
   * @returns {boolean} True if the hotspot's image is loaded
   */
  const isHotspotImageLoaded = useCallback((hotspotId) => {
    if (!imagePreloaderRef.current) {
      return false;
    }
    
    const imageId = `${hotspotId}_uiElement`;
    const image = imagePreloaderRef.current.getImage(imageId);
    return image ? image.loaded : false;
  }, []);

  /**
   * Get preloaded image data for a hotspot
   * @param {string} hotspotId - ID of the hotspot
   * @returns {Object|null} Image data object or null if not found
   */
  const getHotspotImage = useCallback((hotspotId) => {
    if (!imagePreloaderRef.current) {
      return null;
    }
    
    const imageId = `${hotspotId}_uiElement`;
    return imagePreloaderRef.current.getImage(imageId);
  }, []);

  /**
   * Get all preloaded images for a specific location
   * @param {string} locationId - ID of the location
   * @returns {Array} Array of image data objects
   */
  const getLocationImages = useCallback((locationId) => {
    if (!imagePreloaderRef.current) {
      return [];
    }
    
    return imagePreloaderRef.current.getLocationImages(locationId);
  }, []);

  /**
   * Get current image loading statistics
   * @returns {Object} Loading statistics
   */
  const getImageStats = useCallback(() => {
    if (!imagePreloaderRef.current) {
      return { total: 0, loaded: 0, errors: 0, status: 'idle', percent: 0 };
    }
    
    return {
      total: imagePreloaderRef.current.total,
      loaded: imagePreloaderRef.current.loaded,
      errors: imagePreloaderRef.current.errors.length,
      status: imagePreloaderRef.current.status,
      percent: imagePreloaderRef.current.total > 0 ? 
        Math.round((imagePreloaderRef.current.loaded / imagePreloaderRef.current.total) * 100) : 0
    };
  }, []);

  /**
   * Reset the image preloader
   */
  const resetImagePreloader = useCallback(() => {
    if (imagePreloaderRef.current) {
      imagePreloaderRef.current.releaseAll();
      setImageLoadingProgress({ loaded: 0, total: 0, percent: 0 });
      setIsImageLoading(false);
    }
  }, []);

  return {
    // State
    imageLoadingProgress,
    isImageLoading,
    
    // Preloader reference
    imagePreloaderRef,
    
    // Methods
    preloadHotspotImages,
    collectHotspotImages,
    isHotspotImageLoaded,
    getHotspotImage,
    getLocationImages,
    getImageStats,
    resetImagePreloader
  };
};

export default useImagePreloader; 
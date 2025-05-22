/**
 * ImagePreloader.js - Preloads and caches hotspot images for better UX
 * Works alongside VideoPreloaderV2 to preload secondary hotspot images
 */

import logger from '../utils/logger';

const MODULE = 'ImagePreloader';

class ImagePreloader {
  constructor(onProgress = () => {}) {
    this.images = {};
    this.loaded = 0;
    this.total = 0;
    this.onProgress = onProgress;
    this.status = 'idle'; // idle, loading, complete, error
    this.errors = [];
    
    // Track image loading promises
    this.loadingPromises = new Map();
  }

  /**
   * Initialize the preloader with images from all locations
   * @param {Object} options - Initialization options
   * @param {Array} options.locations - Array of location objects with hotspots
   * @param {boolean} options.resetExisting - Whether to reset existing state
   * @returns {ImagePreloader} This instance for chaining
   */
  initialize({ locations = [], resetExisting = true } = {}) {
    if (resetExisting) {
      this.reset();
    }

    this.status = 'initialized';
    
    // Extract images from all location hotspots
    locations.forEach(location => {
      if (location.hotspots && Array.isArray(location.hotspots)) {
        location.hotspots.forEach(hotspot => {
          this.registerHotspotImages(hotspot, location._id);
        });
      }
    });

    this.total = Object.keys(this.images).length;
    
    logger.info(MODULE, `ImagePreloader initialized with ${this.total} images`);
    
    // Initial progress callback
    this.onProgress(this.loaded, this.total, {
      status: 'initialized',
      percent: 0
    });

    return this;
  }

  /**
   * Register images from a hotspot
   * @param {Object} hotspot - Hotspot object containing image data
   * @param {string} locationId - ID of the location this hotspot belongs to
   */
  registerHotspotImages(hotspot, locationId) {
    if (!hotspot || !hotspot.uiElement || !hotspot.uiElement.accessUrl) {
      return;
    }

    const imageUrl = hotspot.uiElement.accessUrl;
    const imageId = `${hotspot._id}_uiElement`;

    // Skip if already registered
    if (this.images[imageId]) {
      return;
    }

    this.images[imageId] = {
      id: imageId,
      url: imageUrl,
      hotspotId: hotspot._id,
      hotspotName: hotspot.name,
      locationId: locationId,
      loaded: false,
      error: null,
      element: null
    };
  }

  /**
   * Preload all registered images
   * @returns {Promise<Object>} Promise resolving to loading results
   */
  async preloadAll() {
    if (this.total === 0) {
      logger.info(MODULE, 'No images to preload');
      this.status = 'complete';
      return { loaded: 0, total: 0, errors: [] };
    }

    this.status = 'loading';
    this.loaded = 0;
    this.errors = [];

    logger.info(MODULE, `Starting to preload ${this.total} images`);

    // Create loading promises for all images
    const loadingPromises = Object.values(this.images).map(image => 
      this.preloadSingleImage(image)
    );

    try {
      // Wait for all images to complete (success or failure)
      await Promise.allSettled(loadingPromises);
      
      this.status = this.errors.length > 0 ? 'complete-with-errors' : 'complete';
      
      logger.info(MODULE, `Image preloading complete: ${this.loaded}/${this.total} successful`);
      
      if (this.errors.length > 0) {
        logger.warn(MODULE, `${this.errors.length} images failed to load`);
      }

      // Final progress callback
      this.onProgress(this.loaded, this.total, {
        status: this.status,
        percent: 100,
        errors: this.errors
      });

      return {
        loaded: this.loaded,
        total: this.total,
        errors: this.errors
      };
    } catch (error) {
      logger.error(MODULE, 'Error during image preloading:', error);
      this.status = 'error';
      return {
        loaded: this.loaded,
        total: this.total,
        errors: [...this.errors, error.message]
      };
    }
  }

  /**
   * Preload a single image
   * @param {Object} imageData - Image data object
   * @returns {Promise<Object>} Promise resolving to the image data
   */
  async preloadSingleImage(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        imageData.loaded = true;
        imageData.element = img;
        this.loaded++;
        
        logger.debug(MODULE, `Image loaded: ${imageData.id}`);
        
        // Progress callback
        this.onProgress(this.loaded, this.total, {
          imageId: imageData.id,
          status: 'loaded',
          percent: Math.round((this.loaded / this.total) * 100)
        });
        
        resolve(imageData);
      };

      img.onerror = (error) => {
        imageData.error = 'Failed to load image';
        this.loaded++; // Count as processed
        this.errors.push(`${imageData.id}: Failed to load`);
        
        logger.error(MODULE, `Image load failed: ${imageData.id}`, error);
        
        // Progress callback
        this.onProgress(this.loaded, this.total, {
          imageId: imageData.id,
          status: 'error',
          error: imageData.error,
          percent: Math.round((this.loaded / this.total) * 100)
        });
        
        // Resolve anyway to continue with other images
        resolve(imageData);
      };

      // Add loading timeout
      setTimeout(() => {
        if (!imageData.loaded && !imageData.error) {
          imageData.error = 'Image load timeout';
          this.loaded++;
          this.errors.push(`${imageData.id}: Load timeout`);
          
          logger.warn(MODULE, `Image load timeout: ${imageData.id}`);
          
          this.onProgress(this.loaded, this.total, {
            imageId: imageData.id,
            status: 'timeout',
            error: imageData.error,
            percent: Math.round((this.loaded / this.total) * 100)
          });
          
          resolve(imageData);
        }
      }, 10000); // 10 second timeout

      // Start loading
      img.src = imageData.url;
    });
  }

  /**
   * Get a preloaded image by ID
   * @param {string} imageId - ID of the image
   * @returns {Object|null} Image data object or null if not found
   */
  getImage(imageId) {
    return this.images[imageId] || null;
  }

  /**
   * Check if an image is loaded
   * @param {string} imageId - ID of the image
   * @returns {boolean} True if image is loaded
   */
  isImageLoaded(imageId) {
    const image = this.images[imageId];
    return image && image.loaded && !image.error;
  }

  /**
   * Get all images for a specific location
   * @param {string} locationId - ID of the location
   * @returns {Array} Array of image data objects
   */
  getLocationImages(locationId) {
    return Object.values(this.images).filter(image => image.locationId === locationId);
  }

  /**
   * Get loading statistics
   * @returns {Object} Loading statistics
   */
  getStats() {
    return {
      total: this.total,
      loaded: this.loaded,
      errors: this.errors.length,
      status: this.status,
      percent: this.total > 0 ? Math.round((this.loaded / this.total) * 100) : 0
    };
  }

  /**
   * Reset the preloader state
   */
  reset() {
    this.images = {};
    this.loaded = 0;
    this.total = 0;
    this.status = 'idle';
    this.errors = [];
    this.loadingPromises.clear();
  }

  /**
   * Dispose of the preloader and clean up resources
   */
  dispose() {
    this.reset();
    this.onProgress = () => {};
  }
}

export default ImagePreloader; 
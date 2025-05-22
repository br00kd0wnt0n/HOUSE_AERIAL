/**
 * ImagePreloaderV2.js - Image preloader with strategy pattern
 * Uses interchangeable strategies for browser or service worker loading
 * Optimized for secondary hotspot UI element images
 */

import ServiceWorkerImageStrategy from './ServiceWorkerImageStrategy';
import BrowserImageStrategy from './BrowserImageStrategy';
import logger from '../../utils/logger';

// Module name for logging
const MODULE = 'ImagePreloaderV2';

class ImagePreloaderV2 {
  /**
   * Initialize the preloader
   * @param {Function} onProgress Callback for progress reporting
   */
  constructor(onProgress = () => {}) {
    // Main image tracking state
    this.images = {};
    this.loaded = 0;
    this.total = 0;
    this.onProgress = onProgress;
    this.isInitialized = false;
    
    // Location and image metadata
    this.imagesTimestamp = Date.now();
    this.imageVersions = {};
    this.locationImages = {};
    
    // Status tracking
    this.status = 'idle'; // idle, loading, complete, error
    this.errors = [];
    
    // Initialize strategies
    this.browserStrategy = new BrowserImageStrategy(this.handleStrategyProgress.bind(this));
    this.serviceWorkerStrategy = new ServiceWorkerImageStrategy(this.handleStrategyProgress.bind(this));
    
    // Default to browser strategy (images are smaller, browser cache often sufficient)
    this.currentStrategy = this.browserStrategy;
  }
  
  /**
   * Handle progress events from strategies
   * @param {number} loaded Number of loaded images
   * @param {number} total Total number of images
   * @param {Object} details Additional details about progress
   */
  handleStrategyProgress(loaded, total, details) {
    // Update internal state
    if (details?.imageId && this.images[details.imageId]) {
      this.images[details.imageId].loaded = details.status === 'loaded';
      this.images[details.imageId].error = details.error || null;
    }
    
    // Track overall loaded count
    if (details?.status === 'loaded' || details?.status === 'error') {
      this.loaded++;
    }
    
    // Call the progress callback
    this.onProgress(
      this.loaded, 
      this.total, 
      {
        percent: this.total > 0 ? Math.round((this.loaded / this.total) * 100) : 0,
        ...details
      }
    );
    
    // Update status when all images are processed
    if (this.loaded >= this.total) {
      this.status = this.errors.length > 0 ? 'complete-with-errors' : 'complete';
      
      // Final callback
      this.onProgress(this.loaded, this.total, {
        status: this.status,
        percent: 100,
        errors: this.errors
      });
    }
  }
  
  /**
   * Preload a single image directly by URL
   * @param {string} id Unique ID for the image
   * @param {string} url URL to the image
   * @param {boolean} useServiceWorker Whether to use service worker strategy
   * @returns {Promise<Object>} Promise resolving to the image object
   */
  async preloadSingleImage(id, url, useServiceWorker = false) {
    if (!id || !url) {
      return Promise.reject(new Error('ID and URL are required'));
    }
    
    logger.info(MODULE, `Direct preload of image: ${id}`);
    
    // Add image to tracking
    this.images[id] = {
      id,
      url,
      loaded: false,
      error: null,
      version: this.generateContentHash(url)
    };
    
    this.total += 1;
    
    // Set the appropriate strategy
    this.currentStrategy = useServiceWorker ? 
      this.serviceWorkerStrategy : 
      this.browserStrategy;
    
    // Status update
    this.status = 'loading';
    
    // Start preloading
    try {
      await this.currentStrategy.load([this.images[id]]);
      logger.info(MODULE, `Direct preload complete for image: ${id}`);
      return this.images[id];
    } catch (error) {
      logger.error(MODULE, `Error preloading image ${id}:`, error);
      this.images[id].error = error.message || 'Failed to preload';
      return Promise.reject(error);
    }
  }
  
  /**
   * Initialize the preloader with images
   * @param {Object} options Initialization options
   * @returns {ImagePreloaderV2} This instance for chaining
   */
  initialize({ images = [], locations = {}, resetExisting = true } = {}) {
    // Reset state if requested
    if (resetExisting) {
      this.releaseAll();
    }
    
    this.status = 'initialized';
    this.imagesTimestamp = Date.now();
    this.isInitialized = true;
    
    // Process flat image list
    if (images && images.length) {
      this.registerImages(images);
    }
    
    // Process location-based images
    if (locations && Object.keys(locations).length) {
      Object.entries(locations).forEach(([locationId, locationImages]) => {
        // Store location images map
        this.locationImages[locationId] = locationImages.map(image => image.id);
        
        // Tag each image with its location
        const imagesWithLocation = locationImages.map(image => ({
          ...image,
          locationId
        }));
        
        this.registerImages(imagesWithLocation);
      });
    }
    
    logger.info(MODULE, `ImagePreloader initialized with ${this.total} images`);
    
    // Initial progress callback
    this.onProgress(this.loaded, this.total, {
      status: 'initialized',
      percent: 0
    });
    
    return this;
  }
  
  /**
   * Register images with the preloader
   * @param {Array} images List of images to register
   */
  registerImages(images) {
    if (!images || !images.length) return;
    
    images.forEach(image => {
      if (!image.id || !image.url) {
        logger.warn(MODULE, 'Image is missing id or url:', image);
        return;
      }
      
      // Skip if already registered
      if (this.images[image.id]) {
        return;
      }
      
      // Generate content hash
      const contentHash = this.generateContentHash(image.url, image.lastModified);
      
      // Add to tracking
      this.images[image.id] = {
        ...image,
        loaded: false,
        error: null,
        version: contentHash
      };
      
      this.total++;
    });
  }
  
  /**
   * Generate content hash for caching
   * @param {string} url Image URL
   * @param {number} lastModified Last modified timestamp
   * @returns {string} Content hash
   */
  generateContentHash(url, lastModified = Date.now()) {
    // Simple hash generation based on URL and timestamp
    const content = `${url}-${lastModified}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Preload all images
   * @param {Object} options Preloading options
   * @returns {Promise<Array>} Promise resolving to loaded images
   */
  async preloadAll({ useServiceWorker = false, locationId = null } = {}) {
    const images = locationId ? 
      this.getLocationImages(locationId) : 
      Object.values(this.images);
    
    if (!images.length) {
      logger.info(MODULE, 'No images to preload');
      return Promise.resolve([]);
    }
    
    logger.info(MODULE, `Preloading ${images.length} images${locationId ? ` for location ${locationId}` : ''}`);
    
    // Set the appropriate strategy
    this.currentStrategy = useServiceWorker ? 
      this.serviceWorkerStrategy : 
      this.browserStrategy;
    
    // Status update
    this.status = 'loading';
    
    try {
      await this.currentStrategy.load(images);
      logger.info(MODULE, `Preloading complete${locationId ? ` for location ${locationId}` : ''}`);
      return images;
    } catch (error) {
      logger.error(MODULE, 'Error during preloading:', error);
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * Preload images for a specific location
   * @param {string} locationId Location ID
   * @param {Object} options Preloading options
   * @returns {Promise<Array>} Promise resolving to loaded images
   */
  async preloadLocation(locationId, options = {}) {
    if (!this.locationImages[locationId]) {
      logger.warn(MODULE, `No images found for location: ${locationId}`);
      return Promise.resolve([]);
    }
    
    return this.preloadAll({ ...options, locationId });
  }
  
  /**
   * Get image by ID
   * @param {string} id Image ID
   * @returns {Object|null} Image object or null
   */
  getImage(id) {
    return this.images[id] || null;
  }
  
  /**
   * Get image URL by ID
   * @param {string} id Image ID
   * @returns {string|null} Image URL or null
   */
  getImageUrl(id) {
    const image = this.getImage(id);
    return image ? image.url : null;
  }
  
  /**
   * Get images for a specific location
   * @param {string} locationId Location ID
   * @returns {Array} Array of image objects
   */
  getLocationImages(locationId) {
    if (!this.locationImages[locationId]) {
      return [];
    }
    
    return this.locationImages[locationId]
      .map(imageId => this.images[imageId])
      .filter(Boolean);
  }
  
  /**
   * Check if preloading is complete
   * @param {string} locationId Optional location ID to check
   * @returns {boolean} True if complete
   */
  isComplete(locationId = null) {
    const images = locationId ? 
      this.getLocationImages(locationId) : 
      Object.values(this.images);
    
    if (!images.length) return true;
    
    return images.every(image => image.loaded || image.error);
  }
  
  /**
   * Release all images and reset state
   */
  releaseAll() {
    this.images = {};
    this.locationImages = {};
    this.loaded = 0;
    this.total = 0;
    this.status = 'idle';
    this.errors = [];
    this.isInitialized = false;
  }
  
  /**
   * Dispose of the preloader and cleanup resources
   */
  dispose() {
    this.releaseAll();
    
    // Dispose of strategies
    if (this.browserStrategy && typeof this.browserStrategy.dispose === 'function') {
      this.browserStrategy.dispose();
    }
    
    if (this.serviceWorkerStrategy && typeof this.serviceWorkerStrategy.dispose === 'function') {
      this.serviceWorkerStrategy.dispose();
    }
    
    this.browserStrategy = null;
    this.serviceWorkerStrategy = null;
    this.currentStrategy = null;
    this.onProgress = null;
  }
}

export default ImagePreloaderV2; 
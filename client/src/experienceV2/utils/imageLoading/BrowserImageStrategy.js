import ImageLoadingStrategy from './ImageLoadingStrategy';
import logger from '../../utils/logger';

/**
 * Browser strategy for image loading
 * Uses standard Image objects for preloading images in the browser
 * Relies on browser cache for subsequent loads
 */
class BrowserImageStrategy extends ImageLoadingStrategy {
  constructor(onProgress = () => {}) {
    super(onProgress);
    this.loadedImages = {};
    this.imagePromises = {};
    
    // Module name for logging
    this.MODULE = 'BrowserImageStrategy';
  }
  
  /**
   * Load a list of images using browser Image API
   * @param {Array} images List of images to load
   * @param {Object} options Additional options
   * @returns {Promise} Promise that resolves when all images are loaded
   */
  async load(images, options = {}) {
    if (!images || !images.length) {
      return Promise.resolve([]);
    }
    
    logger.info(this.MODULE, `Loading ${images.length} images using browser strategy`);
    
    const loadPromises = images.map(image => this.loadSingleImage(image));
    
    try {
      const results = await Promise.allSettled(loadPromises);
      
      // Process results
      let loadedCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        const image = images[index];
        
        if (result.status === 'fulfilled') {
          loadedCount++;
          this.onProgress(loadedCount, images.length, {
            imageId: image.id,
            status: 'loaded',
            url: image.url
          });
        } else {
          errorCount++;
          logger.error(this.MODULE, `Failed to load image ${image.id}:`, result.reason);
          this.onProgress(loadedCount + errorCount, images.length, {
            imageId: image.id,
            status: 'error',
            error: result.reason?.message || 'Failed to load image',
            url: image.url
          });
        }
      });
      
      logger.info(this.MODULE, `Image loading complete: ${loadedCount} loaded, ${errorCount} errors`);
      return results;
      
    } catch (error) {
      logger.error(this.MODULE, 'Error during image loading:', error);
      throw error;
    }
  }
  
  /**
   * Load a single image
   * @param {Object} image Image object with id and url
   * @returns {Promise} Promise that resolves when image is loaded
   */
  async loadSingleImage(image) {
    const { id, url } = image;
    
    // Check if already loaded
    if (this.loadedImages[id]) {
      logger.debug(this.MODULE, `Image ${id} already loaded`);
      return this.loadedImages[id];
    }
    
    // Check if loading is already in progress
    if (this.imagePromises[id]) {
      logger.debug(this.MODULE, `Image ${id} already loading`);
      return this.imagePromises[id];
    }
    
    logger.debug(this.MODULE, `Loading image: ${id} (${url})`);
    
    // Create loading promise
    this.imagePromises[id] = new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set up event handlers
      img.onload = () => {
        logger.debug(this.MODULE, `Image loaded successfully: ${id}`);
        this.loadedImages[id] = img;
        
        // Clean up promise
        delete this.imagePromises[id];
        
        resolve(img);
      };
      
      img.onerror = (error) => {
        logger.error(this.MODULE, `Failed to load image ${id}:`, error);
        
        // Clean up promise
        delete this.imagePromises[id];
        
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.onabort = () => {
        logger.warn(this.MODULE, `Image load aborted: ${id}`);
        
        // Clean up promise
        delete this.imagePromises[id];
        
        reject(new Error(`Image load aborted: ${url}`));
      };
      
      // Start loading - set crossOrigin before src to handle CORS
      if (url.includes('localhost') || url.startsWith('/')) {
        // Local images don't need CORS handling
        img.src = url;
      } else {
        // External images might need CORS handling
        img.crossOrigin = 'anonymous';
        img.src = url;
      }
    });
    
    return this.imagePromises[id];
  }
  
  /**
   * Check if an image is already cached/loaded
   * @param {string} imageId ID of the image to check
   * @returns {Promise<boolean>} Promise that resolves with true if the image is loaded
   */
  async isCached(imageId) {
    return Promise.resolve(!!this.loadedImages[imageId]);
  }
  
  /**
   * Get the URL for a loaded image
   * @param {string} imageId ID of the image to get
   * @returns {Promise<string>} Promise that resolves with the URL
   */
  async getUrl(imageId) {
    const loadedImage = this.loadedImages[imageId];
    if (loadedImage && loadedImage.src) {
      return Promise.resolve(loadedImage.src);
    }
    return Promise.reject(new Error(`Image ${imageId} not found`));
  }
  
  /**
   * Clear all cached images
   * @returns {Promise<boolean>} Promise that resolves with true if successful
   */
  async clearCache() {
    logger.info(this.MODULE, 'Clearing browser image cache');
    
    // Dispose of image objects
    Object.values(this.loadedImages).forEach(img => {
      if (img && typeof img.src !== 'undefined') {
        img.src = '';
      }
    });
    
    // Clear tracking objects
    this.loadedImages = {};
    this.imagePromises = {};
    
    return Promise.resolve(true);
  }
  
  /**
   * Get information about loaded images
   * @returns {Object} Information about loaded images
   */
  getLoadedImagesInfo() {
    const loadedIds = Object.keys(this.loadedImages);
    const loadingIds = Object.keys(this.imagePromises);
    
    return {
      loaded: loadedIds.length,
      loading: loadingIds.length,
      loadedIds,
      loadingIds
    };
  }
  
  /**
   * Dispose of the strategy and cleanup resources
   */
  dispose() {
    logger.info(this.MODULE, 'Disposing browser image strategy');
    
    // Clear cache
    this.clearCache();
    
    // Call parent dispose
    super.dispose();
  }
}

export default BrowserImageStrategy; 
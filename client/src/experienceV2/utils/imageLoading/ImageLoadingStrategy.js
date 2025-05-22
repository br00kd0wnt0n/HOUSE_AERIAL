/**
 * Base class for image loading strategies
 * Provides an interface for different image loading implementations
 */
class ImageLoadingStrategy {
  /**
   * Initialize the strategy
   * @param {Function} onProgress Callback for reporting loading progress
   */
  constructor(onProgress = () => {}) {
    this.onProgress = onProgress;
  }
  
  /**
   * Load a list of images
   * @param {Array} images List of images to load
   * @param {Object} options Additional options
   * @returns {Promise} Promise that resolves when all images are loaded
   */
  async load(images, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if the image is already cached
   * @param {string} imageId ID of the image to check
   * @returns {Promise<boolean>} Promise that resolves with true if the image is cached
   */
  async isCached(imageId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the URL for a cached image
   * @param {string} imageId ID of the image to get
   * @returns {Promise<string>} Promise that resolves with the URL
   */
  async getUrl(imageId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Clear all cached images
   * @returns {Promise<boolean>} Promise that resolves with true if successful
   */
  async clearCache() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Dispose of the strategy and cleanup resources
   */
  dispose() {
    this.onProgress = null;
  }
}

export default ImageLoadingStrategy; 
/**
 * Base class for video loading strategies
 * Provides an interface for different loading implementations
 */
class LoadingStrategy {
  /**
   * Initialize the strategy
   * @param {Function} onProgress Callback for reporting loading progress
   */
  constructor(onProgress = () => {}) {
    this.onProgress = onProgress;
  }
  
  /**
   * Load a list of videos
   * @param {Array} videos List of videos to load
   * @param {Object} options Additional options
   * @returns {Promise} Promise that resolves when all videos are loaded
   */
  async load(videos, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if the video is already cached
   * @param {string} videoId ID of the video to check
   * @returns {Promise<boolean>} Promise that resolves with true if the video is cached
   */
  async isCached(videoId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the URL for a cached video
   * @param {string} videoId ID of the video to get
   * @returns {Promise<string>} Promise that resolves with the URL
   */
  async getUrl(videoId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Clear all cached videos
   * @returns {Promise<boolean>} Promise that resolves with true if successful
   */
  async clearCache() {
    throw new Error('Method not implemented');
  }
}

export default LoadingStrategy; 
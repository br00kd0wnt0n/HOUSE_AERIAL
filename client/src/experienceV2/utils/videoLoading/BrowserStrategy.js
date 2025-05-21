import LoadingStrategy from './LoadingStrategy';
import logger from '../../utils/logger';

/**
 * Browser strategy for video loading
 * Uses fetch and blob storage for loading videos directly in the browser
 */
class BrowserStrategy extends LoadingStrategy {
  constructor(onProgress = () => {}) {
    super(onProgress);
    this.blobCache = {};
    this.objectUrls = {};
    this.activeRequests = 0;
    this.maxConcurrentRequests = 3;
    
    // Module name for logging
    this.MODULE = 'BrowserStrategy';
  }
  
  /**
   * Load videos using browser fetch and cache
   * @param {Array} videos List of videos to load
   * @param {Object} options Additional options
   * @returns {Promise} Promise that resolves when all videos are loaded
   */
  async load(videos, options = {}) {
    logger.debug(this.MODULE, 'Loading videos with browser strategy');
    
    // If no videos to load, resolve immediately
    if (!videos || videos.length === 0) {
      logger.debug(this.MODULE, 'No videos to load');
      return Promise.resolve([]);
    }
    
    this.activeRequests = 0;
    
    // Queue for videos waiting to be loaded
    const queue = [...videos];
    const promises = [];
    
    // Process the queue with concurrency limit
    const processQueue = async () => {
      while (queue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
        const video = queue.shift();
        this.activeRequests++;
        
        // Load the video
        const promise = this.loadSingleVideo(video)
          .catch(error => {
            logger.error(this.MODULE, `Error loading video ${video.id}:`, error);
            return {
              ...video,
              error: error.message || 'Failed to load video'
            };
          })
          .finally(() => {
            this.activeRequests--;
            // Continue processing the queue
            if (queue.length > 0) {
              processQueue();
            }
          });
        
        promises.push(promise);
      }
    };
    
    // Start processing the queue
    await processQueue();
    
    try {
      // Wait for all promises to settle
      await Promise.allSettled(promises);
      return videos;
    } catch (error) {
      logger.error(this.MODULE, 'Error during browser preloading:', error);
      return videos;
    }
  }
  
  /**
   * Load a single video
   * @param {Object} video Video object to load
   * @returns {Promise} Promise that resolves when the video is loaded
   */
  async loadSingleVideo(video) {
    if (!video || !video.url) {
      const error = `Invalid video or URL for ID ${video.id}`;
      logger.warn(this.MODULE, error);
      return Promise.reject(new Error(error));
    }
    
    try {
      logger.debug(this.MODULE, `Loading video ${video.id} from ${video.url}`);
      
      const response = await fetch(video.url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${video.url}: ${response.status}`);
      }
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Store in cache
      this.blobCache[video.id] = blob;
      this.objectUrls[video.id] = objectUrl;
      
      // Call progress callback
      this.onProgress(1, 1, {
        videoId: video.id,
        status: 'loaded',
        percent: 100
      });
      
      return {
        ...video,
        loaded: true,
        blob,
        objectUrl
      };
    } catch (error) {
      logger.error(this.MODULE, `Error loading video ${video.id}:`, error);
      
      // Call progress callback
      this.onProgress(1, 1, {
        videoId: video.id,
        status: 'error',
        error: error.message || 'Unknown error loading video'
      });
      
      return Promise.reject(error);
    }
  }
  
  /**
   * Check if a video is cached in the browser
   * @param {string} videoId ID of the video to check
   * @returns {boolean} True if the video is cached
   */
  isCached(videoId) {
    return !!this.blobCache[videoId];
  }
  
  /**
   * Get the URL for a cached video
   * @param {string} videoId ID of the video to get
   * @returns {string|null} Object URL for the video or null if not cached
   */
  getUrl(videoId) {
    return this.objectUrls[videoId] || null;
  }
  
  /**
   * Clear all cached videos
   * @returns {boolean} True if successful
   */
  clearCache() {
    try {
      // Release all object URLs
      Object.values(this.objectUrls).forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          logger.warn(this.MODULE, 'Error revoking object URL:', e);
        }
      });
      
      // Clear cache objects
      this.blobCache = {};
      this.objectUrls = {};
      
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Error clearing cache:', error);
      return false;
    }
  }
  
  /**
   * Dispose the strategy and clean up resources
   */
  dispose() {
    this.clearCache();
  }
}

export default BrowserStrategy; 
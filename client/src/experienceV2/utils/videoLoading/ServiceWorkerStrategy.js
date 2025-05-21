import LoadingStrategy from './LoadingStrategy';
import BrowserStrategy from './BrowserStrategy';
import logger from '../../utils/logger';

/**
 * Service Worker strategy for video loading
 * Uses service worker cache API for storing and retrieving videos
 * Falls back to browser strategy when service worker is not available
 */
class ServiceWorkerStrategy extends LoadingStrategy {
  constructor(onProgress = () => {}) {
    super(onProgress);
    this.clientId = null;
    this.pendingOperations = new Map();
    this.loadedVideos = {};
    
    // Module name for logging
    this.MODULE = 'ServiceWorkerStrategy';
    
    // Create browser strategy as fallback
    this.browserFallback = new BrowserStrategy(onProgress);
    
    // Listen for messages from the service worker
    this.setupMessageHandler();
  }
  
  /**
   * Set up message handling from service worker
   */
  setupMessageHandler() {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
      return;
    }
    
    navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
  }
  
  /**
   * Handle messages from the service worker
   * @param {MessageEvent} event Message event
   */
  handleServiceWorkerMessage(event) {
    const { data } = event;
    
    if (!data) {
      return;
    }
    
    // Check if this is a client ID response
    if (data.type === 'CLIENT_ID_RESPONSE' && data.requestId && data.clientId) {
      // If we have a pending request for this requestId, resolve it
      if (this.pendingOperations.has(data.requestId)) {
        logger.debug(this.MODULE, 'Received client ID from service worker:', data.clientId);
        this.pendingOperations.get(data.requestId).resolve(data.clientId);
        this.pendingOperations.delete(data.requestId);
        return;
      }
    }
    
    // Handle CACHE_PROGRESS messages from service worker
    if (data.type === 'CACHE_PROGRESS') {
      const videoId = data.video;
      const status = data.status; // 'completed', 'error', etc.
      
      // Mark video as loaded if status is 'completed'
      if (status === 'completed') {
        // Store as loaded
        this.loadedVideos[videoId] = true;
        
        // Call progress callback
        this.onProgress(data.completed, data.total, {
          videoId: videoId,
          status: 'loaded',
          percent: 100
        });
        
        // Resolve any pending promise for this video
        if (this.pendingOperations.has(videoId)) {
          this.pendingOperations.get(videoId).resolve(videoId);
          this.pendingOperations.delete(videoId);
        }
      }
      
      return;
    }
    
    // Handle CACHE_ERROR messages
    if (data.type === 'CACHE_ERROR') {
      logger.error(this.MODULE, `Error caching video ${data.video}:`, data.error);
      
      // Call progress callback
      this.onProgress(data.completed, data.total, {
        videoId: data.video,
        status: 'error',
        error: data.error
      });
      
      // Reject any pending promise for this video
      if (this.pendingOperations.has(data.video)) {
        this.pendingOperations.get(data.video).reject(new Error(data.error));
        this.pendingOperations.delete(data.video);
      }
      
      return;
    }
    
    // Preserved original handling for backward compatibility
    if (data.type === 'VIDEO_CACHE_STATUS') {
      // Check if this message is for us
      if (data.clientId && this.clientId && data.clientId !== this.clientId) {
        return;
      }
      
      if (data.status === 'progress') {
        this.onProgress(data.loaded, data.total, {
          videoId: data.video,
          status: 'loading',
          percent: data.percent || 0
        });
      }
      else if (data.status === 'complete') {
        // Store as loaded
        this.loadedVideos[data.video] = true;
        
        // Call progress callback
        this.onProgress(1, 1, {
          videoId: data.video,
          status: 'loaded',
          percent: 100
        });
        
        // Resolve any pending promise for this video
        if (this.pendingOperations.has(data.video)) {
          this.pendingOperations.get(data.video).resolve(data.video);
          this.pendingOperations.delete(data.video);
        }
      }
      else if (data.status === 'error') {
        logger.error(this.MODULE, `Error caching video ${data.video}:`, data.error);
        
        // Call progress callback
        this.onProgress(1, 1, {
          videoId: data.video,
          status: 'error',
          error: data.error
        });
        
        // Reject any pending promise for this video
        if (this.pendingOperations.has(data.video)) {
          this.pendingOperations.get(data.video).reject(new Error(data.error));
          this.pendingOperations.delete(data.video);
        }
      }
      else if (data.status === 'cached-list') {
        // Update cached videos list
        data.videos.forEach(videoId => {
          this.loadedVideos[videoId] = true;
        });
        
        // Resolve any pending cache checks
        if (this.pendingOperations.has('cache-list')) {
          this.pendingOperations.get('cache-list').resolve(data.videos);
          this.pendingOperations.delete('cache-list');
        }
      }
    }
  }
  
  /**
   * Get a unique client ID for this instance
   * @returns {Promise<string>} Promise that resolves to the client ID
   */
  async getClientId() {
    // If we already have a client ID, return it
    if (this.clientId) {
      return this.clientId;
    }
    
    if (typeof navigator === 'undefined' || !navigator.serviceWorker || !navigator.serviceWorker.controller) {
      this.clientId = `browser-${Date.now()}`;
      return this.clientId;
    }
    
    try {
      // Create a unique request ID for this client ID request
      const requestId = `client-id-request-${Date.now()}`;
      
      // Create a promise that will be resolved with the client ID
      const clientIdPromise = new Promise((resolve, reject) => {
        // Set a timeout for the request
        const timeout = setTimeout(() => {
          logger.warn(this.MODULE, 'Timeout getting client ID from service worker. Falling back to generated ID.');
          this.clientId = `timeout-${Date.now()}`;
          resolve(this.clientId); // Resolve with fallback instead of rejecting
          // Also clean up the pending operation
          if (this.pendingOperations.has(requestId)) {
            this.pendingOperations.delete(requestId);
          }
        }, 15000);
        
        // Store the resolver in pendingOperations so we can resolve it when we get a response
        this.pendingOperations.set(requestId, { 
          resolve: (clientId) => {
            clearTimeout(timeout);
            this.clientId = clientId;
            resolve(clientId);
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          }
        });
      });
      
      // Send a message to the service worker with the request ID
      logger.debug(this.MODULE, 'Requesting client ID from service worker');
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CLIENT_ID',
        requestId: requestId
      });
      
      // Wait for the client ID
      return await clientIdPromise;
    } catch (error) {
      logger.error(this.MODULE, 'Error getting client ID:', error);
      this.clientId = `fallback-${Date.now()}`;
      return this.clientId;
    }
  }
  
  /**
   * Load videos using service worker cache
   * @param {Array} videos List of videos to load
   * @param {Object} options Additional options
   * @returns {Promise} Promise that resolves when all videos are loaded
   */
  async load(videos, options = {}) {
    logger.debug(this.MODULE, 'Loading videos with service worker strategy');
    
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      logger.warn(this.MODULE, 'Service worker controller not available, falling back to browser strategy');
      // Fall back to browser strategy instead of failing
      return this.browserFallback.load(videos, options);
    }
    
    // Ensure we have a client ID
    const clientId = await this.getClientId();
    
    // Send the cache request to the service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_VIDEOS',
      videos,
      clientId,
      options
    });
    
    // Create promises for each video
    const promises = videos.map(video => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (this.loadedVideos[video.id]) {
          resolve(video.id);
          return;
        }
        
        // Store the promise resolvers
        this.pendingOperations.set(video.id, { resolve, reject });
        
        // Set up a timeout
        setTimeout(() => {
          if (this.pendingOperations.has(video.id)) {
            this.pendingOperations.delete(video.id);
            resolve(video.id); // Resolve anyway after timeout
          }
        }, 60000); // 1 minute timeout
      });
    });
    
    // Wait for all videos to be processed
    return Promise.all(promises);
  }
  
  /**
   * Check if a video is cached in the service worker
   * @param {string} videoId ID of the video to check
   * @returns {Promise<boolean>} Promise that resolves to true if cached
   */
  async isCached(videoId) {
    // Check local cache first
    if (this.loadedVideos[videoId]) {
      return true;
    }
    
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      return false;
    }
    
    try {
      // Request cached video list from service worker
      const cachedVideos = await this.getCachedVideos();
      return cachedVideos.includes(videoId);
    } catch (error) {
      logger.error(this.MODULE, 'Error checking if video is cached:', error);
      return false;
    }
  }
  
  /**
   * Get list of videos cached in the service worker
   * @returns {Promise<Array>} Promise that resolves to array of video IDs
   */
  async getCachedVideos() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      return [];
    }
    
    // Create a promise to wait for the cached videos list
    const cachePromise = new Promise((resolve, reject) => {
      this.pendingOperations.set('cache-list', { resolve, reject });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingOperations.has('cache-list')) {
          this.pendingOperations.delete('cache-list');
          resolve([]); // Return empty list on timeout
        }
      }, 5000);
    });
    
    // Request the list from the service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'GET_CACHED_VIDEOS'
    });
    
    return cachePromise;
  }
  
  /**
   * Get the URL for a cached video
   * @param {string} videoId ID of the video to get
   * @returns {string|null} URL for the video or null if not cached
   */
  getUrl(videoId) {
    // Service worker doesn't change the URL - it intercepts the request
    return null;
  }
  
  /**
   * Clear all cached videos
   * @returns {Promise<boolean>} Promise that resolves to true if successful
   */
  async clearCache() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      return false;
    }
    
    try {
      // Send clear cache request to service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_VIDEO_CACHE'
      });
      
      // Reset local cache
      this.loadedVideos = {};
      
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
    // Clean up event listeners
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
    }
    
    // Clear any pending operations
    this.pendingOperations.clear();
  }
}

export default ServiceWorkerStrategy; 
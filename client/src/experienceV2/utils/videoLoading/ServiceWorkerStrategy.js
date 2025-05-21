import LoadingStrategy from './LoadingStrategy';
import BrowserStrategy from './BrowserStrategy';
import logger from '../../utils/logger';

// Constants for operation states
const OperationState = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

// Constants for message types
const MessageType = {
  CLIENT_ID_RESPONSE: 'CLIENT_ID_RESPONSE',
  CACHE_PROGRESS: 'CACHE_PROGRESS',
  CACHE_ERROR: 'CACHE_ERROR',
  VIDEO_CACHE_STATUS: 'VIDEO_CACHE_STATUS',
};

/**
 * Service Worker strategy for video loading
 * Uses service worker cache API for storing and retrieving videos
 * Falls back to browser strategy when service worker is not available
 */
class ServiceWorkerStrategy extends LoadingStrategy {
  constructor(onProgress = () => {}) {
    super(onProgress);
    this.clientId = null;
    
    // Enhanced pending operations tracking
    this.pendingOperations = new Map();
    this.operationTimeouts = new Map();
    this.lastCleanup = Date.now();
    this.cleanupInterval = 30000; // 30 seconds
    
    this.loadedVideos = {};
    
    // Module name for logging
    this.MODULE = 'ServiceWorkerStrategy';
    
    // Create browser strategy as fallback
    this.browserFallback = new BrowserStrategy(onProgress);
    
    // Bind the message handler method to preserve 'this' context
    this.boundMessageHandler = this.handleServiceWorkerMessage.bind(this);
    
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
    
    navigator.serviceWorker.addEventListener('message', this.boundMessageHandler);
  }
  
  /**
   * Handle messages from the service worker
   * @param {MessageEvent} event Message event
   */
  handleServiceWorkerMessage(event) {
    const { data } = event;
    
    if (!data || !data.type) {
      return;
    }
    
    // Clean up stale operations periodically
    this.cleanupStaleOperations();
    
    // Delegate to appropriate handler based on message type
    switch (data.type) {
      case MessageType.CLIENT_ID_RESPONSE:
        this.handleClientIdResponse(data);
        break;
      case MessageType.CACHE_PROGRESS:
        this.handleCacheProgress(data);
        break;
      case MessageType.CACHE_ERROR:
        this.handleCacheError(data);
        break;
      case MessageType.VIDEO_CACHE_STATUS:
        this.handleVideoCacheStatus(data);
        break;
      default:
        logger.debug(this.MODULE, `Unknown message type: ${data.type}`);
        break;
    }
  }
  
  /**
   * Handle CLIENT_ID_RESPONSE messages
   * @param {Object} data Message data
   */
  handleClientIdResponse(data) {
    if (!data.requestId || !data.clientId) {
      logger.warn(this.MODULE, 'Received invalid CLIENT_ID_RESPONSE', data);
      return;
    }
    
    // If we have a pending request for this requestId, resolve it
    if (this.pendingOperations.has(data.requestId)) {
      logger.debug(this.MODULE, 'Received client ID from service worker:', data.clientId);
      
      const operation = this.pendingOperations.get(data.requestId);
      
      // Clear the timeout if it exists
      if (this.operationTimeouts.has(data.requestId)) {
        clearTimeout(this.operationTimeouts.get(data.requestId));
        this.operationTimeouts.delete(data.requestId);
      }
      
      // Resolve the promise
      operation.resolve(data.clientId);
      
      // Update operation state
      operation.state = OperationState.COMPLETED;
      operation.completedAt = Date.now();
      
      // We keep the operation in the map for cleanup later
    }
  }
  
  /**
   * Handle CACHE_PROGRESS messages
   * @param {Object} data Message data
   */
  handleCacheProgress(data) {
    const videoId = data.video;
    const status = data.status; // 'completed', 'error', etc.
    
    if (!videoId) {
      logger.warn(this.MODULE, 'Received CACHE_PROGRESS without videoId', data);
      return;
    }
    
    // Mark video as loaded if status is 'completed'
    if (status === 'completed') {
      // Store as loaded
      this.loadedVideos[videoId] = true;
      
      // Call progress callback
      this.onProgress(data.completed || 1, data.total || 1, {
        videoId: videoId,
        status: 'loaded',
        percent: 100
      });
      
      // Handle pending operation if it exists
      if (this.pendingOperations.has(videoId)) {
        const operation = this.pendingOperations.get(videoId);
        
        // Clear any existing timeout
        if (this.operationTimeouts.has(videoId)) {
          clearTimeout(this.operationTimeouts.get(videoId));
          this.operationTimeouts.delete(videoId);
        }
        
        // Resolve the promise
        operation.resolve(videoId);
        
        // Update operation state
        operation.state = OperationState.COMPLETED;
        operation.completedAt = Date.now();
      }
    } else {
      // Handle progress updates
      this.onProgress(data.completed || 0, data.total || 1, {
        videoId: videoId,
        status: 'loading',
        percent: data.percent || 0
      });
    }
  }
  
  /**
   * Handle CACHE_ERROR messages
   * @param {Object} data Message data
   */
  handleCacheError(data) {
    const videoId = data.video;
    
    if (!videoId) {
      logger.warn(this.MODULE, 'Received CACHE_ERROR without videoId', data);
      return;
    }
    
    logger.error(this.MODULE, `Error caching video ${videoId}:`, data.error);
    
    // Call progress callback
    this.onProgress(data.completed || 0, data.total || 1, {
      videoId: videoId,
      status: 'error',
      error: data.error
    });
    
    // Handle pending operation if it exists
    if (this.pendingOperations.has(videoId)) {
      const operation = this.pendingOperations.get(videoId);
      
      // Clear any existing timeout
      if (this.operationTimeouts.has(videoId)) {
        clearTimeout(this.operationTimeouts.get(videoId));
        this.operationTimeouts.delete(videoId);
      }
      
      // Reject the promise
      operation.reject(new Error(data.error));
      
      // Update operation state
      operation.state = OperationState.ERROR;
      operation.error = data.error;
      operation.completedAt = Date.now();
    }
  }
  
  /**
   * Handle legacy VIDEO_CACHE_STATUS messages
   * @param {Object} data Message data
   */
  handleVideoCacheStatus(data) {
    // Check if this message is for us
    if (data.clientId && this.clientId && data.clientId !== this.clientId) {
      return;
    }
    
    // Delegate to appropriate sub-handler based on status
    switch (data.status) {
      case 'progress':
        this.handleVideoCacheProgress(data);
        break;
      case 'complete':
        this.handleVideoCacheComplete(data);
        break;
      case 'error':
        this.handleVideoCacheError(data);
        break;
      case 'cached-list':
        this.handleVideoCacheList(data);
        break;
      default:
        logger.debug(this.MODULE, `Unknown video cache status: ${data.status}`);
        break;
    }
  }
  
  /**
   * Handle VIDEO_CACHE_STATUS with 'progress' status
   * @param {Object} data Message data
   */
  handleVideoCacheProgress(data) {
    this.onProgress(data.loaded || 0, data.total || 1, {
      videoId: data.video,
      status: 'loading',
      percent: data.percent || 0
    });
  }
  
  /**
   * Handle VIDEO_CACHE_STATUS with 'complete' status
   * @param {Object} data Message data
   */
  handleVideoCacheComplete(data) {
    const videoId = data.video;
    
    if (!videoId) {
      logger.warn(this.MODULE, 'Received VIDEO_CACHE_STATUS/complete without videoId', data);
      return;
    }
    
    // Store as loaded
    this.loadedVideos[videoId] = true;
    
    // Call progress callback
    this.onProgress(1, 1, {
      videoId: videoId,
      status: 'loaded',
      percent: 100
    });
    
    // Handle pending operation if it exists
    if (this.pendingOperations.has(videoId)) {
      const operation = this.pendingOperations.get(videoId);
      
      // Clear any existing timeout
      if (this.operationTimeouts.has(videoId)) {
        clearTimeout(this.operationTimeouts.get(videoId));
        this.operationTimeouts.delete(videoId);
      }
      
      // Resolve the promise
      operation.resolve(videoId);
      
      // Update operation state
      operation.state = OperationState.COMPLETED;
      operation.completedAt = Date.now();
    }
  }
  
  /**
   * Handle VIDEO_CACHE_STATUS with 'error' status
   * @param {Object} data Message data
   */
  handleVideoCacheError(data) {
    const videoId = data.video;
    
    if (!videoId) {
      logger.warn(this.MODULE, 'Received VIDEO_CACHE_STATUS/error without videoId', data);
      return;
    }
    
    logger.error(this.MODULE, `Error caching video ${videoId}:`, data.error);
    
    // Call progress callback
    this.onProgress(1, 1, {
      videoId: videoId,
      status: 'error',
      error: data.error
    });
    
    // Handle pending operation if it exists
    if (this.pendingOperations.has(videoId)) {
      const operation = this.pendingOperations.get(videoId);
      
      // Clear any existing timeout
      if (this.operationTimeouts.has(videoId)) {
        clearTimeout(this.operationTimeouts.get(videoId));
        this.operationTimeouts.delete(videoId);
      }
      
      // Reject the promise
      operation.reject(new Error(data.error));
      
      // Update operation state
      operation.state = OperationState.ERROR;
      operation.error = data.error;
      operation.completedAt = Date.now();
    }
  }
  
  /**
   * Handle VIDEO_CACHE_STATUS with 'cached-list' status
   * @param {Object} data Message data
   */
  handleVideoCacheList(data) {
    if (!Array.isArray(data.videos)) {
      logger.warn(this.MODULE, 'Received VIDEO_CACHE_STATUS/cached-list without valid videos array', data);
      return;
    }
    
    // Update cached videos list
    data.videos.forEach(videoId => {
      this.loadedVideos[videoId] = true;
    });
    
    // Resolve any pending cache checks
    if (this.pendingOperations.has('cache-list')) {
      const operation = this.pendingOperations.get('cache-list');
      
      // Clear any existing timeout
      if (this.operationTimeouts.has('cache-list')) {
        clearTimeout(this.operationTimeouts.get('cache-list'));
        this.operationTimeouts.delete('cache-list');
      }
      
      // Resolve the promise
      operation.resolve(data.videos);
      
      // Update operation state
      operation.state = OperationState.COMPLETED;
      operation.completedAt = Date.now();
    }
  }
  
  /**
   * Create and register a pending operation
   * @param {string} id Operation ID
   * @param {Object} options Options for the operation
   * @param {function} options.resolve Promise resolve function
   * @param {function} options.reject Promise reject function
   * @param {number} options.timeout Timeout in milliseconds (default: 30000)
   * @param {string} options.timeoutMessage Message to use when timeout occurs
   * @returns {Object} The created operation object
   */
  createPendingOperation(id, { resolve, reject, timeout = 30000, timeoutMessage = 'Operation timed out' }) {
    // Create operation object
    const operation = {
      id,
      state: OperationState.PENDING,
      createdAt: Date.now(),
      resolve,
      reject,
      timeoutMessage
    };
    
    // Store the operation
    this.pendingOperations.set(id, operation);
    
    // Set up a timeout
    const timeoutId = setTimeout(() => {
      this.handleOperationTimeout(id);
    }, timeout);
    
    // Store the timeout reference
    this.operationTimeouts.set(id, timeoutId);
    
    return operation;
  }
  
  /**
   * Handle operation timeout
   * @param {string} id Operation ID
   */
  handleOperationTimeout(id) {
    if (!this.pendingOperations.has(id)) {
      return;
    }
    
    const operation = this.pendingOperations.get(id);
    
    logger.warn(this.MODULE, `Operation ${id} timed out after ${Date.now() - operation.createdAt}ms: ${operation.timeoutMessage}`);
    
    // Update operation state
    operation.state = OperationState.TIMEOUT;
    operation.completedAt = Date.now();
    
    // Resolve with fallback value instead of rejecting to prevent uncaught exceptions
    operation.resolve(null);
    
    // Remove the timeout reference
    this.operationTimeouts.delete(id);
  }
  
  /**
   * Clean up stale operations
   */
  cleanupStaleOperations() {
    const now = Date.now();
    
    // Only run cleanup periodically
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }
    
    this.lastCleanup = now;
    
    // Find completed or timed out operations older than 5 minutes
    const staleTime = now - 5 * 60 * 1000;
    
    for (const [id, operation] of this.pendingOperations.entries()) {
      if (operation.state !== OperationState.PENDING && operation.completedAt < staleTime) {
        // Clean up the operation
        this.pendingOperations.delete(id);
        
        // Also clean up any associated timeout
        if (this.operationTimeouts.has(id)) {
          clearTimeout(this.operationTimeouts.get(id));
          this.operationTimeouts.delete(id);
        }
      }
    }
    
    logger.debug(this.MODULE, `Cleaned up stale operations. Active operations: ${this.pendingOperations.size}`);
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
        // Create the pending operation with a 15-second timeout
        this.createPendingOperation(requestId, {
          resolve: (clientId) => {
            this.clientId = clientId;
            resolve(clientId);
          },
          reject,
          timeout: 15000,
          timeoutMessage: 'Timeout getting client ID from service worker'
        });
      });
      
      // Send a message to the service worker with the request ID
      logger.debug(this.MODULE, 'Requesting client ID from service worker');
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CLIENT_ID',
        requestId: requestId
      });
      
      // Wait for the client ID
      const clientId = await clientIdPromise;
      
      // If the client ID is null (timed out), generate a fallback
      if (clientId === null) {
        this.clientId = `timeout-${Date.now()}`;
        return this.clientId;
      }
      
      return clientId;
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
        
        // Create pending operation with 60-second timeout
        this.createPendingOperation(video.id, {
          resolve,
          reject,
          timeout: 60000,
          timeoutMessage: `Timeout loading video ${video.id}`
        });
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
      // Create pending operation with 5-second timeout
      this.createPendingOperation('cache-list', {
        resolve,
        reject,
        timeout: 5000,
        timeoutMessage: 'Timeout getting cached videos list'
      });
    });
    
    // Request the list from the service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'GET_CACHED_VIDEOS'
    });
    
    // Wait for the response, or get an empty array on timeout
    const result = await cachePromise;
    return result || [];
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
      navigator.serviceWorker.removeEventListener('message', this.boundMessageHandler);
    }
    
    // Clear all timeouts
    for (const timeoutId of this.operationTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    
    // Clear pending operations and timeouts
    this.pendingOperations.clear();
    this.operationTimeouts.clear();
    
    // Reset other state
    this.loadedVideos = {};
  }
}

export default ServiceWorkerStrategy; 
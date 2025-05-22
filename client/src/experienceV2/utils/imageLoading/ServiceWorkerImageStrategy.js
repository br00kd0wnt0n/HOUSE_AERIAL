import ImageLoadingStrategy from './ImageLoadingStrategy';
import BrowserImageStrategy from './BrowserImageStrategy';
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
  IMAGE_CACHE_PROGRESS: 'IMAGE_CACHE_PROGRESS',
  IMAGE_CACHE_ERROR: 'IMAGE_CACHE_ERROR'
};

/**
 * Service Worker strategy for image loading
 * Uses service worker cache API for storing and retrieving images
 * Falls back to browser strategy when service worker is not available
 */
class ServiceWorkerImageStrategy extends ImageLoadingStrategy {
  constructor(onProgress = () => {}) {
    super(onProgress);
    this.clientId = null;
    
    // Enhanced pending operations tracking
    this.pendingOperations = new Map();
    this.operationTimeouts = new Map();
    this.lastCleanup = Date.now();
    this.cleanupInterval = 30000; // 30 seconds
    
    this.loadedImages = {};
    
    // Module name for logging
    this.MODULE = 'ServiceWorkerImageStrategy';
    
    // Create browser strategy as fallback
    this.browserFallback = new BrowserImageStrategy(onProgress);
    
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
      case MessageType.IMAGE_CACHE_PROGRESS:
        this.handleImageCacheProgress(data);
        break;
      case MessageType.IMAGE_CACHE_ERROR:
        this.handleImageCacheError(data);
        break;
      default:
        // Don't log unknown messages as this strategy shares the message handler
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
    }
  }
  
  /**
   * Handle IMAGE_CACHE_PROGRESS messages
   * @param {Object} data Message data
   */
  handleImageCacheProgress(data) {
    const imageId = data.image;
    const status = data.status; // 'completed', 'error', etc.
    
    if (!imageId) {
      logger.warn(this.MODULE, 'Received IMAGE_CACHE_PROGRESS without imageId', data);
      return;
    }
    
    // Mark image as loaded if status is 'completed'
    if (status === 'completed') {
      // Store as loaded
      this.loadedImages[imageId] = true;
      
      // Call progress callback
      this.onProgress(data.completed || 1, data.total || 1, {
        imageId: imageId,
        status: 'loaded',
        percent: 100
      });
      
      // Handle pending operation if it exists
      if (this.pendingOperations.has(imageId)) {
        const operation = this.pendingOperations.get(imageId);
        
        // Clear any existing timeout
        if (this.operationTimeouts.has(imageId)) {
          clearTimeout(this.operationTimeouts.get(imageId));
          this.operationTimeouts.delete(imageId);
        }
        
        // Resolve the promise
        operation.resolve(imageId);
        
        // Update operation state
        operation.state = OperationState.COMPLETED;
        operation.completedAt = Date.now();
      }
    } else {
      // Handle progress updates
      this.onProgress(data.completed || 0, data.total || 1, {
        imageId: imageId,
        status: 'loading',
        percent: data.percent || 0
      });
    }
  }
  
  /**
   * Handle IMAGE_CACHE_ERROR messages
   * @param {Object} data Message data
   */
  handleImageCacheError(data) {
    const imageId = data.image;
    
    if (!imageId) {
      logger.warn(this.MODULE, 'Received IMAGE_CACHE_ERROR without imageId', data);
      return;
    }
    
    logger.error(this.MODULE, `Error caching image ${imageId}:`, data.error);
    
    // Call progress callback
    this.onProgress(data.completed || 0, data.total || 1, {
      imageId: imageId,
      status: 'error',
      error: data.error
    });
    
    // Handle pending operation if it exists
    if (this.pendingOperations.has(imageId)) {
      const operation = this.pendingOperations.get(imageId);
      
      // Clear any existing timeout
      if (this.operationTimeouts.has(imageId)) {
        clearTimeout(this.operationTimeouts.get(imageId));
        this.operationTimeouts.delete(imageId);
      }
      
      // Reject the promise
      operation.reject(new Error(data.error || 'Failed to cache image'));
      
      // Update operation state
      operation.state = OperationState.ERROR;
      operation.completedAt = Date.now();
      operation.error = data.error;
    }
  }
  
  /**
   * Create a pending operation and set up timeout handling
   * @param {string} id Operation ID
   * @param {Object} promiseHandlers Promise handlers { resolve, reject }
   * @param {Object} options Operation options
   */
  createPendingOperation(id, { resolve, reject, timeout = 30000, timeoutMessage = 'Operation timed out' }) {
    // Store the operation
    this.pendingOperations.set(id, {
      id,
      resolve,
      reject,
      createdAt: Date.now(),
      state: OperationState.PENDING,
      timeoutMessage
    });
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.handleOperationTimeout(id);
    }, timeout);
    
    this.operationTimeouts.set(id, timeoutId);
  }
  
  /**
   * Handle operation timeout
   * @param {string} id Operation ID
   */
  handleOperationTimeout(id) {
    const operation = this.pendingOperations.get(id);
    
    if (operation && operation.state === OperationState.PENDING) {
      logger.warn(this.MODULE, `Operation ${id} timed out`);
      
      // Update operation state
      operation.state = OperationState.TIMEOUT;
      operation.completedAt = Date.now();
      
      // Reject the promise
      operation.reject(new Error(operation.timeoutMessage || `Operation ${id} timed out`));
      
      // Clean up timeout
      this.operationTimeouts.delete(id);
    }
  }
  
  /**
   * Clean up stale operations to prevent memory leaks
   */
  cleanupStaleOperations() {
    const now = Date.now();
    
    // Only clean up every cleanupInterval
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }
    
    this.lastCleanup = now;
    
    const staleOperations = [];
    
    // Find operations older than 5 minutes
    this.pendingOperations.forEach((operation, id) => {
      if (now - operation.createdAt > 300000) { // 5 minutes
        staleOperations.push(id);
      }
    });
    
    // Clean up stale operations
    staleOperations.forEach(id => {
      logger.debug(this.MODULE, `Cleaning up stale operation: ${id}`);
      
      // Clear timeout if it exists
      if (this.operationTimeouts.has(id)) {
        clearTimeout(this.operationTimeouts.get(id));
        this.operationTimeouts.delete(id);
      }
      
      // Remove operation
      this.pendingOperations.delete(id);
    });
    
    if (staleOperations.length > 0) {
      logger.debug(this.MODULE, `Cleaned up ${staleOperations.length} stale operations`);
    }
  }
  
  /**
   * Get client ID from service worker
   * @returns {Promise<string>} Promise that resolves with client ID
   */
  async getClientId() {
    if (this.clientId) {
      return this.clientId;
    }
    
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      throw new Error('Service worker not available');
    }
    
    const requestId = `client-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.createPendingOperation(requestId, {
        resolve: (clientId) => {
          this.clientId = clientId;
          resolve(clientId);
        },
        reject,
        timeout: 10000,
        timeoutMessage: 'Client ID request timed out'
      });
      
      // Send the request
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CLIENT_ID',
        requestId: requestId
      });
    });
  }
  
  /**
   * Load a list of images using service worker
   * @param {Array} images List of images to load
   * @param {Object} options Additional options
   * @returns {Promise} Promise that resolves when all images are loaded
   */
  async load(images, options = {}) {
    if (!images || !images.length) {
      return Promise.resolve([]);
    }
    
    // Check if service worker is available
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      logger.warn(this.MODULE, 'Service worker not available, falling back to browser strategy');
      return this.browserFallback.load(images, options);
    }
    
    try {
      logger.info(this.MODULE, `Loading ${images.length} images using service worker strategy`);
      
      // Get client ID
      const clientId = await this.getClientId();
      
      // Send cache request to service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_IMAGES',
        images: images,
        clientId: clientId
      });
      
      // Wait for all images to be processed
      const loadPromises = images.map(image => {
        return new Promise((resolve, reject) => {
          this.createPendingOperation(image.id, {
            resolve,
            reject,
            timeout: 60000, // 1 minute timeout per image
            timeoutMessage: `Image ${image.id} loading timed out`
          });
        });
      });
      
      const results = await Promise.allSettled(loadPromises);
      
      logger.info(this.MODULE, `Service worker image loading complete`);
      return results;
      
    } catch (error) {
      logger.error(this.MODULE, 'Error loading images with service worker, falling back to browser strategy:', error);
      return this.browserFallback.load(images, options);
    }
  }
  
  /**
   * Check if an image is cached in service worker
   * @param {string} imageId ID of the image to check
   * @returns {Promise<boolean>} Promise that resolves with true if the image is cached
   */
  async isCached(imageId) {
    // Check our local tracking first
    if (this.loadedImages[imageId]) {
      return Promise.resolve(true);
    }
    
    // For simplicity, assume not cached if we don't have local record
    // In a more complete implementation, we could query the service worker
    return Promise.resolve(false);
  }
  
  /**
   * Get the URL for a cached image
   * @param {string} imageId ID of the image to get
   * @returns {Promise<string>} Promise that resolves with the URL
   */
  async getUrl(imageId) {
    // For service worker cached images, the URL is typically the same as the original
    // The service worker intercepts the fetch and serves from cache
    return Promise.reject(new Error('getUrl not implemented for service worker strategy'));
  }
  
  /**
   * Clear all cached images in service worker
   * @returns {Promise<boolean>} Promise that resolves with true if successful
   */
  async clearCache() {
    logger.info(this.MODULE, 'Clearing service worker image cache');
    
    // Clear local tracking
    this.loadedImages = {};
    
    // Clear cache via service worker
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHES'
      });
    }
    
    return Promise.resolve(true);
  }
  
  /**
   * Dispose of the strategy and cleanup resources
   */
  dispose() {
    logger.info(this.MODULE, 'Disposing service worker image strategy');
    
    // Remove message listener
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.removeEventListener('message', this.boundMessageHandler);
    }
    
    // Clear all pending operations
    this.pendingOperations.forEach((operation, id) => {
      if (this.operationTimeouts.has(id)) {
        clearTimeout(this.operationTimeouts.get(id));
        this.operationTimeouts.delete(id);
      }
    });
    this.pendingOperations.clear();
    
    // Dispose of browser fallback
    if (this.browserFallback && typeof this.browserFallback.dispose === 'function') {
      this.browserFallback.dispose();
    }
    
    // Clear cache
    this.clearCache();
    
    // Call parent dispose
    super.dispose();
  }
}

export default ServiceWorkerImageStrategy; 
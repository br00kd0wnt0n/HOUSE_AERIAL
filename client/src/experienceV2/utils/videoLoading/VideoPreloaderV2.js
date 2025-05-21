/**
 * VideoPreloaderV2.js - Improved video preloader with strategy pattern
 * Uses interchangeable strategies for browser or service worker loading
 */

import ServiceWorkerStrategy from './ServiceWorkerStrategy';
import BrowserStrategy from './BrowserStrategy';
import logger from '../../utils/logger';

// Module name for logging
const MODULE = 'VideoPreloaderV2';

class VideoPreloaderV2 {
  /**
   * Initialize the preloader
   * @param {Function} onProgress Callback for progress reporting
   */
  constructor(onProgress = () => {}) {
    // Main video tracking state
    this.videos = {};
    this.loaded = 0;
    this.total = 0;
    this.onProgress = onProgress;
    this.isInitialized = false;
    
    // Location and video metadata
    this.videosTimestamp = Date.now();
    this.videoVersions = {};
    this.locationVideos = {};
    
    // Status tracking
    this.status = 'idle'; // idle, loading, complete, error
    this.errors = [];
    
    // Initialize strategies
    this.browserStrategy = new BrowserStrategy(this.handleStrategyProgress.bind(this));
    this.serviceWorkerStrategy = new ServiceWorkerStrategy(this.handleStrategyProgress.bind(this));
    
    // Default to browser strategy
    this.currentStrategy = this.browserStrategy;
  }
  
  /**
   * Handle progress events from strategies
   * @param {number} loaded Number of loaded videos
   * @param {number} total Total number of videos
   * @param {Object} details Additional details about progress
   */
  handleStrategyProgress(loaded, total, details) {
    // Update internal state
    if (details?.videoId && this.videos[details.videoId]) {
      this.videos[details.videoId].loaded = details.status === 'loaded';
      this.videos[details.videoId].error = details.error || null;
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
    
    // Update status when all videos are processed
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
   * Preload a single video directly by URL
   * @param {string} id Unique ID for the video
   * @param {string} url URL to the video
   * @param {boolean} useServiceWorker Whether to use service worker strategy
   * @returns {Promise<Object>} Promise resolving to the video object
   */
  async preloadSingleVideo(id, url, useServiceWorker = true) {
    if (!id || !url) {
      return Promise.reject(new Error('ID and URL are required'));
    }
    
    logger.info(MODULE, `Direct preload of video: ${id}`);
    
    // Add video to tracking
    this.videos[id] = {
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
      await this.currentStrategy.load([this.videos[id]]);
      logger.info(MODULE, `Direct preload complete for video: ${id}`);
      return this.videos[id];
    } catch (error) {
      logger.error(MODULE, `Error preloading video ${id}:`, error);
      this.videos[id].error = error.message || 'Failed to preload';
      return Promise.reject(error);
    }
  }
  
  /**
   * Initialize the preloader with videos
   * @param {Object} options Initialization options
   * @returns {VideoPreloaderV2} This instance for chaining
   */
  initialize({ videos = [], locations = {}, resetExisting = true } = {}) {
    // Reset state if requested
    if (resetExisting) {
      this.releaseAll();
    }
    
    this.status = 'initialized';
    this.videosTimestamp = Date.now();
    this.isInitialized = true;
    
    // Process flat video list
    if (videos && videos.length) {
      this.registerVideos(videos);
    }
    
    // Process location-based videos
    if (locations && Object.keys(locations).length) {
      Object.entries(locations).forEach(([locationId, locationVideos]) => {
        // Store location videos map
        this.locationVideos[locationId] = locationVideos.map(video => video.id);
        
        // Tag each video with its location
        const videosWithLocation = locationVideos.map(video => ({
          ...video,
          locationId
        }));
        
        this.registerVideos(videosWithLocation);
      });
    }
    
    logger.info(MODULE, `VideoPreloader initialized with ${this.total} videos`);
    
    // Initial progress callback
    this.onProgress(this.loaded, this.total, {
      status: 'initialized',
      percent: 0
    });
    
    return this;
  }
  
  /**
   * Register videos with the preloader
   * @param {Array} videos List of videos to register
   */
  registerVideos(videos) {
    if (!videos || !videos.length) return;
    
    videos.forEach(video => {
      if (!video.id || !video.url) {
        logger.warn(MODULE, 'Video is missing id or url:', video);
        return;
      }
      
      // Skip if already registered
      if (this.videos[video.id]) {
        return;
      }
      
      // Generate content hash
      const contentHash = this.generateContentHash(video.url, video.lastModified);
      
      // Add to tracking
      this.videos[video.id] = {
        ...video,
        loaded: false,
        error: null,
        version: contentHash
      };
      
      // Store the version mapping
      this.videoVersions[video.id] = contentHash;
      
      // Increment total count
      this.total++;
    });
  }
  
  /**
   * Generate a content hash for version tracking
   * @param {string} url Video URL
   * @param {number|string} lastModified Last modified timestamp
   * @returns {string} Content hash
   */
  generateContentHash(url, lastModified = Date.now()) {
    const hashInput = `${url}:${lastModified}`;
    let hash = 0;
    
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16).substring(0, 8);
  }
  
  /**
   * Start preloading all registered videos
   * @param {Object} options Preload options
   * @returns {Promise} Resolves when all videos are loaded or failed
   */
  async preloadAll({ useServiceWorker = true, locationId = null } = {}) {
    if (!this.isInitialized) {
      logger.error(MODULE, 'VideoPreloader not initialized');
      return Promise.reject('VideoPreloader not initialized');
    }
    
    // Set the appropriate strategy
    this.currentStrategy = useServiceWorker ? 
      this.serviceWorkerStrategy : 
      this.browserStrategy;
    
    // Filter videos by location if provided
    let videosList = Object.values(this.videos);
    
    if (locationId && this.locationVideos[locationId]) {
      const locationVideoIds = this.locationVideos[locationId];
      videosList = videosList.filter(video => locationVideoIds.includes(video.id));
    }
    
    // Skip if no videos to preload
    if (videosList.length === 0) {
      logger.debug(MODULE, 'No videos to preload');
      return Promise.resolve([]);
    }
    
    // Update status
    this.status = 'loading';
    logger.info(MODULE, `Starting to preload ${this.total} videos${locationId ? ` for location ${locationId}` : ''}`);
    
    // Call progress callback
    this.onProgress(this.loaded, videosList.length, {
      status: 'loading',
      percent: 0
    });
    
    try {
      // Start preloading
      return this.currentStrategy.load(videosList, { locationId });
    } catch (error) {
      logger.error(MODULE, 'Error during video preloading:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Start preloading videos for a specific location
   * @param {string} locationId Location ID
   * @param {Object} options Preload options
   * @returns {Promise} Resolves when all location videos are loaded
   */
  async preloadLocation(locationId, options = {}) {
    if (!locationId || !this.locationVideos[locationId]) {
      return Promise.resolve([]);
    }
    
    return this.preloadAll({
      ...options,
      locationId
    });
  }
  
  /**
   * Get a video object by ID
   * @param {string} id Video ID
   * @returns {Object|null} Video object or null if not found
   */
  getVideo(id) {
    return this.videos[id] || null;
  }
  
  /**
   * Get a video URL by ID
   * @param {string} id Video ID
   * @returns {string|null} Video URL or null if not found or not loaded
   */
  getVideoUrl(id) {
    if (!this.videos[id]) {
      return null;
    }
    
    return this.currentStrategy.getUrl(id) || this.videos[id].url;
  }
  
  /**
   * Get all video IDs for a location
   * @param {string} locationId Location ID
   * @returns {Array} List of video IDs for the location
   */
  getLocationVideos(locationId) {
    if (!locationId || !this.locationVideos[locationId]) {
      return [];
    }
    
    return this.locationVideos[locationId];
  }
  
  /**
   * Check if all videos are preloaded (or all for a specific location)
   * @param {string|null} locationId Optional location ID to check
   * @returns {boolean} True if all videos are loaded
   */
  isComplete(locationId = null) {
    // For a specific location
    if (locationId && this.locationVideos[locationId]) {
      const locationVideoIds = this.locationVideos[locationId];
      
      // Check if all videos for this location are loaded
      return locationVideoIds.every(id => 
        this.videos[id] && this.videos[id].loaded
      );
    }
    
    // For all videos
    return this.loaded >= this.total && this.total > 0;
  }
  
  /**
   * Release all video resources
   */
  releaseAll() {
    // Reset state
    this.loaded = 0;
    this.total = 0;
    this.status = 'idle';
    this.errors = [];
    
    // Clear video objects
    this.videos = {};
    this.videoVersions = {};
    this.locationVideos = {};
    
    // Release strategy resources
    this.browserStrategy.clearCache();
    this.serviceWorkerStrategy.clearCache();
  }
  
  /**
   * Dispose the preloader
   */
  dispose() {
    this.releaseAll();
    
    // Clean up strategies
    this.browserStrategy.dispose();
    this.serviceWorkerStrategy.dispose();
  }
}

export default VideoPreloaderV2; 
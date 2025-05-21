// client/src/utils/videoLoader.js - Utility for preloading videos
import axios from 'axios';
import { baseBackendUrl } from './api';

// Create axios instance for video preloading
const videoAxios = axios.create({
  baseURL: baseBackendUrl,
  responseType: 'blob',
  timeout: 30000, // 30 seconds
  headers: {
    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
  }
});

// Helper function to properly format video URLs
const formatVideoUrl = (url) => {
  if (!url) return null;
  
  // Return unchanged if already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Remove any duplicate /api/ prefixes
  let cleanUrl = url;
  if (cleanUrl.startsWith('/api/')) {
    // URL already has /api/ prefix, just append to base URL
    return `${baseBackendUrl}${cleanUrl}`;
  }
  
  // Add /api/ prefix to other URLs
  return cleanUrl.startsWith('/') 
    ? `${baseBackendUrl}/api${cleanUrl}` 
    : `${baseBackendUrl}/api/${cleanUrl}`;
};

// Add request interceptor to log requests
videoAxios.interceptors.request.use(config => {
  const isAbsoluteUrl = config.url.startsWith('http');
  
  if (isAbsoluteUrl) {
    console.log('VideoLoader making request to absolute URL:', config.url);
  } else {
    console.log('VideoLoader making request to:', config.url);
    console.log('VideoLoader full URL:', `${config.baseURL}${config.url}`);
  }
  
  console.log('VideoLoader request headers:', config.headers);
  return config;
}, error => {
  console.error('VideoLoader request error:', error);
  return Promise.reject(error);
});

// Add response interceptor to log responses
videoAxios.interceptors.response.use(response => {
    console.log('VideoLoader response from:', response.config.url, response.status);
    console.log('VideoLoader response headers:', response.headers);
  console.log('VideoLoader response type:', response.headers['content-type']);
  console.log('VideoLoader response size:', response.headers['content-length']);
    return response;
}, error => {
  if (error.response) {
    console.error('VideoLoader response error:', error.response.status, error.config.url);
  } else if (error.request) {
    console.error('VideoLoader request failed:', error.config?.url, error.message);
    } else {
    console.error('VideoLoader error:', error.message);
    }
  
  if (axios.isCancel(error)) {
    console.log('VideoLoader request canceled:', error.config?.url);
  }
  
  return Promise.reject(error);
});

// Class for managing video preloading
class VideoLoader {
  constructor(onProgress) {
    this.videos = {};
    this.loadedCount = 0;
    this.totalCount = 0;
    this.onProgress = onProgress || (() => {});
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.videoLoadTimeout = 30000; // Increased to 30 seconds
    this.cancelTokens = {}; // Track cancel tokens by video key
    this.loadPromises = {}; // Track active load promises
    this.completedSequences = {}; // Track completed hotspot sequences
  }
  
  // Clear all videos and reset state
  clear() {
    // Cancel any pending requests
    Object.keys(this.cancelTokens).forEach(key => {
      if (this.cancelTokens[key]) {
        this.cancelTokens[key].cancel(`Request for ${key} canceled due to loader clear`);
        delete this.cancelTokens[key];
      }
    });
    
    // Reset promises
    this.loadPromises = {};
    
    // Keep completed sequences info
    const completedSequences = this.completedSequences;
    
    // Reset all state except completed sequences
    this.videos = {};
    this.loadedCount = 0;
    this.totalCount = 0;
    
    // Restore completed sequences
    this.completedSequences = completedSequences;
    
    console.log('VideoLoader cleared');
  }
  
  // Clear only non-transition videos to prevent flickering during transitions
  clearNonTransitionVideos() {
    const newVideos = {};
    let keepCount = 0;
    
    // Only keep transition videos
    Object.keys(this.videos).forEach(key => {
      if (key === 'transition' || key.includes('transition')) {
        newVideos[key] = this.videos[key];
        if (this.videos[key].loaded) {
          keepCount++;
        }
      } else {
        // Cancel any pending requests for non-transition videos
        if (this.cancelTokens[key]) {
          this.cancelTokens[key].cancel(`Request for ${key} canceled due to transition`);
          delete this.cancelTokens[key];
        }
        
        // Clear load promises
        delete this.loadPromises[key];
      }
    });
    
    // Update state
    this.videos = newVideos;
    this.loadedCount = keepCount;
    this.totalCount = Object.keys(newVideos).length;
    
    console.log('Cleared non-transition videos, kept transition videos for smooth changes');
  }
  
  // Add a video to be loaded
  add(key, url) {
    // Skip if already added
    if (this.videos[key]) {
      return;
    }
    
    // Format the URL to ensure it's absolute
    const formattedUrl = formatVideoUrl(url);
    
    // Add cache-busting parameter to avoid browser caching
    const finalUrl = formattedUrl.includes('?') ? 
      `${formattedUrl}&nocache=${Date.now()}` : 
      `${formattedUrl}?nocache=${Date.now()}`;
    
    console.log(`Adding video ${key} with URL: ${finalUrl}`);
    
    this.videos[key] = {
      url: finalUrl,
      loaded: false,
      failed: false,
      size: 0,
      blob: null,
      retries: 0
    };
    
    this.totalCount++;
  }
  
  // Check if a video is already loaded
  isLoaded(key) {
    return this.videos[key]?.loaded === true;
  }
  
  // Check if a complete sequence for a hotspot is preloaded
  isSequencePreloaded(hotspotId) {
    return !!this.completedSequences[hotspotId];
  }
  
  // Get all preloaded sequences
  getPreloadedSequences() {
    return Object.keys(this.completedSequences);
  }
  
  // Load a specific video
  async loadVideo(key) {
    // Skip if already loaded or not found
    if (!this.videos[key]) {
      console.log(`Video ${key} not found in loader`);
      return null;
    }
    
    if (this.videos[key].loaded) {
      console.log(`Video ${key} already loaded, skipping`);
      return this.videos[key].blob;
    }
    
    // Check if we're already loading this video
    if (this.loadPromises[key]) {
      console.log(`Video ${key} is already loading, returning existing promise`);
      return this.loadPromises[key];
    }
    
    const video = this.videos[key];
    const videoUrl = video.url;
    
    console.log(`Loading video ${key}: ${videoUrl}`);
    
    // Create a new cancel token for this request
    this.cancelTokens[key] = axios.CancelToken.source();
    
    // Create a promise for this load
    const loadPromise = new Promise(async (resolve, reject) => {
      try {
        // Wrap the request in a timeout promise to handle stalled requests
        const timeoutPromise = new Promise((_, timeoutReject) => {
          setTimeout(() => {
            timeoutReject(new Error(`Video ${key} loading timed out after ${this.videoLoadTimeout}ms`));
          }, this.videoLoadTimeout);
        });
        
        // Race between the actual request and the timeout
        const response = await Promise.race([
          videoAxios.get(videoUrl, {
            cancelToken: this.cancelTokens[key].token,
            responseType: 'blob'
          }),
          timeoutPromise
        ]);
        
        // Store the blob and mark as loaded
        const videoBlob = response.data;
        this.videos[key].blob = videoBlob;
        this.videos[key].loaded = true;
        this.videos[key].size = videoBlob.size;
        this.loadedCount++;
        
        // Update progress
        if (this.onProgress) {
          this.onProgress(this.loadedCount, this.totalCount);
        }
        
        // Clean up the cancel token
        delete this.cancelTokens[key];
        delete this.loadPromises[key];
        
        // Check if this completes a sequence
        this.checkForCompletedSequence(key);
        
        // Return the blob
        resolve(videoBlob);
      } catch (error) {
        // Don't retry if request was canceled
        if (axios.isCancel(error)) {
          console.log(`Request for video ${key} was canceled`);
          // Don't mark as failed if it was canceled - might be reloaded later
          delete this.loadPromises[key];
          resolve(null);
        return;
      }
      
        // Handle errors
        console.error(`Error loading video ${key}:`, error);
        
        // Log the specific video URL that failed
        const videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        videoElement.onerror = (e) => {
          console.error(`Error loading video ${key}:`, e);
          console.error(`Failed URL: ${videoUrl}`);
        };
        
        // Clean up event listener once error is reported
        setTimeout(() => {
          videoElement.onerror = null;
        }, 1000);
        
        // Retry if we haven't exceeded max retries
        if (this.videos[key] && this.videos[key].retries < this.maxRetries) {
          this.videos[key].retries++;
          console.log(`Retrying video ${key} (attempt ${this.videos[key].retries}/${this.maxRetries})...`);
          
          // Clear the cancel token
          delete this.cancelTokens[key];
          
          // Wait before retrying
          await new Promise(res => setTimeout(res, this.retryDelay));
          
          // Clean up the current promise
          delete this.loadPromises[key];
          
          // Retry loading
          try {
            const result = await this.loadVideo(key);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          // Mark as failed after max retries
          if (this.videos[key]) {
            this.videos[key].failed = true;
          }
          
          // Clean up the cancel token and promise
          delete this.cancelTokens[key];
          delete this.loadPromises[key];
          
          // Report loading complete even if failed
          this.loadedCount++;
          if (this.onProgress) {
            this.onProgress(this.loadedCount, this.totalCount);
          }
          
          reject(error);
        }
      }
    });
    
    // Store the promise
    this.loadPromises[key] = loadPromise;
    
    return loadPromise;
  }
  
  // Check if a new key completes a sequence
  checkForCompletedSequence(key) {
    // Check if this is a sequence video
    if (!key || typeof key !== 'string') return;
    
    // Format: [type]_[hotspotId] (e.g., diveIn_123abc)
    const isSequenceVideo = key.includes('_');
    if (!isSequenceVideo) return;
    
    // Extract hotspot ID
    const [, hotspotId] = key.split('_');
    if (!hotspotId) return;
    
    // Check if all parts of the sequence are loaded
    const diveInLoaded = this.isLoaded(`diveIn_${hotspotId}`);
    const floorLevelLoaded = this.isLoaded(`floorLevel_${hotspotId}`);
    const zoomOutLoaded = this.isLoaded(`zoomOut_${hotspotId}`);
    
    // If all videos in the sequence are loaded, mark the sequence as complete
    if (diveInLoaded && floorLevelLoaded && zoomOutLoaded) {
      console.log(`Complete sequence for hotspot ${hotspotId} is now preloaded!`);
      this.completedSequences[hotspotId] = true;
    }
  }
  
  // Preload a subset of videos based on priority
  async preloadVideos(keys) {
    const promises = keys.map(key => this.loadVideo(key));
    return Promise.allSettled(promises);
  }
  
  // Preload all videos
  async preloadAll() {
    const allKeys = Object.keys(this.videos);
    if (allKeys.length === 0) {
      console.log('No videos to preload');
      return;
    }
    
    console.log(`Starting to preload ${allKeys.length} videos`);
    
    // Separate videos by priority
    const transitionVideos = allKeys.filter(key => 
      key === 'transition' || key.includes('transition'));
    
    const sequenceVideos = allKeys.filter(key => 
      key.includes('_') && !key.includes('transition'));
    
    const regularVideos = allKeys.filter(key => 
      !transitionVideos.includes(key) && !sequenceVideos.includes(key));
    
    try {
      // Load transition videos first (highest priority)
      if (transitionVideos.length > 0) {
        console.log(`Preloading ${transitionVideos.length} priority videos (transitions)`);
        await this.preloadVideos(transitionVideos);
      }
      
      // Load sequence videos second (medium priority)
      if (sequenceVideos.length > 0) {
        console.log(`Preloading ${sequenceVideos.length} sequence videos`);
        await this.preloadVideos(sequenceVideos);
      }
      
      // Load regular videos last (lowest priority)
      if (regularVideos.length > 0) {
        console.log(`Preloading ${regularVideos.length} regular videos`);
        await this.preloadVideos(regularVideos);
      }
      
      console.log('All videos loaded or failed to load');
      
      // Check for complete sequences
      const completedSequences = this.getPreloadedSequences();
      console.log(`${completedSequences.length} complete sequences preloaded: ${completedSequences.join(', ')}`);
      
      return completedSequences;
    } catch (error) {
      console.error('Error during preloading:', error);
      return [];
    }
  }
}

export default VideoLoader;

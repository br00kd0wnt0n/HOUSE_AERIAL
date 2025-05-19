// client/src/utils/videoLoader.js - Utility for preloading videos
import axios from 'axios';

// Base URL without /api/ suffix
const BASE_URL = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || '';

// Create axios instance for video preloading
const videoAxios = axios.create({
  baseURL: BASE_URL,
  responseType: 'blob',
  timeout: 30000, // 30 seconds
  headers: {
    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
  }
});

// Add request interceptor for logging
videoAxios.interceptors.request.use(request => {
  // Process URL to avoid duplicate /api/ prefixes
  let url = request.url;
  
  // If URL is already an absolute URL with http, don't modify it
  if (url.startsWith('http')) {
    console.log('VideoLoader making request to absolute URL:', url);
    console.log('VideoLoader request headers:', request.headers);
    return request;
  }
  
  // Ensure URL starts with /api/ but only once
  if (!url.startsWith('/api/')) {
    url = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
  }
  
  // Log the URL but DON'T concatenate with BASE_URL here - axios will do that
  console.log('VideoLoader making request to:', url);
  console.log('VideoLoader full URL:', BASE_URL + url);
  console.log('VideoLoader request headers:', request.headers);
  
  // Update the request URL 
  request.url = url;
  return request;
});

// Add response interceptor for logging
videoAxios.interceptors.response.use(
  response => {
    console.log('VideoLoader response from:', response.config.url, response.status);
    console.log('VideoLoader response headers:', response.headers);
    console.log('VideoLoader response type:', response.data.type);
    console.log('VideoLoader response size:', response.data.size);
    return response;
  },
  error => {
    console.error('VideoLoader request failed:', error.config?.url, error.message);
    if (error.response) {
      console.error('VideoLoader response status:', error.response.status);
      console.error('VideoLoader response headers:', error.response.headers);
      console.error('VideoLoader response data:', error.response.data);
    } else if (error.request) {
      console.error('VideoLoader no response received:', error.request);
    } else {
      console.error('VideoLoader error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// Class for managing video preloading
class VideoLoader {
  constructor(onProgress) {
    this.videos = {};
    this.loadedCount = 0;
    this.totalCount = 0;
    this.onProgress = onProgress || (() => {});
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.videoLoadTimeout = 15000; // 15 seconds per video
  }
  
  // Add a video to be preloaded
  add(key, url) {
    if (!this.videos[key]) {
      // Normalize URL to ensure proper format
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`Adding video ${key} with URL:`, normalizedUrl);
      this.videos[key] = {
        url: normalizedUrl,
        loaded: false,
        element: null,
        blob: null,
        retryCount: 0,
        error: null
      };
      this.totalCount++;
    }
  }
  
  // Normalize URL to ensure proper format
  normalizeUrl(url) {
    if (!url) return '';
    
    // If already an absolute URL, return as is
    if (url.startsWith('http')) return url;
    
    // For consistency, ensure all URLs start with /api/
    if (!url.startsWith('/api/')) {
      url = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
    }
    
    // For direct axios requests, we don't need to append the BASE_URL here
    // as axios will do that automatically
    return url;
  }
  
  // Load a single video with retry logic
  async loadVideo(key, video) {
    try {
      console.log(`Loading video ${key}:`, video.url);
      
      // Add a timeout for the request
      const timeoutId = setTimeout(() => {
        console.warn(`Video ${key} loading timed out after ${this.videoLoadTimeout}ms`);
        // Force abort the axios request if possible
        if (controller) {
          controller.abort();
        }
      }, this.videoLoadTimeout);
      
      // Use AbortController to cancel request if needed
      const controller = new AbortController();
      
      try {
        const response = await videoAxios.get(video.url, {
          signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        const blob = response.data;
        const blobUrl = URL.createObjectURL(blob);
        
        // Create video element
        const element = document.createElement('video');
        element.preload = 'auto';
        
        // Add another timeout for the actual video loading
        const videoLoadTimeoutId = setTimeout(() => {
          console.warn(`Video ${key} metadata loading timed out after ${this.videoLoadTimeout}ms`);
          
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
          
          // Mark as loaded but with error to prevent infinite loading
          video.loaded = true;
          video.error = new Error("Video metadata loading timeout");
          this.loadedCount++;
          
          // Call progress callback
          this.onProgress(this.loadedCount, this.totalCount);
          
        }, this.videoLoadTimeout);
        
        // Set up event listeners
        element.addEventListener('loadeddata', () => {
          // Clear the timeout since the video loaded successfully
          clearTimeout(videoLoadTimeoutId);
          
          video.loaded = true;
          video.blob = blob;
          video.error = null;
          this.loadedCount++;
          
          // Call progress callback
          this.onProgress(this.loadedCount, this.totalCount);
        });
        
        element.addEventListener('error', async (error) => {
          // Clear the timeout to prevent double counting
          clearTimeout(videoLoadTimeoutId);
          
          console.error(`Error loading video ${key}:`, error);
          console.error(`Failed URL:`, video.url);
          
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
          
          // Retry if we haven't exceeded max retries
          if (video.retryCount < this.maxRetries) {
            video.retryCount++;
            console.log(`Retrying video ${key} (attempt ${video.retryCount}/${this.maxRetries})...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            
            // Retry loading the video
            await this.loadVideo(key, video);
          } else {
            video.error = error;
            video.loaded = true; // Mark as "loaded" even though it failed
            this.loadedCount++;
            this.onProgress(this.loadedCount, this.totalCount);
          }
        });
        
        // Start loading
        element.src = blobUrl;
        element.load();
        
        video.element = element;
      } catch (error) {
        // Clear the timeout to prevent double counting
        clearTimeout(timeoutId);
        
        // Handle abort errors specially
        if (error.name === 'AbortError') {
          console.warn(`Video ${key} loading was aborted due to timeout`);
          throw new Error('Video loading timeout');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error preloading video ${key}:`, error);
      console.error(`Failed URL:`, video.url);
      
      // Retry if we haven't exceeded max retries
      if (video.retryCount < this.maxRetries) {
        video.retryCount++;
        console.log(`Retrying video ${key} (attempt ${video.retryCount}/${this.maxRetries})...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Retry loading the video
        await this.loadVideo(key, video);
      } else {
        video.error = error;
        video.loaded = true; // Mark as "loaded" even though it failed
        this.loadedCount++;
        this.onProgress(this.loadedCount, this.totalCount);
      }
    }
  }
  
  // Check if a video is already loaded
  isLoaded(key) {
    return this.videos[key]?.loaded === true && !this.videos[key]?.error;
  }
  
  // Get list of all loaded video keys
  getLoadedVideos() {
    return Object.keys(this.videos).filter(key => 
      this.videos[key].loaded && !this.videos[key].error
    );
  }
  
  // Get list of all videos that failed to load
  getFailedVideos() {
    return Object.keys(this.videos).filter(key => 
      this.videos[key].loaded && this.videos[key].error
    );
  }
  
  // Update on preload progress
  _updateProgress() {
    if (this.onProgress) {
      this.onProgress(this.loadedCount, this.totalCount);
    }
  }

  // Check if a hotspot's sequence is fully preloaded
  isSequencePreloaded(hotspotId) {
    // Check if all three videos in the sequence are loaded
    return this.isLoaded(`diveIn_${hotspotId}`) && 
           this.isLoaded(`floorLevel_${hotspotId}`) && 
           this.isLoaded(`zoomOut_${hotspotId}`);
  }

  // Get all preloaded hotspot sequences
  getPreloadedSequences() {
    // Extract hotspot IDs from loaded video keys
    const loadedVideos = this.getLoadedVideos();
    const hotspotIds = new Set();
    
    loadedVideos.forEach(key => {
      // Extract hotspot ID from key patterns like 'diveIn_123456'
      const match = key.match(/^(diveIn|floorLevel|zoomOut)_(.+)$/);
      if (match && match[2]) {
        hotspotIds.add(match[2]);
      }
    });
    
    // Filter to only include hotspots with all 3 videos loaded
    return Array.from(hotspotIds).filter(id => this.isSequencePreloaded(id));
  }

  // Ensure all videos get loaded even if timeout occurs
  async preloadAll() {
    return new Promise((resolve) => {
      if (Object.keys(this.videos).length === 0) {
        resolve(this.videos);
        return;
      }
      
      console.log(`Starting to preload ${Object.keys(this.videos).length} videos`);
      
      // Set up a global timeout
      const globalTimeout = setTimeout(() => {
        console.warn('Video preloading timed out globally, continuing with what we have');
        // Mark all unloaded videos as "loaded" to prevent waiting
        Object.keys(this.videos).forEach(key => {
          const video = this.videos[key];
          if (!video.loaded) {
            video.loaded = true;
            video.error = new Error('Global timeout');
            this.loadedCount++;
          }
        });
        this._updateProgress();
        
        // Log status of all videos
        const loadedCount = this.getLoadedVideos().length;
        const failedCount = this.getFailedVideos().length;
        const pendingCount = Object.keys(this.videos).length - loadedCount - failedCount;
        
        console.log(`Preloading status: ${loadedCount} loaded, ${failedCount} failed, ${pendingCount} pending`);
        
        // Log preloaded sequences
        const sequences = this.getPreloadedSequences();
        console.log(`${sequences.length} complete sequences preloaded: ${sequences.join(', ')}`);
        
        resolve(this.videos);
      }, 30000); // 30 second global timeout
      
      // Load all videos in parallel
      const loadPromises = Object.entries(this.videos).map(([key, video]) => 
        this.loadVideo(key, video)
      );
      
      // Wait for all videos to either load or fail
      Promise.all(loadPromises)
        .then(() => {
          clearTimeout(globalTimeout);
          console.log('All videos loaded or failed to load');
          
          // Log preloaded sequences
          const sequences = this.getPreloadedSequences();
          console.log(`${sequences.length} complete sequences preloaded: ${sequences.join(', ')}`);
          
          resolve(this.videos);
        })
        .catch(error => {
          clearTimeout(globalTimeout);
          console.error('Error during video preloading:', error);
          resolve(this.videos);
        });
    });
  }
  
  // Get a preloaded video by key
  get(key) {
    const video = this.videos[key];
    if (!video) return null;
    
    if (video.error) {
      console.warn(`Video ${key} failed to load:`, video.error);
      return null;
    }
    
    return video.element;
  }
  
  // Check if a video failed to load
  hasError(key) {
    return this.videos[key]?.error != null;
  }
  
  // Get loading progress
  getProgress() {
    if (this.totalCount === 0) return 100;
    return Math.floor((this.loadedCount / this.totalCount) * 100);
  }
  
  // Clear all videos
  clear() {
    Object.keys(this.videos).forEach(key => {
      const video = this.videos[key];
      if (video.element) {
        const src = video.element.src;
        video.element.src = '';
        video.element.load();
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
      }
      if (video.blob) {
        video.blob = null;
      }
    });
    
    this.videos = {};
    this.loadedCount = 0;
    this.totalCount = 0;
  }
}

export default VideoLoader;

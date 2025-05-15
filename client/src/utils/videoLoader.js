// client/src/utils/videoLoader.js - Utility for preloading videos
import axios from 'axios';

// Create axios instance for video preloading
const videoAxios = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  responseType: 'blob',
  timeout: 30000, // 30 seconds
  headers: {
    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
  }
});

// Add request interceptor for logging
videoAxios.interceptors.request.use(request => {
  // Remove baseURL from the URL if it's already included
  const url = request.url.startsWith(request.baseURL) 
    ? request.url.slice(request.baseURL.length) 
    : request.url;
  
  console.log('VideoLoader making request to:', url);
  console.log('VideoLoader full URL:', request.baseURL + url);
  console.log('VideoLoader request headers:', request.headers);
  
  // Update the request URL to avoid double baseURL
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
  }
  
  // Add a video to be preloaded
  add(key, url) {
    if (!this.videos[key]) {
      console.log(`Adding video ${key} with URL:`, url);
      this.videos[key] = {
        url,
        loaded: false,
        element: null,
        blob: null,
        retryCount: 0,
        error: null
      };
      this.totalCount++;
    }
  }
  
  // Load a single video with retry logic
  async loadVideo(key, video) {
    try {
      console.log(`Loading video ${key}:`, video.url);
      
      const response = await videoAxios.get(video.url);
      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      
      // Create video element
      const element = document.createElement('video');
      element.preload = 'auto';
      
      // Set up event listeners
      element.addEventListener('loadeddata', () => {
        video.loaded = true;
        video.blob = blob;
        video.error = null;
        this.loadedCount++;
        
        // Call progress callback
        this.onProgress(this.loadedCount, this.totalCount);
      });
      
      element.addEventListener('error', async (error) => {
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
          this.loadedCount++;
          this.onProgress(this.loadedCount, this.totalCount);
        }
      });
      
      // Start loading
      element.src = blobUrl;
      element.load();
      
      video.element = element;
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
        this.loadedCount++;
        this.onProgress(this.loadedCount, this.totalCount);
      }
    }
  }
  
  // Start preloading all videos
  async preloadAll() {
    return new Promise((resolve) => {
      if (Object.keys(this.videos).length === 0) {
        resolve(this.videos);
        return;
      }
      
      // Load all videos in parallel
      const loadPromises = Object.entries(this.videos).map(([key, video]) => 
        this.loadVideo(key, video)
      );
      
      // Wait for all videos to either load or fail
      Promise.all(loadPromises)
        .then(() => {
          console.log('All videos loaded or failed to load');
          resolve(this.videos);
        })
        .catch(error => {
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
  
  // Check if a video is loaded
  isLoaded(key) {
    return this.videos[key]?.loaded || false;
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

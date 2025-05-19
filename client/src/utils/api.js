// client/src/utils/api.js - API client for backend communication

import axios from 'axios';

// Create axios instance with base config
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Ensure a consistent backend URL to use in other places
export const baseBackendUrl = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || '';

// Add request interceptor for logging and error handling
instance.interceptors.request.use(
  request => {
    console.log('Making request to:', request.url);
    console.log('Full URL:', request.baseURL + request.url);
    return request;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and error handling
instance.interceptors.response.use(
  response => {
    console.log('Received API response from:', response.config.url);
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with an error status
      console.error('API error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received for request:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Format video URLs to ensure they have the proper prefix
export const formatVideoUrl = (url) => {
  if (!url) return null;
  
  // Skip if already a full URL
  if (url.startsWith('http')) return url;
  
  if (url.startsWith('/api/')) {
    // URL already has /api/ prefix, just append to base URL
    return `${baseBackendUrl}${url}`;
  }
  
  // Add /api/ prefix to other URLs
  return url.startsWith('/') 
    ? `${baseBackendUrl}/api${url}` 
    : `${baseBackendUrl}/api/${url}`;
};

// API methods
const api = {
  instance, // Export the instance
  
  // Authentication endpoints
  getAuthStatus: () => instance.get('/auth/status'),
  initializePassword: (password) => instance.post('/auth/initialize', { password }),
  login: (password) => instance.post('/auth/login', { password }),
  changePassword: (currentPassword, newPassword) => 
    instance.post('/auth/change-password', { currentPassword, newPassword }),
  
  // Location endpoints
  getLocations: () => instance.get('/locations'),
  getLocation: (id) => instance.get(`/locations/${id}`),
  createLocation: (data) => instance.post('/locations', data),
  updateLocation: (id, data) => instance.put(`/locations/${id}`, data),
  deleteLocation: (id) => instance.delete(`/locations/${id}`),
  
  // Asset endpoints
  getAssets: (type, locationId) => {
    let url = '/assets';
    const params = {};
    if (type) params.type = type;
    if (locationId) params.location = locationId;
    return instance.get(url, { params });
  },
  getAssetsByType: async (type, locationId = null) => {
    try {
      const response = await instance.get('/assets', {
        params: {
          type: type,
          location: locationId
        }
      });
      
      // Process all assets to ensure proper URLs for the frontend
      response.data = response.data.map(asset => {
        // Make sure we have a properly formatted accessUrl
        if (asset.accessUrl && asset.accessUrl.startsWith('/api/')) {
          return asset;
        }
        
        // If for some reason accessUrl is not properly formatted, generate it
        if (asset.accessUrl) {
          // Use baseBackendUrl when constructing absolute URLs
          asset.accessUrl = asset.accessUrl.startsWith('/') ? 
            `${baseBackendUrl}${asset.accessUrl.startsWith('/api/') ? asset.accessUrl : `/api${asset.accessUrl}`}` : 
            `${baseBackendUrl}/api/assets/file/${asset.accessUrl}`;
        }
        
        return asset;
      });
      
      return response;
    } catch (error) {
      console.error(`Error fetching ${type} assets:`, error);
      throw error;
    }
  },
  getAsset: (id) => instance.get(`/assets/${id}`),
  getAssetById: async (id) => {
    try {
      if (!id) {
        console.error("Cannot fetch asset - missing id");
        return { data: null };
      }
      
      console.log(`Fetching asset by ID: ${id}`);
      
      // Add retry logic for network issues
      const maxRetries = 3;
      let retries = 0;
      let response;
      
      while (retries < maxRetries) {
        try {
          response = await instance.get(`/assets/${id}`);
          break; // If successful, exit the retry loop
        } catch (error) {
          retries++;
          const currentRetries = retries; // Store in local constant to avoid closure issues
          console.warn(`Attempt ${currentRetries}/${maxRetries} failed for asset ID ${id}: ${error.message}`);
          
          if (currentRetries >= maxRetries) {
            throw error; // Re-throw after max retries
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, currentRetries - 1)));
        }
      }
      
      // Check if we have a valid response
      if (!response || !response.data) {
        console.error(`No data received for asset ID: ${id}`);
        return { data: null };
      }
      
      // Ensure the asset has a properly formatted accessUrl
      const asset = response.data;
      if (asset) {
        console.log(`Fetched asset: ${asset.name}, type: ${asset.type}, accessUrl: ${asset.accessUrl}`);
        
        if (asset.accessUrl) {
          // Make sure we have a properly formatted accessUrl
          if (!asset.accessUrl.startsWith('/api/') && !asset.accessUrl.startsWith('http')) {
            // Use baseBackendUrl when constructing absolute URLs
            const originalUrl = asset.accessUrl;
            asset.accessUrl = asset.accessUrl.startsWith('/') ? 
              `${baseBackendUrl}${asset.accessUrl.startsWith('/api/') ? asset.accessUrl : `/api${asset.accessUrl}`}` : 
              `${baseBackendUrl}/api/assets/file/${asset.type}/${asset.accessUrl}`;
            
            console.log(`Reformatted asset URL from ${originalUrl} to ${asset.accessUrl}`);
          }
        } else {
          console.error(`Asset ${asset.name} (${id}) has no accessUrl - this will cause display issues`);
        }
      } else {
        console.warn(`No asset data returned for ID: ${id}`);
      }
      
      return { data: asset };
    } catch (error) {
      console.error(`Error fetching asset by ID ${id}:`, error);
      const errorMsg = error.response ? 
        `Status: ${error.response.status}, Message: ${error.response.data?.error || 'Unknown error'}` : 
        `Network error: ${error.message}`;
      console.error(`Detailed error for asset ID ${id}: ${errorMsg}`);
      
      // Return a structured error rather than throwing
      return { 
        data: null, 
        error: true, 
        message: errorMsg,
        originalError: error
      };
    }
  },
  createAsset: (formData) => instance.post('/assets', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  updateAsset: (id, formData) => instance.put(`/assets/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  deleteAsset: (id) => instance.delete(`/assets/${id}`),

  // Hotspot endpoints
  getHotspots: () => instance.get('/hotspots'),
  getHotspotsByLocation: (locationId) => instance.get('/hotspots', {
    params: { location: locationId }
  }),
  getHotspot: (id) => instance.get(`/hotspots/${id}`),
  createHotspot: (data) => instance.post('/hotspots', data),
  updateHotspot: (id, data) => instance.put(`/hotspots/${id}`, data),
  deleteHotspot: (id) => instance.delete(`/hotspots/${id}`),

  // Playlist endpoints
  getPlaylists: () => instance.get('/playlists'),
  getPlaylist: (id) => instance.get(`/playlists/${id}`),
  getPlaylistByHotspot: (hotspotId) => instance.get(`/playlists/hotspot/${hotspotId}`),
  createPlaylist: (data) => instance.post('/playlists', data),
  updatePlaylist: (id, data) => instance.put(`/playlists/${id}`, data),
  deletePlaylist: (id) => instance.delete(`/playlists/${id}`),

  // Analytics endpoints
  trackEvent: (data) => instance.post('/analytics/events', data),
  getEvents: () => instance.get('/analytics/events'),
};

export default api;

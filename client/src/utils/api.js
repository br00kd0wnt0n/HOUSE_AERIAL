// client/src/utils/api.js - API client for backend communication

import axios from 'axios';

// Create axios instance with base URL
export const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

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
    console.log('Response from:', response.config.url, response.status);
    return response;
  },
  error => {
    console.error('Request failed:', error.config?.url, error.message);
    
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      error.message = 'Request timed out. Please try again.';
    } else if (!error.response) {
      console.error('Network error - no response received');
      error.message = 'Network error. Please check your connection.';
    } else if (error.response.status === 404) {
      console.error('Resource not found');
      error.message = 'Resource not found. Please check the URL.';
    } else if (error.response.status === 500) {
      console.error('Server error');
      error.message = 'Server error. Please try again later.';
    }
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Add server error message if available
      if (error.response.data?.error) {
        error.message = error.response.data.error;
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to transform s3Key to local URL
export const getVideoUrl = (s3Key) => {
  if (!s3Key) return null;
  
  // Remove 'assets/' prefix if present
  const path = s3Key.startsWith('assets/') ? s3Key.slice(7) : s3Key;
  
  // Split into type and filename
  const [type, ...filenameParts] = path.split('/');
  const filename = filenameParts.join('/');
  
  // Encode the filename to handle spaces and special characters
  const encodedFilename = encodeURIComponent(filename);
  
  // Construct the URL with encoded filename
  const url = `/assets/file/${type}/${encodedFilename}`;
  console.log('Transformed URL:', url);
  
  return url;
};

// API methods
const api = {
  instance, // Export the instance
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
      // Transform the URLs for video assets
      if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(type)) {
        response.data = response.data.map(asset => ({
          ...asset,
          s3Key: getVideoUrl(asset.s3Key)
        }));
      }
      return response;
    } catch (error) {
      console.error(`Error fetching ${type} assets:`, error);
      throw error;
    }
  },
  getAsset: (id) => instance.get(`/assets/${id}`),
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
  syncAssetsWithS3: () => instance.get('/assets/sync'),

  // Hotspot endpoints
  getHotspots: (locationId, type) => {
    let url = '/hotspots';
    const params = {};
    if (locationId) params.location = locationId;
    if (type) params.type = type;
    return instance.get(url, { params });
  },
  getHotspotsByLocation: (locationId) => instance.get(`/hotspots/location/${locationId}`),
  getHotspot: (id) => instance.get(`/hotspots/${id}`),
  createHotspot: (data) => instance.post('/hotspots', data),
  updateHotspot: (id, data) => instance.put(`/hotspots/${id}`, data),
  deleteHotspot: (id) => instance.delete(`/hotspots/${id}`),

  // Playlist endpoints
  getPlaylists: (locationId, hotspotId) => {
    let url = '/playlists';
    const params = {};
    if (locationId) params.location = locationId;
    if (hotspotId) params.hotspot = hotspotId;
    return instance.get(url, { params });
  },
  getPlaylistsByLocation: (locationId) => instance.get(`/playlists/location/${locationId}`),
  getPlaylistByHotspot: (hotspotId) => instance.get(`/playlists/hotspot/${hotspotId}`),
  getPlaylist: (id) => instance.get(`/playlists/${id}`),
  createPlaylist: (data) => instance.post('/playlists', data),
  updatePlaylist: (id, data) => instance.put(`/playlists/${id}`, data),
  deletePlaylist: (id) => instance.delete(`/playlists/${id}`)
};

export default api;

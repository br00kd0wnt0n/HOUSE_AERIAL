/**
 * dataLayer.js - Shared data access layer for the Netflix House Aerial Experience
 * 
 * This file provides a central point for all data access in the application,
 * preventing duplicate API calls and implementing caching and request deduplication.
 */

import api from '../../utils/api';
import logger from './logger';

// Module name for logging
const MODULE = 'DataLayer';

// Cache for API responses
const cache = {
  locations: null,
  assets: {},
  hotspots: {},
  playlists: {}
};

// Request tracking to prevent duplicate in-flight requests
const pendingRequests = {};

/**
 * Generate a cache key for a request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @returns {string} Cache key
 */
const getCacheKey = (endpoint, params = {}) => {
  return `${endpoint}:${JSON.stringify(params)}`;
};

/**
 * Make an API request with deduplication and caching
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @param {Object} options - Request options
 * @param {boolean} options.useCache - Whether to use and update cache
 * @param {boolean} options.forceRefresh - Whether to force a refresh from API
 * @returns {Promise<Object>} API response
 */
const makeRequest = async (endpoint, params = {}, options = {}) => {
  const { useCache = true, forceRefresh = false } = options;
  const cacheKey = getCacheKey(endpoint, params);
  
  // Check cache first unless forced refresh
  if (useCache && !forceRefresh && cache[endpoint] !== undefined) {
    if (Object.keys(params).length === 0 && cache[endpoint] !== null) {
      logger.debug(MODULE, `Using cached data for ${endpoint}`);
      return cache[endpoint];
    }
    
    if (params.id && cache[endpoint][params.id]) {
      logger.debug(MODULE, `Using cached data for ${endpoint}/${params.id}`);
      return cache[endpoint][params.id];
    }
    
    // Special case for location-based endpoints
    if (params.locationId && cache[endpoint][params.locationId]) {
      logger.debug(MODULE, `Using cached data for ${endpoint} by location/${params.locationId}`);
      return cache[endpoint][params.locationId];
    }
  }
  
  // Check if this exact request is already in flight
  if (pendingRequests[cacheKey]) {
    logger.debug(MODULE, `Reusing pending request for ${endpoint}`);
    return pendingRequests[cacheKey];
  }
  
  // Make the API request - how we call the API depends on the endpoint
  // as some endpoints expect positional parameters, not an object
  try {
    logger.debug(MODULE, `Making API request to ${endpoint}`);
    
    // Choose how to call the API based on the endpoint
    // This is necessary because the API methods have different signatures
    let apiPromise;
    
    // Handle special cases for different API methods
    if (endpoint === 'getAssetsByType') {
      apiPromise = api.getAssetsByType(params.type, params.locationId);
    } else if (endpoint === 'getHotspotsByLocation') {
      apiPromise = api.getHotspotsByLocation(params.locationId);
    } else if (endpoint === 'getPlaylistByHotspot') {
      apiPromise = api.getPlaylistByHotspot(params.hotspotId);
    } else if (endpoint === 'getLocation' || endpoint === 'getHotspot' || endpoint === 'getPlaylist') {
      apiPromise = api[endpoint](params.id);
    } else {
      // For methods that don't need special handling
      apiPromise = api[endpoint](params);
    }
    
    pendingRequests[cacheKey] = apiPromise;
    const response = await pendingRequests[cacheKey];
    
    // Check for valid response format
    if (!response || typeof response !== 'object') {
      logger.error(MODULE, `Invalid response from ${endpoint}: not an object`);
      delete pendingRequests[cacheKey];
      return [];
    }
    
    // Ensure data property exists (most API responses have this format)
    const responseData = response.data || response;
    
    // Validate array responses for collection endpoints
    if (endpoint.startsWith('get') && !endpoint.includes('By') && !endpoint.endsWith('ById') && !endpoint.endsWith('ByLocation')) {
      // For collection endpoints, ensure the response is an array
      if (!Array.isArray(responseData)) {
        logger.error(MODULE, `Invalid collection response from ${endpoint}: not an array`);
        delete pendingRequests[cacheKey];
        return [];
      }
    }
    
    // Update cache
    if (useCache) {
      if (Object.keys(params).length === 0) {
        cache[endpoint] = responseData;
      } else if (params.id) {
        if (!cache[endpoint]) cache[endpoint] = {};
        cache[endpoint][params.id] = responseData;
      } else if (params.locationId) {
        if (!cache[endpoint]) cache[endpoint] = {};
        cache[endpoint][params.locationId] = responseData;
      }
    }
    
    // Clean up pending request
    delete pendingRequests[cacheKey];
    
    // Return the expected data structure - mostly always response.data
    return responseData;
  } catch (error) {
    // Clean up pending request on error
    delete pendingRequests[cacheKey];
    logger.error(MODULE, `Error in ${endpoint} request:`, error);
    throw error;
  }
};

/**
 * Clear specific cache entries or all cache
 * @param {string|null} endpoint - Specific endpoint to clear, or null for all
 * @param {string|null} id - Specific ID to clear, or null for all items in endpoint
 */
export const clearCache = (endpoint = null, id = null) => {
  if (!endpoint) {
    // Clear all cache
    Object.keys(cache).forEach(key => {
      cache[key] = typeof cache[key] === 'object' ? {} : null;
    });
    logger.info(MODULE, 'Cleared all cache');
    return;
  }
  
  if (!id) {
    // Clear specific endpoint
    if (typeof cache[endpoint] === 'object') {
      cache[endpoint] = {};
    } else {
      cache[endpoint] = null;
    }
    logger.info(MODULE, `Cleared cache for ${endpoint}`);
    return;
  }
  
  // Clear specific ID in endpoint
  if (typeof cache[endpoint] === 'object' && cache[endpoint][id]) {
    delete cache[endpoint][id];
    logger.info(MODULE, `Cleared cache for ${endpoint}/${id}`);
  }
};

// API methods with deduplication and caching
const dataLayer = {
  // Locations
  getLocations: async (forceRefresh = false) => {
    return makeRequest('getLocations', {}, { forceRefresh });
  },
  
  getLocation: async (id, forceRefresh = false) => {
    return makeRequest('getLocation', { id }, { forceRefresh });
  },
  
  // Assets
  getAssets: async (forceRefresh = false) => {
    return makeRequest('getAssets', {}, { forceRefresh });
  },
  
  getAssetsByType: async (type, locationId = null, forceRefresh = false) => {
    return makeRequest('getAssetsByType', { type, locationId }, { forceRefresh });
  },
  
  // Hotspots
  getHotspots: async (forceRefresh = false) => {
    return makeRequest('getHotspots', {}, { forceRefresh });
  },
  
  getHotspotsByLocation: async (locationId, forceRefresh = false) => {
    if (!locationId) {
      logger.error(MODULE, 'Cannot get hotspots - missing locationId');
      return [];
    }
    
    try {
      // Check cache first (properly this time)
      const cacheKey = getCacheKey('getHotspotsByLocation', { locationId });
      
      // If we have cached data and not forcing refresh, use it
      if (!forceRefresh && cache.hotspots && cache.hotspots[locationId]) {
        logger.debug(MODULE, `Using cached hotspots for location: ${locationId}`);
        return cache.hotspots[locationId];
      }
      
      // If there's already a request in flight, reuse it
      if (pendingRequests[cacheKey]) {
        logger.debug(MODULE, `Reusing pending hotspots request for location: ${locationId}`);
        return pendingRequests[cacheKey];
      }
      
      // Only log at debug level in production to reduce noise
      if (process.env.NODE_ENV !== 'production') {
        logger.info(MODULE, `Requesting hotspots for location: ${locationId}`);
      } else {
        logger.debug(MODULE, `Requesting hotspots for location: ${locationId}`);
      }
      
      // Make the request
      const apiPromise = api.getHotspotsByLocation(locationId);
      
      // Store in pendingRequests for deduplication
      pendingRequests[cacheKey] = apiPromise;
      
      const response = await apiPromise;
      delete pendingRequests[cacheKey];
      
      // For logging only - use debug level in production
      if (process.env.NODE_ENV !== 'production') {
        if (response) {
          logger.debug(MODULE, `Got hotspots response type: ${typeof response}, isArray: ${Array.isArray(response)}`);
          if (Array.isArray(response)) {
            logger.info(MODULE, `Found ${response.length} hotspots from API for location ${locationId}`);
          }
        }
      }
      
      // Ensure we have an array to work with
      const hotspots = Array.isArray(response) ? response : [];
      
      // Validate hotspots
      const validHotspots = hotspots.filter(hotspot => 
        hotspot && 
        hotspot._id && 
        hotspot.centerPoint &&
        hotspot.coordinates &&
        Array.isArray(hotspot.coordinates) &&
        hotspot.coordinates.length >= 3
      );
      
      // Update cache
      if (!cache.hotspots) cache.hotspots = {};
      cache.hotspots[locationId] = validHotspots.length > 0 ? validHotspots : hotspots;
      
      if (validHotspots.length === 0 && hotspots.length > 0) {
        logger.warn(MODULE, `Found ${hotspots.length} hotspots for location ${locationId}, but none have valid coordinates`);
      }
      
      return validHotspots.length > 0 ? validHotspots : hotspots;
    } catch (error) {
      logger.error(MODULE, `Error fetching hotspots for location ${locationId}:`, error);
      return [];
    }
  },
  
  // Playlists
  getPlaylists: async (forceRefresh = false) => {
    return makeRequest('getPlaylists', {}, { forceRefresh });
  },
  
  getPlaylistByHotspot: async (hotspotId, forceRefresh = false) => {
    return makeRequest('getPlaylistByHotspot', { hotspotId }, { forceRefresh });
  },
  
  // Utility methods
  clearCache
};

export default dataLayer; 
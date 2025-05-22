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

// Cache configuration
const CACHE_CONFIG = {
  MAX_ENTRIES_PER_TYPE: 50,  // Maximum entries per cache type
  EXPIRY_TIME: 5 * 60 * 1000 // Cache expiration time: 5 minutes
};

// Cache for API responses with timestamps
const cache = {
  locations: { data: null, timestamp: 0 },
  assets: { data: {}, timestamp: 0, entries: 0 },
  hotspots: { data: {}, timestamp: 0, entries: 0 },
  playlists: { data: {}, timestamp: 0, entries: 0 }
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
 * Check if cached data is still valid
 * @param {Object} cacheEntry - Cache entry with data and timestamp
 * @returns {boolean} True if cache is valid
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_CONFIG.EXPIRY_TIME;
};

/**
 * Check cache for a specific request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @param {boolean} forceRefresh - Whether to force refresh from API
 * @returns {Object|null} Cached data or null if not found
 */
const checkCache = (endpoint, params = {}, forceRefresh = false) => {
  // Skip cache if forced refresh
  if (forceRefresh) return null;
  
  // Handle root-level endpoints
  if (Object.keys(params).length === 0) {
    if (cache[endpoint]?.data !== null && isCacheValid(cache[endpoint])) {
      logger.debug(MODULE, `Using cached data for ${endpoint}`);
      return cache[endpoint].data;
    }
    return null;
  }
  
  // Handle ID-based requests
  if (params.id && cache[endpoint]?.data?.[params.id]) {
    if (isCacheValid(cache[endpoint])) {
      logger.debug(MODULE, `Using cached data for ${endpoint}/${params.id}`);
      return cache[endpoint].data[params.id];
    }
  }
  
  // Handle location-based requests
  if (params.locationId && cache[endpoint]?.data?.[params.locationId]) {
    if (isCacheValid(cache[endpoint])) {
      logger.debug(MODULE, `Using cached data for ${endpoint} by location/${params.locationId}`);
      return cache[endpoint].data[params.locationId];
    }
  }
  
  return null;
};

/**
 * Make the appropriate API call based on endpoint and parameters
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response
 */
const makeApiCall = async (endpoint, params = {}) => {
  logger.debug(MODULE, `Making API request to ${endpoint}`);
  
  // Choose how to call the API based on the endpoint
  // This is necessary because the API methods have different signatures
  switch (endpoint) {
    case 'getAssetsByType':
      return api.getAssetsByType(params.type, params.locationId);
    case 'getHotspotsByLocation':
      return api.getHotspotsByLocation(params.locationId);
    case 'getPlaylistByHotspot':
      return api.getPlaylistByHotspot(params.hotspotId);
    case 'getLocation':
    case 'getHotspot':
    case 'getPlaylist':
      return api[endpoint](params.id);
    default:
      // For methods that don't need special handling
      return api[endpoint](params);
  }
};

/**
 * Validate API response format
 * @param {Object} response - API response
 * @param {string} endpoint - API endpoint
 * @returns {Object|Array} Validated response data
 */
const validateResponse = (response, endpoint) => {
  // Check for valid response format
  if (!response || typeof response !== 'object') {
    logger.error(MODULE, `Invalid response from ${endpoint}: not an object`);
    return [];
  }
  
  // Ensure data property exists (most API responses have this format)
  const responseData = response.data || response;
  
  // Validate array responses for collection endpoints
  if (endpoint.startsWith('get') && 
      !endpoint.includes('By') && 
      !endpoint.endsWith('ById') && 
      !endpoint.endsWith('ByLocation')) {
    // For collection endpoints, ensure the response is an array
    if (!Array.isArray(responseData)) {
      logger.error(MODULE, `Invalid collection response from ${endpoint}: not an array`);
      return [];
    }
  }
  
  return responseData;
};

/**
 * Update cache with new data
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @param {Object} data - Data to cache
 */
const updateCache = (endpoint, params = {}, data) => {
  const now = Date.now();
  
  // For root-level endpoints (like getLocations)
  if (Object.keys(params).length === 0) {
    cache[endpoint] = { data, timestamp: now };
    return;
  }
  
  // For ID or location-based endpoints
  if (!cache[endpoint]) {
    cache[endpoint] = { data: {}, timestamp: now, entries: 0 };
  }
  
  // Update timestamp on the cache group
  cache[endpoint].timestamp = now;
  
  // Add or update specific entry
  if (params.id) {
    // Check if this is a new entry
    if (!cache[endpoint].data[params.id]) {
      cache[endpoint].entries++;
    }
    cache[endpoint].data[params.id] = data;
  } else if (params.locationId) {
    // Check if this is a new entry
    if (!cache[endpoint].data[params.locationId]) {
      cache[endpoint].entries++;
    }
    cache[endpoint].data[params.locationId] = data;
  }
  
  // Enforce cache size limits
  if (cache[endpoint].entries > CACHE_CONFIG.MAX_ENTRIES_PER_TYPE) {
    // Simple approach: just remove random entries until under limit
    // A more sophisticated approach would track individual timestamps
    const keysToRemove = Object.keys(cache[endpoint].data).slice(0, 
      cache[endpoint].entries - CACHE_CONFIG.MAX_ENTRIES_PER_TYPE);
    
    keysToRemove.forEach(key => {
      delete cache[endpoint].data[key];
      cache[endpoint].entries--;
    });
  }
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
  if (useCache) {
    const cachedData = checkCache(endpoint, params, forceRefresh);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // Check if this exact request is already in flight
  if (pendingRequests[cacheKey]) {
    logger.debug(MODULE, `Reusing pending request for ${endpoint}`);
    return pendingRequests[cacheKey];
  }
  
  // Make the API request
  try {
    // Store promise in pending requests
    pendingRequests[cacheKey] = makeApiCall(endpoint, params)
      .then(response => validateResponse(response, endpoint));
    
    const responseData = await pendingRequests[cacheKey];
    
    // Update cache
    if (useCache) {
      updateCache(endpoint, params, responseData);
    }
    
    // Clean up pending request
    delete pendingRequests[cacheKey];
    
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
      if (typeof cache[key].data === 'object') {
        cache[key] = { data: {}, timestamp: 0, entries: 0 };
      } else {
        cache[key] = { data: null, timestamp: 0 };
      }
    });
    logger.info(MODULE, 'Cleared all cache');
    return;
  }
  
  if (!id) {
    // Clear specific endpoint
    if (typeof cache[endpoint]?.data === 'object') {
      cache[endpoint] = { data: {}, timestamp: 0, entries: 0 };
    } else {
      cache[endpoint] = { data: null, timestamp: 0 };
    }
    logger.info(MODULE, `Cleared cache for ${endpoint}`);
    return;
  }
  
  // Clear specific ID in endpoint
  if (typeof cache[endpoint]?.data === 'object' && cache[endpoint].data[id]) {
    delete cache[endpoint].data[id];
    cache[endpoint].entries--;
    logger.info(MODULE, `Cleared cache for ${endpoint}/${id}`);
  }
};

/**
 * Look for transition video using metadata
 * @param {Array} transitionAssets - Available transition assets
 * @param {string} sourceLocationId - Source location ID
 * @param {string} destinationLocationId - Destination location ID
 * @returns {Object|null} Matching transition video or null
 */
const findTransitionByMetadata = (transitionAssets, sourceLocationId, destinationLocationId) => {
  if (!Array.isArray(transitionAssets) || !sourceLocationId || !destinationLocationId) {
    logger.debug(MODULE, 'Invalid parameters for findTransitionByMetadata');
    return null;
  }

  try {
    const match = transitionAssets.find(asset => 
      asset.metadata && 
      ((asset.metadata.sourceLocation === sourceLocationId && 
        asset.metadata.destinationLocation === destinationLocationId) ||
       (asset.metadata.from === sourceLocationId && 
        asset.metadata.to === destinationLocationId))
    );
    
    if (match) {
      logger.info(MODULE, `Found transition video by metadata: ${match.name}`);
    }
    
    return match;
  } catch (error) {
    logger.error(MODULE, `Error in findTransitionByMetadata: ${error.message}`);
    return null;
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
  
  // Get transition videos between locations
  getTransitionVideo: async (sourceLocationId, destinationLocationId, forceRefresh = false) => {
    if (!sourceLocationId || !destinationLocationId) {
      logger.error(MODULE, 'Cannot get transition video - missing location IDs', {
        sourceLocationId,
        destinationLocationId
      });
      return null;
    }
    
    try {
      // Get all transition assets
      logger.debug(MODULE, `Fetching transition videos for transition from ${sourceLocationId} to ${destinationLocationId}`);
      const transitionAssets = await dataLayer.getAssetsByType('Transition', null, forceRefresh);
      
      if (!Array.isArray(transitionAssets) || transitionAssets.length === 0) {
        logger.info(MODULE, 'No transition assets found in the system');
        return null;
      }
      
      // Primary strategy: Find by metadata (the new proper way)
      const transitionVideo = findTransitionByMetadata(
        transitionAssets,
        sourceLocationId,
        destinationLocationId
      );
      
      // If found, return the transition video
      if (transitionVideo) {
        return transitionVideo;
      }
      
      // If no specific transition found, log this clearly
      logger.info(MODULE, `No transition video found for route: ${sourceLocationId} to ${destinationLocationId}`);
      
      // We no longer use the legacy pattern matching strategies or generic fallback
      // This enables a clean CSS transition fallback instead
      return null;
    } catch (error) {
      logger.error(MODULE, `Error fetching transition video: ${error.message}`, error);
      return null;
    }
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
      // Only log at debug level in production to reduce noise
      logger.debug(MODULE, `Requesting hotspots for location: ${locationId}`);
      
      const hotspots = await makeRequest(
        'getHotspotsByLocation', 
        { locationId }, 
        { forceRefresh }
      );
      
      // Ensure we have an array to work with
      if (!Array.isArray(hotspots)) {
        logger.warn(MODULE, `Received non-array response for hotspots`);
        return [];
      }
      
      // Validate hotspots
      const validHotspots = hotspots.filter(hotspot => 
        hotspot && 
        hotspot._id && 
        hotspot.centerPoint &&
        hotspot.coordinates &&
        Array.isArray(hotspot.coordinates) &&
        hotspot.coordinates.length >= 3
      );
      
      if (validHotspots.length === 0 && hotspots.length > 0) {
        logger.warn(MODULE, `Found ${hotspots.length} hotspots for location ${locationId}, but none have valid coordinates`);
      } else {
        logger.debug(MODULE, `Found ${validHotspots.length} valid hotspots for location ${locationId}`);
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
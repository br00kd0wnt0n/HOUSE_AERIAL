import { useState, useEffect, useCallback } from 'react';
import serviceWorkerAPI from '../utils/serviceWorkerRegistration';
import logger from '../utils/logger';

/**
 * Custom hook for service worker cache management
 * Handles caching videos and checking cache versions
 * 
 * @param {Object} options - Options for the hook
 * @param {boolean} options.serviceWorkerReady - Whether the service worker is ready
 * @param {Function} options.sendMessage - Function to send messages to the service worker
 * @param {Function} options.registerMessageHandler - Function to register message handlers
 * @returns {Object} Service worker cache methods and state
 */
export const useServiceWorkerCache = ({ 
  serviceWorkerReady, 
  sendMessage, 
  registerMessageHandler 
}) => {
  // Module name for logging
  const MODULE = 'SWCache';
  
  // Service worker cache state
  const [cacheVersions, setCacheVersions] = useState(null);
  const [cachingProgress, setCachingProgress] = useState(null);

  /**
   * Check the current cache version
   * @returns {Promise<boolean>} Promise that resolves to true if check was initiated
   */
  const checkCacheVersion = useCallback(async () => {
    if (!serviceWorkerReady) {
      logger.warn(MODULE, 'Service worker not ready, cannot check cache version');
      return false;
    }
    
    logger.info(MODULE, 'Checking service worker cache version (videos only)');
    
    return sendMessage('CHECK_CACHE_VERSION');
  }, [serviceWorkerReady, sendMessage]);

  /**
   * Cache a list of videos
   * @param {Array} videos - List of videos to cache
   * @param {Function} setLoadingProgress - Optional callback to update loading progress
   * @returns {Promise<boolean>} Promise that resolves to true if caching was initiated
   */
  const cacheVideos = useCallback(async (videos, setLoadingProgress) => {
    if (!serviceWorkerReady) {
      logger.warn(MODULE, 'Service worker not ready, cannot cache videos');
      return false;
    }
    
    if (!videos || !videos.length) {
      logger.warn(MODULE, 'No videos to cache');
      return false;
    }
    
    logger.info(MODULE, `Caching ${videos.length} videos (only video files are cached, not core assets or API responses)`);
    
    // Initialize progress state
    const initialProgress = {
      loaded: 0,
      total: videos.length,
      status: 'caching'
    };
    
    setCachingProgress(initialProgress);
    
    // Update external progress tracker if provided
    if (setLoadingProgress && typeof setLoadingProgress === 'function') {
      setLoadingProgress(initialProgress);
    }
    
    // Send cache videos message to service worker
    return sendMessage('CACHE_VIDEOS', { videos });
  }, [serviceWorkerReady, sendMessage]);

  /**
   * Clear all service worker caches
   * @returns {Promise<boolean>} Promise that resolves to true if clearing was initiated
   */
  const clearCaches = useCallback(async () => {
    if (!serviceWorkerReady) {
      logger.warn(MODULE, 'Service worker not ready, cannot clear caches');
      return false;
    }
    
    logger.info(MODULE, 'Clearing all service worker caches');
    
    // First try the API method
    try {
      await serviceWorkerAPI.clearCache();
    } catch (error) {
      logger.warn(MODULE, 'Error clearing cache via API, falling back to message:', error);
    }
    
    // Then try the message method as a fallback
    return sendMessage('CLEAR_CACHES');
  }, [serviceWorkerReady, sendMessage]);

  /**
   * Update cache progress based on message from service worker
   * @param {Object} data - Cache progress data
   */
  const handleCacheProgress = useCallback((data) => {
    const { loaded, total, status } = data;
    
    const progress = {
      loaded: loaded || 0,
      total: total || 0,
      status: status || 'caching'
    };
    
    setCachingProgress(progress);
  }, []);

  /**
   * Handle cache version info from service worker
   * @param {Object} data - Cache version data
   */
  const handleCacheVersionInfo = useCallback((data) => {
    const { version } = data;
    
    logger.debug(MODULE, 'Received cache version info:', version);
    setCacheVersions(version);
  }, []);

  /**
   * Handle cache cleared message from service worker
   */
  const handleCachesCleared = useCallback(() => {
    logger.info(MODULE, 'All caches cleared successfully');
    setCacheVersions(null);
    setCachingProgress(null);
  }, []);

  // Register message handlers for cache-related messages
  useEffect(() => {
    if (!serviceWorkerReady || !registerMessageHandler) {
      return;
    }
    
    // Register handlers for different message types
    const unregisterCacheProgress = registerMessageHandler('CACHE_PROGRESS', handleCacheProgress);
    const unregisterCacheVersionInfo = registerMessageHandler('CACHE_VERSION_INFO', handleCacheVersionInfo);
    const unregisterCachesCleared = registerMessageHandler('CACHES_CLEARED', handleCachesCleared);
    
    // Check cache version on initial setup
    if (serviceWorkerReady) {
      setTimeout(() => {
        checkCacheVersion();
      }, 1000);
    }
    
    // Return cleanup function
    return () => {
      unregisterCacheProgress();
      unregisterCacheVersionInfo();
      unregisterCachesCleared();
    };
  }, [
    serviceWorkerReady, 
    registerMessageHandler, 
    handleCacheProgress, 
    handleCacheVersionInfo, 
    handleCachesCleared,
    checkCacheVersion
  ]);

  return {
    cacheVersions,
    cachingProgress,
    checkCacheVersion,
    cacheVideos,
    clearCaches
  };
};

export default useServiceWorkerCache; 
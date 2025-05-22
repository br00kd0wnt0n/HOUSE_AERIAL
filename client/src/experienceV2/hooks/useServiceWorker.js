import { useCallback } from 'react';
import useServiceWorkerRegistration from './useServiceWorkerRegistration';
import useServiceWorkerMessaging from './useServiceWorkerMessaging';
import useServiceWorkerCache from './useServiceWorkerCache';
import logger from '../utils/logger';

/**
 * Main service worker hook that composes specialized hooks for
 * registration, messaging, and caching
 * 
 * This hook maintains backward compatibility with the original useServiceWorker hook
 * while providing a more modular and maintainable implementation
 * 
 * @returns {Object} Combined service worker functionality
 */
export const useServiceWorker = () => {
  // Module name for logging
  const MODULE = 'ServiceWorker';
  
  // Use the registration hook
  const {
    serviceWorkerReady,
    offlineMode,
    registration,
    resetServiceWorker,
    checkServiceWorkerStatus
  } = useServiceWorkerRegistration();
  
  // Use the messaging hook
  const {
    sendMessage,
    registerMessageHandler
  } = useServiceWorkerMessaging({
    serviceWorkerReady
  });
  
  // Use the cache hook
  const {
    cacheVersions,
    cachingProgress,
    imageCachingProgress,
    checkCacheVersion,
    cacheVideos,
    cacheImages,
    clearCaches
  } = useServiceWorkerCache({
    serviceWorkerReady,
    sendMessage,
    registerMessageHandler
  });

  /**
   * Backward compatibility method for handling service worker messages
   * This maintains compatibility with code that directly passes event handlers
   * instead of using the new registerMessageHandler API
   * 
   * @param {Function} handler - Message event handler
   * @returns {Function} Cleanup function
   */
  const handleServiceWorkerMessage = useCallback((handler) => {
    if (typeof handler !== 'function') {
      logger.warn(MODULE, 'Invalid service worker message handler');
      return () => {};
    }
    
    // Register a handler for all message types
    const unregister = registerMessageHandler('*', (data) => {
      // Create a synthetic event to match the old API
      const event = {
        data: {
          ...data,
          type: data.messageType // ensure type is available
        }
      };
      
      handler(event);
    });
    
    return unregister;
  }, [registerMessageHandler]);

  return {
    // From registration hook
    serviceWorkerReady,
    offlineMode,
    registration,
    resetServiceWorker,
    checkServiceWorkerStatus,
    
    // From messaging hook (including backward compatibility)
    handleServiceWorkerMessage,
    sendMessage,
    registerMessageHandler,
    
    // From cache hook
    cacheVersions,
    cachingProgress,
    imageCachingProgress,
    checkCacheVersion,
    cacheVideos,
    cacheImages,
    clearCaches
  };
};

export default useServiceWorker; 
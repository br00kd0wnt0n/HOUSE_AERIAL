import { useState, useEffect, useCallback } from 'react';
import serviceWorkerAPI from '../utils/serviceWorkerRegistration';
import logger from '../utils/logger';

/**
 * Custom hook for service worker management
 * Follows best practices for service worker lifecycle
 */
export const useServiceWorker = () => {
  // Module name for logging
  const MODULE = 'ServiceWorker';
  
  // Service worker state
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [cacheVersions, setCacheVersions] = useState(null);

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback((event) => {
    const { data } = event;
    
    if (!data) return;
    
    logger.debug(MODULE, 'Received message from service worker:', data);
    
    if (data.type === 'CACHE_VERSION_INFO') {
      logger.debug(MODULE, 'Received cache version info:', data.version);
      setCacheVersions(data.version);
    }
    else if (data.type === 'CACHES_CLEARED') {
      logger.info(MODULE, 'All caches cleared');
    }
  }, []);

  // Check the current cache version
  const checkCacheVersion = useCallback(async () => {
    if (!serviceWorkerReady || !navigator.serviceWorker.controller) {
      return null;
    }
    
    // Update message in logs to show only videos are being cached
    logger.info(MODULE, 'Checking service worker cache version (videos only)');
    
    navigator.serviceWorker.controller.postMessage({
      type: 'CHECK_CACHE_VERSION'
    });
  }, [serviceWorkerReady]);

  // Cache a list of videos
  const cacheVideos = useCallback(async (videos, setLoadingProgress) => {
    if (!serviceWorkerReady || !navigator.serviceWorker.controller) {
      logger.warn(MODULE, 'Service worker not ready, cannot cache videos');
      return false;
    }
    
    if (!videos || !videos.length) {
      logger.warn(MODULE, 'No videos to cache');
      return false;
    }
    
    logger.info(MODULE, `Caching ${videos.length} videos (only video files are cached, not core assets or API responses)`);
    
    if (setLoadingProgress) {
      setLoadingProgress({
        loaded: 0,
        total: videos.length,
        status: 'caching'
      });
    }
    
    // Send message to service worker
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_VIDEOS',
      videos
    });
    
    return true;
  }, [serviceWorkerReady]);
  
  // Clear all caches
  const clearCaches = useCallback(async () => {
    if (!serviceWorkerReady || !navigator.serviceWorker.controller) {
      logger.warn(MODULE, 'Service worker not ready, cannot clear caches');
      return false;
    }
    
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHES'
    });
    
    return true;
  }, [serviceWorkerReady]);
  
  // Reset service worker by force updating it and clearing cache
  const resetServiceWorker = useCallback(async () => {
    logger.info(MODULE, 'Resetting service worker...');
    
    try {
      // First clear the cache
      await serviceWorkerAPI.clearCache();
      
      // Then force update the service worker
      const updated = await serviceWorkerAPI.forceUpdate();
      
      if (updated) {
        logger.info(MODULE, 'Service worker reset successful');
        setServiceWorkerReady(true);
        return true;
      } else {
        logger.warn(MODULE, 'Service worker reset failed');
        return false;
      }
    } catch (error) {
      logger.error(MODULE, 'Error resetting service worker:', error);
      return false;
    }
  }, []);

  // Register service worker on initial load - run only once
  useEffect(() => {
    // Flag to track if this effect has been run
    let isFirstRun = true;
    
    const setupServiceWorker = async () => {
      if (!isFirstRun) return;
      isFirstRun = false;
      
      // Check if we're online
      setOfflineMode(!navigator.onLine);
      
      // Listen for online/offline events
      const handleOnline = () => setOfflineMode(false);
      const handleOffline = () => setOfflineMode(true);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      try {
        logger.info(MODULE, 'Starting service worker setup');
        
        // Instead of force updating, use standard registration pattern 
        // that preserves service worker lifecycle
        logger.info(MODULE, 'Registering service worker using best practices');
        const registration = await serviceWorkerAPI.register();
        
        if (registration) {
          logger.info(MODULE, 'Service worker registration successful', registration);
          
          // If the worker is installing, wait for it to activate
          if (registration.installing) {
            logger.debug(MODULE, 'Service worker is installing, waiting for activation');
            await new Promise(resolve => {
              registration.installing.addEventListener('statechange', (event) => {
                if (event.target.state === 'activated') {
                  logger.info(MODULE, 'Service worker activated');
                  resolve();
                }
              });
            });
          }
          
          // Set ready state
          setServiceWorkerReady(true);
          
          // Make sure we have a controller before adding listeners
          if (navigator.serviceWorker.controller) {
            // Add listeners for service worker messages
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            
            // Check cache version
            setTimeout(() => {
              checkCacheVersion();
            }, 1000);
          } else {
            logger.warn(MODULE, 'No service worker controller available yet. This is normal on first load.');
            logger.info(MODULE, 'Service worker is registered but not controlling this page yet. Video preloading will use browser fallback.');
            
            // Still set serviceWorkerReady to true so the app can proceed
            // The ServiceWorkerStrategy will fall back to BrowserStrategy when needed
            setServiceWorkerReady(true);
          }
        } else {
          logger.warn(MODULE, 'Service worker registration failed');
          setServiceWorkerReady(false);
        }
      } catch (error) {
        logger.error(MODULE, 'Error setting up service worker:', error);
        setServiceWorkerReady(false);
      }
      
      // Return cleanup function
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (navigator.serviceWorker) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        }
      };
    };
    
    // Start setup process
    setupServiceWorker();
  }, [checkCacheVersion, handleServiceWorkerMessage]);

  return {
    serviceWorkerReady,
    offlineMode,
    cacheVersions,
    cacheVideos,
    clearCaches,
    resetServiceWorker,
    checkCacheVersion
  };
};

export default useServiceWorker; 
import { useState, useEffect, useCallback } from 'react';
import serviceWorkerAPI from '../utils/serviceWorkerRegistration';
import logger from '../utils/logger';

/**
 * Custom hook for service worker registration and lifecycle management
 * Handles registration, updates, and online/offline status
 * 
 * @returns {Object} Service worker registration state and methods
 */
export const useServiceWorkerRegistration = () => {
  // Module name for logging
  const MODULE = 'SWRegistration';
  
  // Service worker registration state
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);

  /**
   * Reset service worker by force updating it
   * @returns {Promise<boolean>} Promise that resolves to true if reset was successful
   */
  const resetServiceWorker = useCallback(async () => {
    logger.info(MODULE, 'Resetting service worker...');
    
    try {
      // Force update the service worker
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

  /**
   * Check if the service worker is ready (registered and active)
   * @returns {Promise<boolean>} Promise that resolves to true if service worker is ready
   */
  const checkServiceWorkerStatus = useCallback(async () => {
    try {
      const isActive = await serviceWorkerAPI.isActive();
      setServiceWorkerReady(isActive);
      return isActive;
    } catch (error) {
      logger.error(MODULE, 'Error checking service worker status:', error);
      setServiceWorkerReady(false);
      return false;
    }
  }, []);

  /**
   * Handle waiting service worker activation
   * @param {ServiceWorkerRegistration} reg - Service worker registration
   * @returns {Promise<boolean>} Promise that resolves when the service worker is activated
   */
  const handleWaitingServiceWorker = useCallback(async (reg) => {
    if (!reg) return false;
    
    try {
      // If the worker is installing, wait for it to activate
      if (reg.installing) {
        logger.debug(MODULE, 'Service worker is installing, waiting for activation');
        
        await new Promise(resolve => {
          const stateChangeHandler = (event) => {
            if (event.target.state === 'activated') {
              logger.info(MODULE, 'Service worker activated');
              if (event.target && reg.installing) {
                event.target.removeEventListener('statechange', stateChangeHandler);
              }
              resolve();
            }
          };
          
          reg.installing.addEventListener('statechange', stateChangeHandler);
        });
        
        return true;
      }
      
      return !!reg.active;
    } catch (error) {
      logger.error(MODULE, 'Error handling waiting service worker:', error);
      return false;
    }
  }, []);

  // Register and set up service worker on component mount
  useEffect(() => {
    // Check online/offline status and set up listeners
    const setupOnlineStatus = () => {
      // Check if we're online
      setOfflineMode(!navigator.onLine);
      
      // Listen for online/offline events
      const handleOnline = () => setOfflineMode(false);
      const handleOffline = () => setOfflineMode(true);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    };
    
    // Register service worker
    const setupServiceWorker = async () => {
      try {
        logger.info(MODULE, 'Starting service worker registration');
        
        // Register service worker using standard registration pattern
        const reg = await serviceWorkerAPI.register();
        
        if (reg) {
          logger.info(MODULE, 'Service worker registration successful');
          setRegistration(reg);
          
          // Wait for activation if necessary
          await handleWaitingServiceWorker(reg);
          
          // Set ready state
          setServiceWorkerReady(true);
          
          // If no controller, provide warning but still set ready
          // This is expected on first page load after registration
          if (!navigator.serviceWorker.controller) {
            logger.warn(MODULE, 'No service worker controller available yet. This is normal on first load.');
            logger.info(MODULE, 'Service worker is registered but will not control this page until next load.');
          }
          
          return reg;
        } else {
          logger.warn(MODULE, 'Service worker registration failed');
          setServiceWorkerReady(false);
          return null;
        }
      } catch (error) {
        logger.error(MODULE, 'Error registering service worker:', error);
        setServiceWorkerReady(false);
        return null;
      }
    };
    
    // Set up online status listeners
    const cleanupOnlineStatus = setupOnlineStatus();
    
    // Register service worker
    setupServiceWorker();
    
    // Cleanup function
    return () => {
      cleanupOnlineStatus();
    };
  }, [handleWaitingServiceWorker]);

  return {
    serviceWorkerReady,
    offlineMode,
    registration,
    resetServiceWorker,
    checkServiceWorkerStatus
  };
};

export default useServiceWorkerRegistration; 
/**
 * Service Worker Registration utility for the v2 experience
 * Follows best practices for service worker lifecycle
 * 
 * NOTE: This service worker now ONLY caches video files, not core assets or API responses
 */

import logger from './logger';

// Module name for logging
const MODULE = 'SWRegistration';

// Check if service workers are supported
const isServiceWorkerSupported = 'serviceWorker' in navigator;

/**
 * Register the service worker or get existing registration
 * This follows the standard service worker lifecycle:
 * - On first visit: Install and activate a new service worker
 * - On subsequent visits: Return existing registration, browser handles update checks
 * 
 * The service worker will only cache video files, not core assets or API responses.
 * 
 * @param {Object} options - Registration options
 * @returns {Promise} Promise that resolves with the registration
 */
export const registerServiceWorker = async (options = {}) => {
  if (!isServiceWorkerSupported) {
    logger.warn(MODULE, 'Service workers are not supported in this browser');
    return false;
  }
  
  try {
    // Register the service worker
    // If one already exists, the browser will return it without unnecessary network requests
    logger.debug(MODULE, 'Registering or getting existing service worker (video-only caching)');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Don't use cached versions of the service worker
    });
    
    logger.info(MODULE, 'Service Worker registration successful with scope:', registration.scope);
    logger.info(MODULE, 'Note: This service worker is configured to cache ONLY video files');
    
    return registration;
  } catch (error) {
    logger.error(MODULE, 'Service Worker registration failed:', error);
    return false;
  }
};

/**
 * Unregister the service worker
 * NOTE: Only use this when you're retiring the service worker completely
 * or for debugging purposes. Do not call on every page load.
 * 
 * @returns {Promise} Promise that resolves when the service worker is unregistered
 */
export const unregisterServiceWorker = async () => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      logger.info(MODULE, 'Service Worker unregistered');
      return true;
    }
    return false;
  } catch (error) {
    logger.error(MODULE, 'Service Worker unregistration failed:', error);
    return false;
  }
};

/**
 * Send a message to the service worker
 * @param {Object} message - The message to send
 * @returns {Promise} Promise that resolves when the message is sent
 */
export const sendMessageToServiceWorker = async (message) => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage(message);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(MODULE, 'Failed to send message to Service Worker:', error);
    return false;
  }
};

/**
 * Check if the service worker is active
 * @returns {Promise<boolean>} Promise that resolves with true if service worker is active
 */
export const isServiceWorkerActive = async () => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration && !!registration.active;
  } catch (error) {
    logger.error(MODULE, 'Error checking Service Worker status:', error);
    return false;
  }
};

/**
 * Unregister all existing service workers
 * NOTE: Only use this for debugging or when completely retiring service workers.
 * Do not call this on regular page loads as it defeats caching benefits.
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if service workers were unregistered
 */
export const unregisterAllServiceWorkers = async () => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      logger.debug(MODULE, 'No service workers to unregister');
      return false;
    }
    
    logger.info(MODULE, `Unregistering ${registrations.length} service workers...`);
    
    await Promise.all(
      registrations.map(registration => registration.unregister())
    );
    
    logger.info(MODULE, 'All service workers unregistered');
    return true;
  } catch (error) {
    logger.error(MODULE, 'Error unregistering service workers:', error);
    return false;
  }
};

/**
 * Check for updates to the service worker
 * This will trigger the update flow if a new version is available
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if update check was performed
 */
export const checkForUpdates = async () => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      logger.debug(MODULE, 'Checking for service worker updates');
      await registration.update();
      return true;
    }
    return false;
  } catch (error) {
    logger.error(MODULE, 'Error checking for service worker updates:', error);
    return false;
  }
};

/**
 * Force update the service worker
 * IMPORTANT: This now follows best practices by not unregistering on every page load.
 * Instead, it gets or registers a service worker and checks for updates.
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if registration is successful
 */
export const forceUpdateServiceWorker = async () => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    logger.info(MODULE, 'Setting up service worker (best practice method)...');
    
    // Get existing registration or register new one
    const registration = await registerServiceWorker();
    
    if (!registration) {
      logger.warn(MODULE, 'Failed to register service worker');
      return false;
    }
    
    // Check for updates
    try {
      logger.debug(MODULE, 'Checking for service worker updates');
      await registration.update();
    } catch (updateError) {
      // Not fatal, just log it
      logger.warn(MODULE, 'Error checking for updates:', updateError);
    }
    
    logger.info(MODULE, 'Service worker setup successful');
    return true;
  } catch (error) {
    logger.error(MODULE, 'Error during service worker setup:', error);
    return false;
  }
};

/**
 * Clear the service worker video cache
 * @returns {Promise<boolean>} Promise that resolves with true if the operation was successful
 */
export const clearServiceWorkerCache = async () => {
  if (!isServiceWorkerSupported) return false;
  
  try {
    logger.debug(MODULE, 'Clearing service worker video cache');
    
    // Get the current service worker registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.active) {
      logger.warn(MODULE, 'No active service worker found to clear video cache');
      return false;
    }
    
    // Send a message to the service worker to clear the cache
    registration.active.postMessage({
      type: 'CLEAR_CACHES'
    });
    
    logger.info(MODULE, 'Request to clear service worker video cache sent');
    return true;
  } catch (error) {
    logger.error(MODULE, 'Error clearing service worker video cache:', error);
    return false;
  }
};

// Create the service worker API object before exporting
const serviceWorkerAPI = {
  register: registerServiceWorker,
  unregister: unregisterServiceWorker,
  unregisterAll: unregisterAllServiceWorkers,
  sendMessage: sendMessageToServiceWorker,
  isActive: isServiceWorkerActive,
  isSupported: isServiceWorkerSupported,
  checkForUpdates,
  forceUpdate: forceUpdateServiceWorker,
  clearCache: clearServiceWorkerCache
};

export default serviceWorkerAPI; 
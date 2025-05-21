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

// Service worker configuration
const SW_CONFIG = {
  scriptUrl: '/sw.js',
  scope: '/',
  updateViaCache: 'none' // Don't use cached versions of the service worker
};

/**
 * Helper function to check if service workers are supported
 * @returns {boolean} Whether service workers are supported
 */
const ensureServiceWorkerSupport = () => {
  if (!isServiceWorkerSupported) {
    logger.warn(MODULE, 'Service workers are not supported in this browser');
    return false;
  }
  
  return true;
};

/**
 * Helper function to handle service worker errors consistently
 * @param {Error} error - The error to handle
 * @param {string} operation - The operation that failed
 * @returns {boolean} Always returns false to indicate failure
 */
const handleServiceWorkerError = (error, operation) => {
  logger.error(MODULE, `Error during ${operation}:`, error);
  return false;
};

/**
 * Helper function to get the current service worker registration
 * @returns {Promise<ServiceWorkerRegistration|null>} The service worker registration or null
 */
const getRegistration = async () => {
  if (!ensureServiceWorkerSupport()) return null;
  
  try {
    return await navigator.serviceWorker.getRegistration();
  } catch (error) {
    handleServiceWorkerError(error, 'get registration');
    return null;
  }
};

/**
 * Helper function to get all service worker registrations
 * @returns {Promise<ServiceWorkerRegistration[]>} Array of service worker registrations
 */
const getAllRegistrations = async () => {
  if (!ensureServiceWorkerSupport()) return [];
  
  try {
    return await navigator.serviceWorker.getRegistrations();
  } catch (error) {
    handleServiceWorkerError(error, 'get all registrations');
    return [];
  }
};

/**
 * Helper function to send a message to an active service worker
 * @param {ServiceWorkerRegistration} registration - The service worker registration
 * @param {Object} message - The message to send
 * @returns {Promise<boolean>} Whether the message was sent successfully
 */
const sendMessageToActive = async (registration, message) => {
  if (!registration || !registration.active) {
    logger.warn(MODULE, 'No active service worker to send message to');
    return false;
  }
  
  try {
    registration.active.postMessage(message);
    return true;
  } catch (error) {
    return handleServiceWorkerError(error, 'send message');
  }
};

/**
 * Perform a service worker operation with consistent error handling
 * @param {Function} operation - Async function to perform
 * @param {string} operationName - Name of the operation for error logging
 * @param {*} defaultValue - Default return value in case of failure
 * @returns {Promise<*>} Result of the operation or defaultValue on failure
 */
const performServiceWorkerOperation = async (operation, operationName, defaultValue) => {
  if (!ensureServiceWorkerSupport()) return defaultValue;
  
  try {
    return await operation();
  } catch (error) {
    return handleServiceWorkerError(error, operationName) ? true : defaultValue;
  }
};

/**
 * Register the service worker or get existing registration
 * This follows the standard service worker lifecycle:
 * - On first visit: Install and activate a new service worker
 * - On subsequent visits: Return existing registration, browser handles update checks
 * 
 * The service worker will only cache video files, not core assets or API responses.
 * 
 * @param {Object} options - Registration options (optional)
 * @returns {Promise<ServiceWorkerRegistration|false>} Promise that resolves with the registration or false
 */
export const registerServiceWorker = async (options = {}) => {
  return performServiceWorkerOperation(async () => {
    // Register the service worker
    // If one already exists, the browser will return it without unnecessary network requests
    logger.debug(MODULE, 'Registering or getting existing service worker (video-only caching)');
    
    const config = { ...SW_CONFIG, ...options };
    const registration = await navigator.serviceWorker.register(config.scriptUrl, {
      scope: config.scope,
      updateViaCache: config.updateViaCache
    });
    
    logger.info(MODULE, 'Service Worker registration successful with scope:', registration.scope);
    logger.info(MODULE, 'Note: This service worker is configured to cache ONLY video files');
    
    return registration;
  }, 'service worker registration', false);
};

/**
 * Unregister the service worker
 * NOTE: Only use this when you're retiring the service worker completely
 * or for debugging purposes. Do not call on every page load.
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if the service worker was unregistered
 */
export const unregisterServiceWorker = async () => {
  return performServiceWorkerOperation(async () => {
    const registration = await getRegistration();
    if (!registration) {
      logger.debug(MODULE, 'No service worker registration found to unregister');
      return false;
    }
    
    await registration.unregister();
    logger.info(MODULE, 'Service Worker unregistered');
    return true;
  }, 'service worker unregistration', false);
};

/**
 * Send a message to the service worker
 * @param {Object} message - The message to send
 * @returns {Promise<boolean>} Promise that resolves with true if the message was sent
 */
export const sendMessageToServiceWorker = async (message) => {
  return performServiceWorkerOperation(async () => {
    const registration = await getRegistration();
    return await sendMessageToActive(registration, message);
  }, 'send message to service worker', false);
};

/**
 * Check if the service worker is active
 * @returns {Promise<boolean>} Promise that resolves with true if service worker is active
 */
export const isServiceWorkerActive = async () => {
  return performServiceWorkerOperation(async () => {
    const registration = await getRegistration();
    return !!registration && !!registration.active;
  }, 'check service worker status', false);
};

/**
 * Unregister all existing service workers
 * NOTE: Only use this for debugging or when completely retiring service workers.
 * Do not call this on regular page loads as it defeats caching benefits.
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if service workers were unregistered
 */
export const unregisterAllServiceWorkers = async () => {
  return performServiceWorkerOperation(async () => {
    const registrations = await getAllRegistrations();
    
    if (registrations.length === 0) {
      logger.debug(MODULE, 'No service workers to unregister');
      return false;
    }
    
    logger.info(MODULE, `Unregistering ${registrations.length} service workers...`);
    
    const results = await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.unregister();
          return true;
        } catch (error) {
          logger.warn(MODULE, 'Error unregistering a service worker:', error);
          return false;
        }
      })
    );
    
    // Check if all unregistrations were successful
    const allSuccessful = results.every(result => result === true);
    
    if (allSuccessful) {
      logger.info(MODULE, 'All service workers unregistered successfully');
    } else {
      logger.warn(MODULE, 'Some service workers could not be unregistered');
    }
    
    return allSuccessful;
  }, 'unregister all service workers', false);
};

/**
 * Update the service worker if needed
 * Checks for updates to the service worker and applies them
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if update was successful
 */
export const updateServiceWorker = async () => {
  return performServiceWorkerOperation(async () => {
    const registration = await getRegistration();
    if (!registration) {
      logger.warn(MODULE, 'No service worker registration found to update');
      return false;
    }
    
    logger.debug(MODULE, 'Checking for service worker updates');
    await registration.update();
    
    // Check if there's a waiting worker, which means an update is available
    if (registration.waiting) {
      logger.info(MODULE, 'New service worker version is waiting to activate');
      // You could trigger an update here by sending a message
      // to the waiting service worker to skip waiting
      sendMessageToActive(registration.waiting, { type: 'SKIP_WAITING' });
      return true;
    }
    
    logger.debug(MODULE, 'No service worker updates available');
    return true;
  }, 'update service worker', false);
};

/**
 * Check for updates to the service worker
 * This will trigger the update flow if a new version is available
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if update check was performed
 */
export const checkForUpdates = async () => {
  // We're using the updateServiceWorker function now since they share functionality
  return await updateServiceWorker();
};

/**
 * Force update the service worker
 * Performs a complete update cycle: check for updates, apply if available
 * 
 * @returns {Promise<boolean>} Promise that resolves with true if registration is successful
 */
export const forceUpdateServiceWorker = async () => {
  return performServiceWorkerOperation(async () => {
    logger.info(MODULE, 'Setting up service worker (best practice method)...');
    
    // Get existing registration or register new one
    const registration = await registerServiceWorker();
    
    if (!registration) {
      logger.warn(MODULE, 'Failed to register service worker');
      return false;
    }
    
    // Update the service worker
    await updateServiceWorker();
    
    logger.info(MODULE, 'Service worker setup successful');
    return true;
  }, 'force update service worker', false);
};

/**
 * Clear the service worker video cache
 * @returns {Promise<boolean>} Promise that resolves with true if the operation was successful
 */
export const clearServiceWorkerCache = async () => {
  return performServiceWorkerOperation(async () => {
    logger.debug(MODULE, 'Clearing service worker video cache');
    
    // Get the current service worker registration
    const registration = await getRegistration();
    
    // Send a message to the service worker to clear the cache
    const messageSent = await sendMessageToActive(registration, { type: 'CLEAR_CACHES' });
    
    if (messageSent) {
      logger.info(MODULE, 'Request to clear service worker video cache sent');
      return true;
    } else {
      logger.warn(MODULE, 'Failed to send cache clear message to service worker');
      return false;
    }
  }, 'clear service worker cache', false);
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
  update: updateServiceWorker,
  forceUpdate: forceUpdateServiceWorker,
  clearCache: clearServiceWorkerCache
};

export default serviceWorkerAPI; 
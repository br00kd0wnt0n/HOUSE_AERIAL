/**
 * logger.js - Environment-aware logging utility
 * 
 * This utility provides consistent logging that automatically adjusts verbosity
 * based on the environment (development vs. production).
 */

// Determine current environment
const isDevelopment = process.env.NODE_ENV === 'development';

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,  // Most verbose, development only
  INFO: 1,   // Informational, some in production
  WARN: 2,   // Warnings, always shown
  ERROR: 3   // Errors, always shown
};

// Current log level based on environment
const currentLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

// Cache for tracking repeated logs to avoid spam
const logCache = new Map();
const LOG_CACHE_EXPIRY = 10000; // 10 seconds

/**
 * Format log message with module name
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @returns {string} Formatted message
 */
const formatMessage = (module, message) => {
  return `[${module}] ${message}`;
};

/**
 * Check if a log message is a repeat and should be suppressed
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {number} level - Log level
 * @returns {boolean} True if should be suppressed
 */
const shouldSuppressRepeat = (module, message, level) => {
  // Don't suppress errors or warnings
  if (level >= LOG_LEVELS.WARN) return false;
  
  // Only apply repeat suppression in production
  if (isDevelopment) return false;
  
  const key = `${module}:${message}`;
  const now = Date.now();
  
  // Check if we've logged this recently
  if (logCache.has(key)) {
    const lastTime = logCache.get(key);
    if (now - lastTime < LOG_CACHE_EXPIRY) {
      return true; // Suppress repeat
    }
  }
  
  // Update cache with current time
  logCache.set(key, now);
  
  // Prune old entries occasionally
  if (Math.random() < 0.1) { // 10% chance to clean up on each log
    for (const [cacheKey, timestamp] of logCache.entries()) {
      if (now - timestamp > LOG_CACHE_EXPIRY) {
        logCache.delete(cacheKey);
      }
    }
  }
  
  return false;
};

/**
 * Main logger object
 */
const logger = {
  /**
   * Debug level logging (development only)
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  debug: (module, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG && !shouldSuppressRepeat(module, message, LOG_LEVELS.DEBUG)) {
      if (data) {
        console.debug(formatMessage(module, message), data);
      } else {
        console.debug(formatMessage(module, message));
      }
    }
  },
  
  /**
   * Info level logging
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  info: (module, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.INFO && !shouldSuppressRepeat(module, message, LOG_LEVELS.INFO)) {
      if (data) {
        console.info(formatMessage(module, message), data);
      } else {
        console.info(formatMessage(module, message));
      }
    }
  },
  
  /**
   * Warning level logging
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  warn: (module, message, data) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      if (data) {
        console.warn(formatMessage(module, message), data);
      } else {
        console.warn(formatMessage(module, message));
      }
    }
  },
  
  /**
   * Error level logging
   * @param {string} module - Module name
   * @param {string} message - Log message
   * @param {any} error - Error object or description
   */
  error: (module, message, error) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      if (error) {
        console.error(formatMessage(module, message), error);
      } else {
        console.error(formatMessage(module, message));
      }
    }
  },
  
  /**
   * Group logs together (in development)
   * @param {string} module - Module name
   * @param {string} label - Group label
   * @param {Function} callback - Function containing logs
   */
  group: (module, label, callback) => {
    if (isDevelopment) {
      console.group(formatMessage(module, label));
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }
};

export default logger; 
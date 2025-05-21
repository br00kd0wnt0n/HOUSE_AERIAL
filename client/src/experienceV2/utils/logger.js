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
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
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
    if (currentLogLevel <= LOG_LEVELS.INFO) {
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
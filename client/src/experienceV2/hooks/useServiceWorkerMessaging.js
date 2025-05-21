import { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';

/**
 * Custom hook for service worker messaging
 * Handles sending and receiving messages to/from the service worker
 * 
 * @param {Object} options - Options for the hook
 * @param {boolean} options.serviceWorkerReady - Whether the service worker is ready
 * @returns {Object} Service worker messaging methods and state
 */
export const useServiceWorkerMessaging = ({ serviceWorkerReady }) => {
  // Module name for logging
  const MODULE = 'SWMessaging';
  
  // State for message handlers
  const [messageHandlers, setMessageHandlers] = useState({});

  /**
   * Send a message to the service worker
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {boolean} Whether the message was sent
   */
  const sendMessage = useCallback((type, data = {}) => {
    if (!serviceWorkerReady || !navigator.serviceWorker.controller) {
      logger.warn(MODULE, `Cannot send message (${type}): Service worker not ready`);
      return false;
    }
    
    try {
      logger.debug(MODULE, `Sending message to service worker: ${type}`);
      
      navigator.serviceWorker.controller.postMessage({
        type,
        ...data
      });
      
      return true;
    } catch (error) {
      logger.error(MODULE, `Error sending message (${type}) to service worker:`, error);
      return false;
    }
  }, [serviceWorkerReady]);

  /**
   * Register a handler for a specific message type
   * @param {string} type - Message type to handle
   * @param {Function} handler - Handler function for this message type
   * @returns {Function} Function to unregister the handler
   */
  const registerMessageHandler = useCallback((type, handler) => {
    if (typeof handler !== 'function') {
      logger.warn(MODULE, `Invalid handler for message type: ${type}`);
      return () => {};
    }
    
    logger.debug(MODULE, `Registering handler for message type: ${type}`);
    
    setMessageHandlers(prevHandlers => ({
      ...prevHandlers,
      [type]: [...(prevHandlers[type] || []), handler]
    }));
    
    // Return a function to unregister this handler
    return () => {
      setMessageHandlers(prevHandlers => {
        const handlers = prevHandlers[type] || [];
        return {
          ...prevHandlers,
          [type]: handlers.filter(h => h !== handler)
        };
      });
    };
  }, []);

  /**
   * Handle messages from the service worker
   * @param {MessageEvent} event - Message event from service worker
   */
  const handleServiceWorkerMessage = useCallback((event) => {
    const { data } = event;
    
    if (!data || !data.type) {
      logger.debug(MODULE, 'Received message without type from service worker:', data);
      return;
    }
    
    const { type, ...messageData } = data;
    
    logger.debug(MODULE, `Received message from service worker: ${type}`);
    
    // Call all registered handlers for this message type
    const handlers = messageHandlers[type] || [];
    handlers.forEach(handler => {
      try {
        handler(messageData);
      } catch (error) {
        logger.error(MODULE, `Error in message handler for ${type}:`, error);
      }
    });
  }, [messageHandlers]);

  // Set up event listener for service worker messages
  useEffect(() => {
    if (!serviceWorkerReady) {
      return;
    }
    
    logger.debug(MODULE, 'Setting up service worker message listener');
    
    // Add event listener for service worker messages
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    // Return cleanup function
    return () => {
      logger.debug(MODULE, 'Cleaning up service worker message listener');
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [serviceWorkerReady, handleServiceWorkerMessage]);

  return {
    sendMessage,
    registerMessageHandler
  };
};

export default useServiceWorkerMessaging; 
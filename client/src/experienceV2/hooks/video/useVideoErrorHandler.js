import { useState, useCallback } from 'react';
import logger from '../../utils/logger';

const MODULE = 'VideoErrorHandler';

/**
 * Custom hook for centralizing video error handling logic
 * Tracks error states and provides error handling functions
 */
export function useVideoErrorHandler({ type = 'aerial' }) {
  // Track error state
  const [hasError, setHasError] = useState(false);
  // Track error details for debugging
  const [errorDetails, setErrorDetails] = useState(null);
  
  // Reset error state
  const resetError = useCallback(() => {
    setHasError(false);
    setErrorDetails(null);
  }, []);
  
  // Handle video error event
  const handleVideoError = useCallback((error) => {
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || -1;
    
    logger.error(MODULE, `Error loading ${type} video [code: ${errorCode}]:`, errorMessage);
    
    // Store error details
    setErrorDetails({
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      videoType: type
    });
    
    setHasError(true);
    
    // Attempt to report error to monitoring service if available
    try {
      if (window.reportError) {
        window.reportError('VIDEO_PLAYBACK_ERROR', {
          videoType: type,
          errorCode,
          errorMessage,
          userAgent: navigator.userAgent
        });
      }
    } catch (reportError) {
      // Don't let reporting errors cause additional issues
      logger.error(MODULE, 'Error reporting video issue to monitoring service:', reportError);
    }
  }, [type]);
  
  // Handle network errors that might affect video playback
  const checkNetworkErrors = useCallback(() => {
    // Only perform check if browser supports the relevant APIs
    if ('navigator' in window && 'onLine' in navigator && !navigator.onLine) {
      logger.warn(MODULE, 'Network appears to be offline, this may affect video playback');
      
      // Return true if we detect network issues
      return true;
    }
    
    return false;
  }, []);
  
  // Get error UI content based on current error state
  const getErrorContent = useCallback(() => {
    if (!hasError) return null;
    
    // Check if it might be a network error
    const isNetworkIssue = checkNetworkErrors();
    
    return {
      title: isNetworkIssue ? 'Network Error' : 'Error Loading Video',
      message: isNetworkIssue 
        ? 'Please check your internet connection and try again'
        : 'Please try reloading the page',
      isNetworkIssue
    };
  }, [hasError, checkNetworkErrors]);
  
  return {
    hasError,
    errorDetails,
    resetError,
    handleVideoError,
    checkNetworkErrors,
    getErrorContent
  };
} 
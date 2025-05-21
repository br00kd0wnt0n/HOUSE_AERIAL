import React, { Component } from 'react';
import logger from '../../utils/logger';

/**
 * ErrorBoundary - Component to catch and handle errors in child components
 * 
 * Features:
 * - Catches runtime errors in child component trees
 * - Provides fallback UI when errors occur
 * - Conditionally reports errors based on environment
 * - Supports custom fallback UI via props
 * - Offers graceful recovery options
 * - Tracks error count to prevent infinite loops
 * - Provides different handling for persistent errors
 * 
 * @example
 * <ErrorBoundary 
 *   fallback={(error, errorInfo, onReset) => <CustomError message={error.message} onReset={onReset} />}
 *   onReset={() => console.log('Error boundary reset')}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  // Module name for logging
  MODULE = 'ErrorBoundary';
  
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0, // Track number of errors to prevent infinite loops
      lastErrorTime: null // Track when errors occur to detect rapid succession
    };
  }

  /**
   * React lifecycle method to update state when an error occurs
   * @param {Error} error - The error that was thrown
   * @returns {Object} Updated state object
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  /**
   * React lifecycle method called when an error is caught
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - React component stack information
   */
  componentDidCatch(error, errorInfo) {
    const now = Date.now();
    const isRapidSuccession = this.state.lastErrorTime && (now - this.state.lastErrorTime < 5000);
    
    // Increment error count
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      lastErrorTime: now,
      // If errors happen in rapid succession, consider them more severe
      persistentError: isRapidSuccession
    }));
    
    // Log errors differently based on environment
    if (process.env.NODE_ENV === 'development') {
      // In development, log detailed information for debugging
      logger.error(this.MODULE, 'Error caught by boundary:', error);
      logger.error(this.MODULE, 'Component stack:', errorInfo.componentStack);
    } else {
      // In production, log minimal information to avoid sensitive data exposure
      // Extract a safe message that doesn't include potentially sensitive stack traces
      const safeErrorMessage = this.getSafeErrorMessage(error);
      logger.error(this.MODULE, `Production error: ${safeErrorMessage}`);
      
      // Add context about error frequency
      if (this.state.errorCount > 1) {
        logger.warn(this.MODULE, `Error occurrence #${this.state.errorCount}`);
      }
    }
    
    // Report error to analytics, if available
    this.reportError(error, errorInfo);
  }
  
  /**
   * Gets a safe error message that can be logged in production
   * @param {Error} error - The error that was thrown
   * @returns {string} A sanitized error message
   */
  getSafeErrorMessage(error) {
    if (!error) return 'Unknown error';
    
    // Extract just the message without stack trace
    return error.message || error.toString().split('\n')[0];
  }
  
  /**
   * Reports error to external service if available
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - React component stack information
   */
  reportError(error, errorInfo) {
    // Only report in production to avoid noise during development
    if (process.env.NODE_ENV !== 'production') return;
    
    try {
      // Explicitly check if reportError exists before calling
      if (typeof window !== 'undefined' && window.reportError && typeof window.reportError === 'function') {
        const errorContext = {
          count: this.state.errorCount,
          component: errorInfo?.componentStack?.split('\n')?.[1]?.trim() || 'Unknown Component',
          timestamp: new Date().toISOString()
        };
        
        window.reportError(error, errorContext);
      }
      
      // Fallback to generic error reporting if configured and reportError is not available
      else if (typeof window !== 'undefined' && window.onerror && typeof window.onerror === 'function') {
        // Trigger the global error handler as a fallback
        const errorMsg = error.message || 'Error in React component';
        window.onerror(errorMsg, undefined, undefined, undefined, error);
      }
    } catch (reportingError) {
      // If error reporting itself fails, log it locally but don't throw
      logger.error(this.MODULE, 'Failed to report error:', reportingError);
    }
  }
  
  /**
   * Attempt to recover from the error
   */
  handleRecoveryAttempt = () => {
    logger.info(this.MODULE, 'Attempting recovery from error');
    
    // Reset error state
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
      // Keep errorCount to track persistent issues
    });
    
    // Call onReset prop if provided
    if (this.props.onReset && typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (resetError) {
        logger.error(this.MODULE, 'Error during reset handler:', resetError);
        // If reset handler fails, make sure we're still in error state
        this.setState({ 
          hasError: true,
          error: resetError
        });
      }
    }
  }

  /**
   * Perform a full page reload as last resort
   */
  handleReload = () => {
    logger.info(this.MODULE, 'Reloading page to recover from error');
    window.location.reload();
  }
  
  /**
   * Return to the home page as an alternative recovery method
   */
  handleReturnHome = () => {
    logger.info(this.MODULE, 'Navigating to home page to recover from error');
    window.location.href = '/';
  }

  render() {
    if (!this.state.hasError) {
      // If no error, render children normally
      return this.props.children;
    }
    
    // If too many errors occur in succession, show a more permanent error state
    const isCriticalError = this.state.errorCount > 3 || this.state.persistentError;
    
    if (isCriticalError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-2xl font-bold mb-4 text-netflix-red">Persistent Error Detected</h2>
          <p className="mb-8">
            The experience has encountered multiple errors. Please try one of the recovery options below.
          </p>
          <div className="flex space-x-4">
            <button 
              onClick={this.handleReload}
              className="px-4 py-2 bg-netflix-red text-white rounded hover:bg-red-700 transition-colors"
            >
              Reload Experience
            </button>
            <button 
              onClick={this.handleReturnHome}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    
    // If a custom fallback is provided, use it
    if (this.props.fallback && typeof this.props.fallback === 'function') {
      return this.props.fallback(
        this.state.error, 
        this.state.errorInfo, 
        this.handleRecoveryAttempt,
        this.handleReload,
        this.handleReturnHome
      );
    }
    
    // Otherwise, use the default fallback
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
        <h2 className="text-2xl font-bold mb-4 text-netflix-red">Something went wrong</h2>
        <p className="mb-8">
          The experience encountered an error. You can try continuing or refreshing the page.
        </p>
        
        <div className="flex space-x-4">
          <button 
            onClick={this.handleRecoveryAttempt}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Try to Continue
          </button>
          
          <button 
            onClick={this.handleReload}
            className="px-4 py-2 bg-netflix-red text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Experience
          </button>
          
          <button 
            onClick={this.handleReturnHome}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Return to Home
          </button>
        </div>
        
        {/* Show error details in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 w-full max-w-3xl overflow-auto bg-gray-900 p-4 rounded">
            <h3 className="text-xl mb-2">Error Details:</h3>
            <p className="text-red-400 mb-2">{this.state.error && this.state.error.toString()}</p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
        )}
      </div>
    );
  }
}

export default ErrorBoundary; 
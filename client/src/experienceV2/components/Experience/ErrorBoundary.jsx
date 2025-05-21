import React, { Component } from 'react';
import logger from '../../utils/logger';

/**
 * ErrorBoundary - Component to catch and handle errors in child components
 * Provides fallback UI when errors occur
 */
class ErrorBoundary extends Component {
  // Module name for logging
  MODULE = 'ErrorBoundary';
  
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    logger.error(this.MODULE, 'Error caught by boundary:', error);
    logger.error(this.MODULE, 'Component stack:', errorInfo.componentStack);
    
    // Update state with error details
    this.setState({ errorInfo });
    
    // Report error to analytics, if available
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }
      
      // Otherwise, use the default fallback
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-2xl font-bold mb-4 text-netflix-red">Something went wrong</h2>
          <p className="mb-8">
            The experience encountered an error. You can try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-netflix-red text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Experience
          </button>
          
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
    
    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary; 
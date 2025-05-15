import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-container" role="alert">
      <h2>Something went wrong:</h2>
      <pre className="error-message">{error.message}</pre>
      <button 
        className="error-reset-button"
        onClick={resetErrorBoundary}
      >
        Try again
      </button>
    </div>
  );
}

const ErrorBoundary = ({ children }) => {
  const handleError = (error, info) => {
    // Log error to an error reporting service
    console.error('Error caught by boundary:', error, info);
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset the state of your app here
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary; 
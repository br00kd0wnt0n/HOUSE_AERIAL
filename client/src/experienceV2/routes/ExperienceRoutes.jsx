import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Experience from '../pages/Experience';
import { ExperienceProvider } from '../context/ExperienceContext';
import ErrorBoundary from '../components/Experience/ErrorBoundary';
import { Toaster } from '../../components/ui/use-toast';
import logger from '../utils/logger';

/**
 * ExperienceRoutes.jsx - Routes for the v2 experience
 * Provides routing and context wrapping for the v2 experience
 * Includes error boundary handling for graceful failure recovery
 * 
 * Features:
 * - Wraps all experience routes in error boundary
 * - Provides custom fallback UI for route-level errors
 * - Offers multiple recovery options (try again, home, reload)
 * - Logs route-level errors appropriately
 */
const ExperienceRoutes = () => {
  /**
   * Handle error boundary reset
   * Called when the user attempts to recover from an error
   */
  const handleErrorReset = () => {
    logger.info('ExperienceRoutes', 'User initiated error recovery');
    // Any additional recovery logic can go here
  };

  return (
    <ErrorBoundary
      onReset={handleErrorReset}
      fallback={(error, errorInfo, onReset, onReload, onReturnHome) => (
        <div className="min-h-screen bg-netflix-black text-white flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold text-netflix-red mb-4">Experience Error</h1>
          <p className="mb-2">We encountered an issue with the Netflix House Experience.</p>
          
          {/* Show error message in development only */}
          {process.env.NODE_ENV === 'development' && error && (
            <p className="mb-6 text-red-400 max-w-2xl text-center">{error.toString()}</p>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onReturnHome}
              className="px-4 py-2 bg-netflix-red text-white rounded hover:bg-red-700 transition-colors"
            >
              Return to Home
            </button>
            <button
              onClick={onReload}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    >
      <ExperienceProvider>
        <div className="min-h-screen bg-netflix-black text-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/experience/:locationId" 
              element={
                <ErrorBoundary
                  fallback={(error, errorInfo, onReset) => (
                    <div className="min-h-screen bg-netflix-black text-white flex flex-col items-center justify-center p-4">
                      <h2 className="text-2xl font-bold text-netflix-red mb-4">Video Experience Error</h2>
                      <p className="mb-6">There was a problem loading this experience.</p>
                      <button
                        onClick={onReset}
                        className="px-4 py-2 bg-netflix-red text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                >
                  <Experience />
                </ErrorBoundary>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </div>
      </ExperienceProvider>
    </ErrorBoundary>
  );
};

export default ExperienceRoutes; 
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';
import logger from '../../utils/logger';
import './LocationButton.css';

/**
 * LocationButton.jsx - Component for rendering location buttons in the V2 experience
 * Shows ON/OFF state on hover and handles button asset loading
 */
const LocationButton = ({ location, onButtonAssets, offButtonAssets, onClick, debugMode }) => {
  const MODULE = 'LocationButton';
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingTimeoutRef = useRef(null);

  // Check if we have valid button assets and set a timeout for loading fallback
  useEffect(() => {
    if (!onButtonAssets?.accessUrl || !offButtonAssets?.accessUrl) {
      logger.warn(MODULE, `Missing button assets for location: ${location?.name || 'unknown'}`);
      setLoadError(true);
    } else {
      logger.debug(MODULE, `Button assets found for ${location?.name}: ${onButtonAssets?.accessUrl} / ${offButtonAssets?.accessUrl}`);
      setLoadError(false);
      
      // Set a timeout for loading in case images take too long
      loadingTimeoutRef.current = setTimeout(() => {
        if (!imagesLoaded) {
          logger.warn(MODULE, `Loading timeout for location button: ${location?.name}`);
          setImagesLoaded(true); // Force loaded state after timeout
        }
      }, 5000); // 5 second timeout
    }
    
    // Clear timeout on unmount or when assets change
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [onButtonAssets, offButtonAssets, location, imagesLoaded]);

  const handleClick = () => {
    if (onClick && location) {
      onClick(location);
      logger.debug(MODULE, `Button clicked for location: ${location.name}`);
    }
  };

  // Track loading of both images
  const [onImageLoaded, setOnImageLoaded] = useState(false);
  const [offImageLoaded, setOffImageLoaded] = useState(false);
  
  // Update overall loading state when both images are loaded
  useEffect(() => {
    if (onImageLoaded && offImageLoaded) {
      setImagesLoaded(true);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    }
  }, [onImageLoaded, offImageLoaded]);

  const handleOnImageLoad = () => {
    logger.debug(MODULE, `ON button image loaded for location: ${location?.name}`);
    setOnImageLoaded(true);
  };
  
  const handleOffImageLoad = () => {
    logger.debug(MODULE, `OFF button image loaded for location: ${location?.name}`);
    setOffImageLoaded(true);
  };

  // Render fallback if assets are missing
  if (loadError) {
    return (
      <div 
        className="location-button-fallback"
        onClick={handleClick}
        aria-label={`Go to ${location?.name || 'unknown location'}`}
      >
        <span className="location-button-fallback-text">{location?.name?.substring(0, 2) || '??'}</span>
      </div>
    );
  }

  return (
    <div 
      className="location-button"
      onClick={handleClick}
      aria-label={`Go to ${location?.name || 'unknown location'}`}
    >
      {/* OFF state (shown when not hovered) */}
      <img 
        src={offButtonAssets?.accessUrl} 
        alt={`${location?.name || 'Location'} Button`}
        className={cn('location-button-image location-button-image-off')}
        onLoad={handleOffImageLoad}
      />
      
      {/* ON state (shown when hovered) */}
      <img 
        src={onButtonAssets?.accessUrl} 
        alt={`${location?.name || 'Location'} Button Active`}
        className={cn('location-button-image location-button-image-on')}
        onLoad={handleOnImageLoad}
      />
      
      {/* Debug information */}
      {debugMode && (
        <div className="location-button-debug-label">
          {location?.name}
        </div>
      )}
      
      {/* Loading overlay */}
      {!imagesLoaded && (
        <div className="location-button-loading">
          <div className="location-button-loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default LocationButton; 
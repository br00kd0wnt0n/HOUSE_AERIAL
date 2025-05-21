import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';

/**
 * LocationButton.jsx - Component for rendering location buttons in the V2 experience
 * Shows ON/OFF state on hover and handles button asset loading
 */
const LocationButton = ({ location, onButtonAssets, offButtonAssets, onClick, debugMode }) => {
  const MODULE = 'LocationButton';
  const [isHovered, setIsHovered] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Check if we have valid button assets
  useEffect(() => {
    if (!onButtonAssets?.accessUrl || !offButtonAssets?.accessUrl) {
      logger.warn(MODULE, `Missing button assets for location: ${location?.name || 'unknown'}`);
      setLoadError(true);
    } else {
      logger.info(MODULE, `Button assets found for ${location?.name}: ${onButtonAssets?.accessUrl} / ${offButtonAssets?.accessUrl}`);
      setLoadError(false);
    }
  }, [onButtonAssets, offButtonAssets, location]);

  const handleClick = () => {
    if (onClick && location) {
      onClick(location);
      logger.info(MODULE, `Button clicked for location: ${location.name}`);
    }
  };

  const handleImageLoad = () => {
    logger.info(MODULE, `Button image loaded for location: ${location?.name}`);
    setImagesLoaded(true);
  };

  // Render fallback if assets are missing
  if (loadError) {
    return (
      <div 
        className="w-36 h-36 bg-netflix-red rounded-full flex items-center justify-center cursor-pointer hover:bg-netflix-red/80 transition-all"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="text-white text-xl font-bold">{location?.name?.substring(0, 2) || '??'}</span>
      </div>
    );
  }

  // Apply direct styles to ensure proper sizing
  const buttonStyle = {
    width: '140px',
    height: '140px',
    position: 'relative',
    display: 'block',
    cursor: 'pointer',
    transition: 'transform 0.3s ease',
    transform: isHovered ? 'scale(1.1)' : 'scale(1)'
  };

  const imageStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transition: 'opacity 0.3s ease'
  };

  return (
    <div 
      style={buttonStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* OFF state (shown when not hovered) */}
      <img 
        src={offButtonAssets?.accessUrl} 
        alt={`${location?.name || 'Location'} Button`}
        style={{
          ...imageStyle,
          opacity: isHovered ? 0 : 1
        }}
        onLoad={handleImageLoad}
      />
      
      {/* ON state (shown when hovered) */}
      <img 
        src={onButtonAssets?.accessUrl} 
        alt={`${location?.name || 'Location'} Button Active`}
        style={{
          ...imageStyle,
          opacity: isHovered ? 1 : 0
        }}
        onLoad={handleImageLoad}
      />
      
      {/* Debug information */}
      {debugMode && (
        <div className="absolute -top-8 left-0 right-0 bg-black/80 text-white text-xs p-1 rounded">
          {location?.name}
        </div>
      )}
      
      {/* Loading overlay */}
      {!imagesLoaded && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
          <div className="w-4 h-4 border-2 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default LocationButton; 
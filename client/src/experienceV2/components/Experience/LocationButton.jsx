import React from 'react';
import { cn } from '../../../lib/utils';
import logger from '../../utils/logger';
import './LocationButton.css';

/**
 * LocationButton.jsx - Component for rendering location buttons in the V2 experience
 * Shows ON/OFF state on hover and handles button asset loading
 * 
 * Images are now preloaded at the parent level (LocationNavigation) to prevent flickering
 */
const LocationButton = ({ location, onButtonAssets, offButtonAssets, onClick, debugMode }) => {
  const MODULE = 'LocationButton';
  
  // Handle button click
  const handleClick = () => {
    if (onClick && location) {
      onClick(location);
      logger.debug(MODULE, `Button clicked for location: ${location.name}`);
    }
  };

  // Render fallback if assets are missing (should rarely happen since parent checks)
  if (!onButtonAssets?.accessUrl || !offButtonAssets?.accessUrl) {
    return null;
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
      />
      
      {/* ON state (shown when hovered) */}
      <img 
        src={onButtonAssets?.accessUrl} 
        alt={`${location?.name || 'Location'} Button Active`}
        className={cn('location-button-image location-button-image-on')}
      />
      
      {/* Debug information */}
      {debugMode && (
        <div className="location-button-debug-label">
          {location?.name}
        </div>
      )}
    </div>
  );
};

export default LocationButton; 
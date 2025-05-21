import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';
import logger from '../../utils/logger';
import './InfoPanel.css';

/**
 * InfoPanel.jsx - Modal panel for displaying secondary hotspot content
 * Displays either a UI element image or title/description information
 * 
 * This component is designed as a pure overlay that doesn't affect the underlying video playback.
 */
const MODULE = 'InfoPanel';

const InfoPanel = ({ hotspot, onClose }) => {
  // If no explicit onClose handler is provided, use a noop function
  const handleClose = onClose || (() => {});
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const animationTimerRef = useRef(null);
  
  // Set up visibility on mount with animation
  useEffect(() => {
    // Small delay for animation to work correctly
    animationTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    // Debug logging for the hotspot
    if (hotspot) {
      logger.debug(MODULE, "Rendering InfoPanel with hotspot:", {
        name: hotspot.name,
        type: hotspot.type,
        hasUIElement: !!hotspot.uiElement,
        uiElementAccessUrl: hotspot.uiElement?.accessUrl,
        infoPanelTitle: hotspot.infoPanel?.title
      });
    }
    
    // Clean up timer on unmount
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [hotspot]);
  
  // Handle closing with animation
  const handleCloseWithAnimation = () => {
    setIsVisible(false);
    
    // Wait for animation to complete before calling the close handler
    animationTimerRef.current = setTimeout(() => {
      handleClose();
    }, 300); // Match the transition duration
  };
  
  // Handle image load success
  const handleImageLoad = () => {
    logger.debug(MODULE, "UI element image loaded successfully");
    setImageError(false);
  };
  
  // Handle image load error
  const handleImageError = (e) => {
    logger.error(MODULE, "Error loading UI element image:", e);
    setImageError(true);
  };
  
  // Determine if the panel should show image or text content
  const hasImageContent = !!hotspot.uiElement && !imageError;
  
  return (
    <div 
      className={cn(
        'info-panel-container',
        isVisible ? 'visible' : 'hidden'
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* Modal overlay/background */}
      <div 
        className="info-panel-backdrop"
        onClick={handleCloseWithAnimation}
        aria-hidden="true"
      />
      
      {/* Modal content panel */}
      <div 
        className={cn(
          'info-panel',
          isVisible ? 'visible' : 'hidden',
          hasImageContent ? 'with-image' : 'with-text'
        )}
      >
        {/* Close button */}
        <button 
          className="info-panel-close"
          onClick={handleCloseWithAnimation}
          aria-label="Close panel"
        >
          ×
        </button>
        
        {/* Content container */}
        <div className="info-panel-content">
          {hasImageContent ? (
            // Display the UI element image
            <img 
              src={hotspot.uiElement.accessUrl} 
              alt={hotspot.name}
              className="info-panel-image" 
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            // Show text content (either fallback or primary)
            <>
              <h3 className="info-panel-title">
                {hotspot.infoPanel?.title || hotspot.name}
              </h3>
              <p className="info-panel-description">
                {hotspot.infoPanel?.description}
              </p>
              
              {/* Show error message if image failed to load */}
              {imageError && hotspot.uiElement && (
                <div className="info-panel-error">
                  <p>Failed to load image. Showing fallback content.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel; 
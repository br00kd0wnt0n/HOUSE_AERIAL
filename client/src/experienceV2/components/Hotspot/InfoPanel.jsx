import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import logger from '../../utils/logger';

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
  
  // Set animation on mount
  useEffect(() => {
    // Small delay for animation to work correctly
    const timer = setTimeout(() => {
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
    
    return () => clearTimeout(timer);
  }, [hotspot]);
  
  // Handle closing with animation
  const handleCloseWithAnimation = () => {
    setIsVisible(false);
    // Wait for animation to complete before calling the close handler
    setTimeout(() => {
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
  
  // CSS classes for the container, using conditional opacity for animation
  const containerClasses = cn(
    "fixed inset-0 flex items-center justify-center",
    "transition-opacity duration-300",
    "pointer-events-none", // Don't capture pointer events by default
    isVisible ? "opacity-100" : "opacity-0"
  );
  
  // CSS classes for the backdrop
  const backdropClasses = cn(
    "absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer",
    "pointer-events-auto", // Make backdrop clickable
    "z-[9000]" // Ensure backdrop is above everything but below modal
  );
  
  // CSS classes for the modal panel
  const panelClasses = cn(
    "relative bg-[#111] border-[5px] border-netflix-red rounded-lg",
    "shadow-xl overflow-hidden",
    "transform transition-transform duration-300",
    "flex flex-col justify-center",
    "w-auto max-w-[95%] max-h-[95vh]",
    "pointer-events-auto", // Make panel clickable
    "z-[9001]", // Higher z-index than backdrop
    isVisible ? "scale-100" : "scale-90",
    // Use less padding for images
    hotspot.uiElement ? "p-2" : "p-5"
  );
  
  return (
    <div 
      className={containerClasses}
      style={{
        // Use !important to ensure these styles are applied
        position: 'fixed !important',
        zIndex: 9000,
        // Prevent any layout shifts by enforcing size and position
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        // Don't affect document flow
        pointerEvents: 'none'
      }}
    >
      {/* Modal overlay/background */}
      <div 
        className={backdropClasses}
        onClick={handleCloseWithAnimation}
      ></div>
      
      {/* Modal content panel */}
      <div className={panelClasses}>
        {/* Close button */}
        <button 
          className="absolute top-2 right-2 text-3xl text-white hover:text-netflix-red 
                    transition-colors z-10 h-8 w-8 flex items-center justify-center"
          onClick={handleCloseWithAnimation}
        >
          ×
        </button>
        
        {/* Content container */}
        <div className="w-full h-full overflow-auto flex flex-col items-center justify-center">
          {hotspot.uiElement ? (
            // Display the UI element image
            <>
              <img 
                src={hotspot.uiElement.accessUrl} 
                alt={hotspot.name}
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain mx-auto min-w-[300px]" 
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {imageError && (
                <div className="text-center text-red-500 mt-4">
                  <p>Failed to load image. Showing fallback content.</p>
                  <h3 className="text-xl font-bold text-white mt-4">{hotspot.infoPanel?.title || hotspot.name}</h3>
                  <p className="text-gray-300">{hotspot.infoPanel?.description}</p>
                </div>
              )}
            </>
          ) : (
            // Fallback to the original text display
            <>
              <h3 className="text-xl font-bold text-white mb-2">{hotspot.infoPanel?.title || hotspot.name}</h3>
              <p className="text-gray-300">{hotspot.infoPanel?.description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel; 
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import './HotspotOverlay.css';
import logger from '../../utils/logger';

/**
 * HotspotOverlay.jsx - Component for rendering hotspots in the V2 experience
 * Uses a fixed coordinate system to match hotspot positions from the admin panel
 */
const HotspotOverlay = ({ hotspots, onHotspotClick, videoRef }) => {
  // Module name for logging
  const MODULE = 'HotspotOverlay';
  
  // Create a ref for the SVG element
  const svgRef = useRef(null);
  // State to track the SVG viewBox
  const [svgViewBox, setSvgViewBox] = useState('0 0 100 100');
  // State to track video dimensions
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  // State to track the video display area
  const [displayArea, setDisplayArea] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  // Ref to mark update is in progress 
  const updateInProgressRef = useRef(false);
  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  // Debug mode state
  const [debugMode, setDebugMode] = useState(true); // Enable by default for testing

  // Set mounted flag on component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Debug keyboard shortcut (Ctrl+Shift+D)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => {
          const newValue = !prev;
          logger.info(MODULE, `Debug mode ${newValue ? 'enabled' : 'disabled'}`);
          return newValue;
        });
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    logger.info(MODULE, 'Debug mode is ON by default for testing. Press Ctrl+Shift+D to toggle.');
    
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Function to check if we have a valid video element
  const checkVideoElement = useCallback(() => {
    if (!videoRef || !videoRef.current) {
      return null;
    }
    
    try {
      return videoRef.current;
    } catch (err) {
      logger.error(MODULE, 'Error accessing video element:', err);
      return null;
    }
  }, [videoRef]);
  
  // Create a debounced update function
  const debouncedUpdateSvgDimensions = useCallback(() => {
    let timeoutId = null;
    
    return function executeDebouncedUpdate() {
      if (!isMountedRef.current || updateInProgressRef.current) {
        return;
      }
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        updateInProgressRef.current = true;
        
        // Check for video element
        const videoEl = checkVideoElement();
        if (!videoEl || !svgRef.current) {
          updateInProgressRef.current = false;
          return;
        }
        
        // Get video dimensions
        let videoRect;
        try {
          videoRect = videoEl.getBoundingClientRect();
        } catch (err) {
          logger.error(MODULE, 'Error getting video rect:', err);
          updateInProgressRef.current = false;
          return;
        }
        
        // Check for valid dimensions
        if (!videoRect || videoRect.width === 0 || videoRect.height === 0) {
          updateInProgressRef.current = false;
          return;
        }
        
        // Get container dimensions (parent of video)
        const containerEl = videoEl.parentElement;
        let containerRect;
        
        if (containerEl) {
          try {
            containerRect = containerEl.getBoundingClientRect();
          } catch (err) {
            containerRect = {...videoRect};
          }
        } else {
          containerRect = {...videoRect};
        }
        
        // Use the natural video dimensions if available, otherwise fallback
        const naturalWidth = videoEl.videoWidth || 1920; // Default to 1080p dimensions
        const naturalHeight = videoEl.videoHeight || 1080;
        
        // Store the current video dimensions
        setVideoDimensions({
          width: videoRect.width,
          height: videoRect.height,
          naturalWidth: naturalWidth,
          naturalHeight: naturalHeight,
          aspectRatio: videoRect.width / videoRect.height,
          naturalAspect: naturalWidth / naturalHeight
        });
        
        // Calculate the actual visible dimensions of the video using the same approach as the admin panel
        const widthScale = containerRect.width / naturalWidth;
        const heightScale = containerRect.height / naturalHeight;
        const uniformScaleFactor = Math.min(widthScale, heightScale);
        
        // Apply the uniform scale factor to the natural dimensions
        const displayWidth = naturalWidth * uniformScaleFactor;
        const displayHeight = naturalHeight * uniformScaleFactor;
        
        // Calculate offsets for letterboxing/pillarboxing
        const offsetX = (containerRect.width - displayWidth) / 2;
        const offsetY = (containerRect.height - displayHeight) / 2;
        
        // Store display area values
        setDisplayArea({
          width: displayWidth,
          height: displayHeight,
          offsetX,
          offsetY,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height
        });
        
        // Use consistent 0-100 coordinates for SVG viewBox
        const svgWidth = 100;
        const svgHeight = 100;
        
        const viewBoxValue = `0 0 ${svgWidth} ${svgHeight}`;
        setSvgViewBox(viewBoxValue);
        
        // Force parent overlay to match container
        const overlayEl = svgRef.current?.parentElement;
        if (overlayEl) {
          overlayEl.style.width = `${containerRect.width}px`;
          overlayEl.style.height = `${containerRect.height}px`;
        }
        
        updateInProgressRef.current = false;
      }, 100);
    };
  }, [checkVideoElement]);

  // Effect to adjust the SVG viewBox based on the video's dimensions
  useEffect(() => {
    // Create a reference to the debounced function
    const updateDimensions = debouncedUpdateSvgDimensions();
    
    // Initial update with delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        updateDimensions();
      }
    }, 200);
    
    // Update when video ref changes
    if (videoRef?.current) {
      updateDimensions();
    }
    
    // Set up event listeners for changes
    window.addEventListener('resize', updateDimensions);
    
    // Get video element
    const videoEl = videoRef?.current;
    
    if (videoEl) {
      // Listen for video events
      const videoEvents = [
        'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
        'playing', 'resize', 'durationchange'
      ];
      
      videoEvents.forEach(event => {
        videoEl.addEventListener(event, updateDimensions);
      });
      
      // Regular check for changes
      const checkIntervalId = setInterval(updateDimensions, 5000);
      
      return () => {
        // Clean up all listeners
        window.removeEventListener('resize', updateDimensions);
        clearInterval(checkIntervalId);
        clearTimeout(initialTimeout);
        
        if (videoEl) {
          videoEvents.forEach(event => {
            videoEl.removeEventListener(event, updateDimensions);
          });
        }
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(initialTimeout);
    };
  }, [videoRef, hotspots, debouncedUpdateSvgDimensions]);

  // Helper function to create polygon points for SVG
  const createSvgPoints = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return '';
    
    // Since SVG viewBox is 0 0 100 100, convert normalized coords to percentages
    return coordinates.map(coord => `${coord.x * 100},${coord.y * 100}`).join(' ');
  };
  
  // Helper to calculate hotspot position adjusting for letterboxing
  const getHotspotPosition = (hotspot) => {
    if (!displayArea.width || !displayArea.height) {
      // Fall back to original coordinates if display area is not calculated
      return {
        left: `${hotspot.centerPoint.x * 100}%`,
        top: `${hotspot.centerPoint.y * 100}%`
      };
    }
    
    // Get normalized coordinates (0-1)
    const normalizedX = hotspot.centerPoint.x;
    const normalizedY = hotspot.centerPoint.y;
    
    // Use EXACTLY the same approach as the admin panel
    const naturalWidth = videoDimensions.naturalWidth || 1920;
    const naturalHeight = videoDimensions.naturalHeight || 1080;
    
    // Get container dimensions
    const containerWidth = displayArea.containerWidth;
    const containerHeight = displayArea.containerHeight;
    
    // Calculate scale factors for each dimension
    const widthScale = displayArea.width / naturalWidth;
    const heightScale = displayArea.height / naturalHeight;
    
    // Use the limiting dimension scale factor
    const uniformScaleFactor = Math.min(widthScale, heightScale);
    
    // Apply uniform scale factor to natural dimensions
    const scaledX = normalizedX * naturalWidth * uniformScaleFactor;
    const scaledY = normalizedY * naturalHeight * uniformScaleFactor;
    
    // Add offsets for letterboxing/pillarboxing
    const absoluteX = scaledX + displayArea.offsetX;
    const absoluteY = scaledY + displayArea.offsetY;
    
    // Convert to percentage of container for CSS positioning
    const xPercent = (absoluteX / containerWidth) * 100;
    const yPercent = (absoluteY / containerHeight) * 100;
    
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
    };
  };

  // Don't render anything if no hotspots or video not ready
  if (!hotspots || hotspots.length === 0 || !displayArea.width) {
    logger.debug(MODULE, `Not rendering hotspots: ${!hotspots ? 'no hotspots array' : hotspots.length === 0 ? 'empty hotspots array' : 'no display area'}`);
    return null;
  }
  
  // Log hotspots when in debug mode
  if (debugMode) {
    console.log('Hotspots data:', hotspots);
    logger.info(MODULE, `Rendering ${hotspots.length} hotspots with debug mode ON`);
  }
  
  // Count valid hotspots
  const validPolygonHotspots = hotspots.filter(h => 
    h.coordinates && 
    Array.isArray(h.coordinates) && 
    h.coordinates.length >= 3
  );
  
  if (validPolygonHotspots.length !== hotspots.length) {
    logger.warn(MODULE, `Only ${validPolygonHotspots.length} of ${hotspots.length} hotspots have valid polygons`);
  }
  
  return (
    <div className="hotspot-overlay">
      {/* SVG layer for polygon hotspots */}
      <svg 
        className="hotspot-svg" 
        viewBox={svgViewBox} 
        preserveAspectRatio="none"
        ref={svgRef}
        style={{
          // Ensure the SVG matches the exact dimensions and position of the video
          position: 'absolute',
          top: `${displayArea.offsetY}px`,
          left: `${displayArea.offsetX}px`,
          width: `${displayArea.width}px`,
          height: `${displayArea.height}px`,
          pointerEvents: 'none'
        }}
      >
        {/* Render SVG polygons for hotspots */}
        {hotspots.map(hotspot => 
          hotspot.coordinates && hotspot.coordinates.length >= 3 ? (
            <polygon 
              key={`poly-${hotspot._id}`}
              className={cn(
                "hotspot-polygon", 
                `${hotspot.type.toLowerCase()}-polygon`,
                { "debug-visible": debugMode }
              )}
              points={createSvgPoints(hotspot.coordinates)}
              onClick={() => onHotspotClick(hotspot)}
            />
          ) : null
        )}
      </svg>
      
      {/* Map pins and hotspots */}
      {hotspots.map(hotspot => {
        // Get the adjusted position for this hotspot
        const position = getHotspotPosition(hotspot);
        
        return (
          <div 
            key={`hotspot-${hotspot._id}`}
            className={cn("hotspot-wrapper", { "debug-visible": debugMode })}
            style={{
              left: position.left,
              top: position.top
            }}
            onClick={() => onHotspotClick(hotspot)}
          >
            {/* Debug indicator for hotspot position */}
            {debugMode && (
              <div className="debug-hotspot-marker">
                <span className="debug-hotspot-name">{hotspot.name}</span>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Debug panel */}
      {debugMode && (
        <div className="debug-panel">
          <h3>Debug Info</h3>
          <p>Hotspots: {hotspots.length}</p>
          <p>Press Ctrl+Shift+D to toggle debug mode</p>
        </div>
      )}
    </div>
  );
};

export default HotspotOverlay; 
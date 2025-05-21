import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import './HotspotOverlay.css';
import logger from '../../utils/logger';

/**
 * HotspotOverlay.jsx - Component for rendering hotspots in the V2 experience
 * Uses a fixed coordinate system to match hotspot positions from the admin panel
 */
const HotspotOverlay = ({ hotspots, onHotspotClick, videoRef, debugMode: externalDebugMode }) => {
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
  // Internal debug mode state - can be overridden by prop
  const [internalDebugMode, setInternalDebugMode] = useState(false);
  // State to track caching info
  const [cacheInfo, setCacheInfo] = useState({
    serviceWorkerActive: false,
    cachedResources: 0,
    cacheNames: []
  });
  
  // Combine internal and external debug modes - either can enable it
  const debugMode = externalDebugMode || internalDebugMode;

  // Set mounted flag on component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Debug keyboard shortcut (Ctrl+Shift+D)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setInternalDebugMode(prev => {
          const newValue = !prev;
          logger.info(MODULE, `Debug mode ${newValue ? 'enabled' : 'disabled'} (internal)`);
          return newValue;
        });
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Only log in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.info(MODULE, 'Debug mode shortcuts are available with Ctrl+Shift+D');
    }
    
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Function to fetch caching information when debug mode is enabled
  useEffect(() => {
    if (debugMode && 'serviceWorker' in navigator && 'caches' in window) {
      // Check for active service worker
      navigator.serviceWorker.getRegistration().then(registration => {
        const isActive = !!registration && !!registration.active;
        setCacheInfo(prev => ({ ...prev, serviceWorkerActive: isActive }));
        
        if (isActive) {
          logger.debug(MODULE, 'Service worker is active');
        }
      }).catch(err => {
        logger.error(MODULE, 'Error checking service worker status:', err);
      });
      
      // Get cache names
      caches.keys().then(cacheNames => {
        setCacheInfo(prev => ({ ...prev, cacheNames }));
        
        // For each cache, count entries
        let totalCachedResources = 0;
        const promises = cacheNames.map(name => 
          caches.open(name).then(cache => 
            cache.keys().then(keys => {
              totalCachedResources += keys.length;
              return keys.length;
            })
          )
        );
        
        Promise.all(promises).then(() => {
          setCacheInfo(prev => ({ ...prev, cachedResources: totalCachedResources }));
        });
      }).catch(err => {
        logger.error(MODULE, 'Error retrieving cache information:', err);
      });
    }
  }, [debugMode]);

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
    
    // Track if we've already applied fallback dimensions to avoid redundant messages
    let fallbackApplied = false;
    
    // Initial update with delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        updateDimensions();
        
        // Only log this once, not on every render
        if (process.env.NODE_ENV !== 'production') {
          logger.info(MODULE, `Running initial dimensions update (delayed)`);
        }
        
        // FALLBACK: If after 1 second we still don't have dimensions, force some reasonable values
        setTimeout(() => {
          if (isMountedRef.current && (!displayArea.width || displayArea.width === 0) && !fallbackApplied) {
            fallbackApplied = true;
            logger.warn(MODULE, `Dimensions still not set after delay. Forcing fallback dimensions.`);
            
            // Force some reasonable dimensions based on the video element
            const videoEl = checkVideoElement();
            if (videoEl) {
              const videoRect = videoEl.getBoundingClientRect();
              if (videoRect.width > 0 && videoRect.height > 0) {
                setDisplayArea({
                  width: videoRect.width,
                  height: videoRect.height,
                  offsetX: 0,
                  offsetY: 0,
                  containerWidth: videoRect.width,
                  containerHeight: videoRect.height,
                  isFallback: true
                });
                
                setSvgViewBox('0 0 100 100');
                logger.info(MODULE, `Applied fallback dimensions: ${videoRect.width}x${videoRect.height}`);
              }
            }
          }
        }, 1000);
      }
    }, 200);
    
    // Update when video ref changes
    if (videoRef?.current) {
      updateDimensions();
      // Only log in development, not in production
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(MODULE, 'Updating dimensions from new video ref');
      }
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
  }, [videoRef, hotspots, debouncedUpdateSvgDimensions, checkVideoElement, displayArea.width]);

  // Helper function to create polygon points for SVG
  const createSvgPoints = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return '';
    
    // Convert normalized coordinates to percentage values for SVG
    return coordinates.map(coord => `${coord.x * 100},${coord.y * 100}`).join(' ');
  };

  // Get the polygon class based on hotspot type
  const getHotspotPolygonClass = (hotspot) => {
    const baseClass = 'hotspot-polygon';
    
    // Add type-specific class
    if (hotspot.type === 'PRIMARY') {
      return `${baseClass} primary-polygon`;
    } else if (hotspot.type === 'SECONDARY') {
      return `${baseClass} secondary-polygon`;
    }
    
    return baseClass;
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

  // Count hotspots by type
  const getHotspotCounts = () => {
    const counts = {
      total: hotspots?.length || 0,
      primary: 0,
      secondary: 0,
      other: 0,
      validPolygons: 0
    };

    if (hotspots && hotspots.length > 0) {
      hotspots.forEach(hotspot => {
        if (hotspot.type === 'PRIMARY') counts.primary++;
        else if (hotspot.type === 'SECONDARY') counts.secondary++;
        else counts.other++;

        if (hotspot.coordinates && Array.isArray(hotspot.coordinates) && hotspot.coordinates.length >= 3) {
          counts.validPolygons++;
        }
      });
    }

    return counts;
  };

  // Format a number to 2 decimal places
  const formatNumber = (num) => {
    return typeof num === 'number' ? Math.round(num * 100) / 100 : 'N/A';
  };

  // Don't render anything if no hotspots or video not ready
  if (!hotspots || hotspots.length === 0) {
    logger.debug(MODULE, `Not rendering hotspots: ${!hotspots ? 'no hotspots array' : 'empty hotspots array'}`);
    return null;
  }
  
  // Show warning if dimensions aren't set but we have hotspots
  if ((hotspots?.length > 0) && (!displayArea.width || !displayArea.height)) {
    logger.warn(MODULE, 'Display area dimensions not set, but attempting to render hotspots anyway');
  }
  
  // Log hotspots when in debug mode - but only in development
  if (debugMode && process.env.NODE_ENV !== 'production') {
    console.log('Hotspots data:', hotspots);
    logger.debug(MODULE, `Rendering ${hotspots.length} hotspots with debug mode ON`);
  }
  
  // Get hotspot counts for debug info
  const hotspotCounts = getHotspotCounts();
  
  return (
    <div className="hotspot-overlay" tabIndex={0}>
      {/* SVG layer for polygon hotspots */}
      <svg 
        className={`hotspot-svg ${debugMode ? 'debug-mode' : ''}`}
        viewBox={svgViewBox} 
        preserveAspectRatio="none"
        ref={svgRef}
        style={{
          // Set the size and position based on calculated display area
          position: 'absolute',
          top: `${displayArea.offsetY}px`,
          left: `${displayArea.offsetX}px`,
          width: `${displayArea.width}px`,
          height: `${displayArea.height}px`,
          pointerEvents: 'none', // Allow click through to videoRef element
          zIndex: 10 // Above video but below UI
        }}
      >
        {/* Render polygons for each hotspot */}
        {hotspots.filter(hotspot => hotspot.coordinates && hotspot.coordinates.length >= 3).map(hotspot => (
          <polygon 
            key={`hotspot-${hotspot._id}`}
            className={getHotspotPolygonClass(hotspot)}
            points={createSvgPoints(hotspot.coordinates)}
            onClick={(e) => {
              e.stopPropagation();
              onHotspotClick(hotspot);
            }}
          />
        ))}
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
      
      {/* Enhanced Debug panel positioned at bottom right */}
      {debugMode && (
        <div className="debug-panel">
          <h3>Debug Info</h3>
          
          {/* Warning if dimensions aren't set */}
          {!displayArea.width && (
            <div className="warning">
              <strong>⚠️ Warning:</strong> Display area dimensions not set!
            </div>
          )}
          
          {/* Hotspot info section */}
          <div className="section">
            <strong>Hotspots:</strong>
            <ul>
              <li>Total: {hotspotCounts.total}</li>
              <li>Primary: {hotspotCounts.primary}</li>
              <li>Secondary: {hotspotCounts.secondary}</li>
              <li>Other: {hotspotCounts.other}</li>
              <li>Valid Polygons: {hotspotCounts.validPolygons}</li>
            </ul>
          </div>
          
          {/* Video info section */}
          <div className="section">
            <strong>Video Dimensions:</strong>
            <ul>
              <li>Display: {formatNumber(videoDimensions.width)}×{formatNumber(videoDimensions.height)}</li>
              <li>Natural: {formatNumber(videoDimensions.naturalWidth)}×{formatNumber(videoDimensions.naturalHeight)}</li>
              <li>Aspect: {formatNumber(videoDimensions.aspectRatio)} (display), {formatNumber(videoDimensions.naturalAspect)} (natural)</li>
            </ul>
          </div>
          
          {/* Display area info */}
          <div className="section">
            <strong>Display Area:</strong>
            <ul>
              <li>Size: {formatNumber(displayArea.width)}×{formatNumber(displayArea.height)}</li>
              <li>Offset: ({formatNumber(displayArea.offsetX)}, {formatNumber(displayArea.offsetY)})</li>
              <li>Container: {formatNumber(displayArea.containerWidth)}×{formatNumber(displayArea.containerHeight)}</li>
              <li>Fallback: {displayArea.isFallback ? 'Yes' : 'No'}</li>
            </ul>
          </div>
          
          {/* SVG info */}
          <div className="section">
            <strong>SVG Info:</strong>
            <ul>
              <li>ViewBox: {svgViewBox}</li>
            </ul>
          </div>
          
          {/* Cache info */}
          <div className="section">
            <strong>Caching Info:</strong>
            <ul>
              <li>Service Worker: {cacheInfo.serviceWorkerActive ? 'Active' : 'Inactive'}</li>
              <li>Cache Storage: {cacheInfo.cachedResources} items</li>
              <li>Cache Names: {cacheInfo.cacheNames.length > 0 ? 
                cacheInfo.cacheNames.join(', ') : 'None found'}</li>
            </ul>
          </div>
          
          <div className="keyboard-hint">
            Press Ctrl+Shift+D to toggle debug mode
          </div>
        </div>
      )}
    </div>
  );
};

export default HotspotOverlay; 
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useVideo } from '../../context/VideoContext';
import './HotspotOverlay.css';

// Remove unused debounce function
const HotspotOverlay = ({ hotspots, onHotspotClick, directVideoRef }) => {
  // Get handleHotspotClick from props if provided, otherwise fall back to context
  const { handleHotspotClick: contextHandleHotspotClick, aerialVideoRef } = useVideo();
  // Use the prop handler if provided, otherwise use the context handler
  const handleClick = onHotspotClick || contextHandleHotspotClick;
  // Create a ref for the SVG element
  const svgRef = useRef(null);
  // State to track the SVG viewBox
  const [svgViewBox, setSvgViewBox] = useState('0 0 100 100');
  // State to track video dimensions
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  // State to track the video display area
  const [displayArea, setDisplayArea] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  // Add a ref to mark the update is in progress 
  const updateInProgressRef = useRef(false);
  // Add a ref to store video element attributes
  const videoAttrsRef = useRef({});
  // Add a ref to track last dimensions to avoid unnecessary updates
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  // Add a counter for update attempts to limit frequency
  const updateAttemptsRef = useRef(0);
  // Track if component is mounted
  const isMountedRef = useRef(false);

  // Direct video element check function - prioritize directVideoRef prop over context ref
  const checkVideoElement = useCallback(() => {
    // First try to use the direct reference passed as a prop
    const videoEl = directVideoRef || aerialVideoRef?.current;
    
    if (!videoEl) {
      return null;
    }
    
    try {
      // Store video properties
      videoAttrsRef.current = {
        videoWidth: videoEl.videoWidth,
        videoHeight: videoEl.videoHeight,
        width: videoEl.width,
        height: videoEl.height,
        offsetWidth: videoEl.offsetWidth,
        offsetHeight: videoEl.offsetHeight,
        clientWidth: videoEl.clientWidth,
        clientHeight: videoEl.clientHeight,
        currentSrc: videoEl.currentSrc?.substring(0, 50) + '...',
        paused: videoEl.paused,
        ended: videoEl.ended,
        playbackRate: videoEl.playbackRate,
        readyState: videoEl.readyState,
        seeking: videoEl.seeking,
        networkState: videoEl.networkState,
        source: directVideoRef ? 'directVideoRef prop' : 'aerialVideoRef context'
      };
      
      return videoEl;
    } catch (err) {
      return null;
    }
  }, [directVideoRef, aerialVideoRef]);
  
  // Set mounted flag on component mount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Create a debounced update function to prevent too many rapid calls
  const debouncedUpdateSvgDimensions = useCallback(() => {
    // Using a closure to maintain state between calls
    let timeoutId = null;
    
    // Return a function that implements debounce
    return function executeDebouncedUpdate() {
      if (!isMountedRef.current || updateInProgressRef.current) {
        return;
      }
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        updateInProgressRef.current = true;
        
        // Check and log video element first
        const videoEl = checkVideoElement();
        if (!videoEl) {
          updateInProgressRef.current = false;
          return;
        }
        
        if (!svgRef.current) {
          updateInProgressRef.current = false;
          return;
        }
        
        // First check - is the video actually visible and has dimensions?
        let videoRect;
        try {
          videoRect = videoEl.getBoundingClientRect();
        } catch (err) {
          updateInProgressRef.current = false;
          return;
        }
        
        // Skip update if dimensions haven't changed significantly (within 1px)
        if (Math.abs(lastDimensionsRef.current.width - videoRect.width) < 1 && 
            Math.abs(lastDimensionsRef.current.height - videoRect.height) < 1) {
          updateInProgressRef.current = false;
          return;
        }
        
        // Update the last dimensions
        lastDimensionsRef.current = {
          width: videoRect.width,
          height: videoRect.height
        };
        
        // If getBoundingClientRect fails or returns zero dimensions, try alternative methods
        if (!videoRect || videoRect.width === 0 || videoRect.height === 0) {
          // Try using offsetWidth/Height
          if (videoEl.offsetWidth && videoEl.offsetHeight) {
            videoRect = {
              width: videoEl.offsetWidth,
              height: videoEl.offsetHeight,
              top: 0,
              left: 0,
              right: videoEl.offsetWidth,
              bottom: videoEl.offsetHeight
            };
          } 
          // If that fails too, try a fixed aspect ratio based on parent element
          else {
            const parentEl = videoEl.parentElement;
            if (parentEl && parentEl.offsetWidth && parentEl.offsetHeight) {
              // Assume 16:9 aspect ratio if no natural dimensions available
              const aspectRatio = videoEl.videoWidth && videoEl.videoHeight ? 
                                (videoEl.videoWidth / videoEl.videoHeight) : 16/9;
              
              videoRect = {
                width: parentEl.offsetWidth,
                height: parentEl.offsetWidth / aspectRatio,
                top: 0,
                left: 0,
                right: parentEl.offsetWidth,
                bottom: parentEl.offsetWidth / aspectRatio
              };
            } else {
              // Last resort - use a fixed size
              videoRect = { width: 1280, height: 720, top: 0, left: 0, right: 1280, bottom: 720 };
            }
          }
        }
        
        // Calculate container dimensions - use parent of video
        const containerEl = videoEl.parentElement;
        let containerRect;
        
        if (containerEl) {
          try {
            containerRect = containerEl.getBoundingClientRect();
          } catch (err) {
            // Fallback to video dimensions
            containerRect = {...videoRect};
          }
        } else {
          // Fallback to video dimensions
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
        
        // Calculate the actual visible dimensions of the video
        let displayWidth, displayHeight;
        let offsetX = 0, offsetY = 0;
        
        // Use the same scaling approach as the admin panel
        const widthScale = containerRect.width / naturalWidth;
        const heightScale = containerRect.height / naturalHeight;
        const uniformScaleFactor = Math.min(widthScale, heightScale);
        
        // Apply the uniform scale factor to the natural dimensions
        displayWidth = naturalWidth * uniformScaleFactor;
        displayHeight = naturalHeight * uniformScaleFactor;
        
        // Calculate offsets for letterboxing/pillarboxing
        offsetX = (containerRect.width - displayWidth) / 2;
        offsetY = (containerRect.height - displayHeight) / 2;
        
        // Store these values for use in rendering
        setDisplayArea({
          width: displayWidth,
          height: displayHeight,
          offsetX,
          offsetY,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height
        });
        
        // Set the SVG viewBox to match the natural video aspect ratio
        // Use consistent 0-100 coordinates for SVG viewBox, regardless of video dimensions
        // This is crucial - SVG coordinates need to match the polygon coordinate system
        const svgWidth = 100;
        const svgHeight = 100; // Use 100 x 100 viewBox - coordinates are percentage-based
        
        const viewBoxValue = `0 0 ${svgWidth} ${svgHeight}`;
        setSvgViewBox(viewBoxValue);
        
        // The SVG style is now set directly in the JSX
        // No need to set styles here anymore
        if (!svgRef.current) {
          updateInProgressRef.current = false;
          return;
        }
        
        // Force parent overlay to match container
        const overlayEl = svgRef.current?.parentElement;
        if (overlayEl) {
          overlayEl.style.width = `${containerRect.width}px`;
          overlayEl.style.height = `${containerRect.height}px`;
        }
        
        // Release the update flag
        updateInProgressRef.current = false;
      }, 100);
    };
  }, [checkVideoElement, isMountedRef]);

  // Effect to adjust the SVG viewBox based on the video's actual displayed dimensions
  useEffect(() => {
    // Create a reference to the debounced function that we'll use in this effect
    const updateDimensions = debouncedUpdateSvgDimensions();
    
    // Because the SVG ref isn't available on the first render,
    // we need to wait a small amount of time before the first calculation
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        updateDimensions();
      }
    }, 200);
    
    // Check and recalculate dimensions when video reference changes
    if (directVideoRef) {
      updateDimensions();
    }
    
    // Set up event listeners for changes
    window.addEventListener('resize', updateDimensions);
    
    // First try direct video ref, fall back to context ref
    const videoEl = directVideoRef || (aerialVideoRef && aerialVideoRef.current);
    
    if (videoEl) {
      // Listen for all relevant video events
      const videoEvents = [
        'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
        'playing', 'resize', 'durationchange'
      ];
      
      videoEvents.forEach(event => {
        videoEl.addEventListener(event, () => {
          updateDimensions();
        });
      });
      
      // Also add a MutationObserver to detect DOM/style changes
      let observer;
      try {
        observer = new MutationObserver((mutations) => {
          // Skip minor mutations to prevent loops
          if (mutations.length > 1) {
            updateDimensions();
          }
        });
        
        observer.observe(videoEl, { 
          attributes: true, 
          attributeFilter: ['style', 'class', 'width', 'height']
        });
      } catch (err) {
        // Silent error handling
      }
      
      // Use a less frequent check instead of the constant interval
      // Only check every 5 seconds to catch any missed changes
      const checkIntervalId = setInterval(() => {
        if (updateAttemptsRef.current > 20) {
          // If we've updated 20+ times, reduce frequency to avoid unnecessary work
          if (Math.random() < 0.2) { // Only update ~20% of the time
            updateDimensions();
          }
        } else {
          updateDimensions();
          updateAttemptsRef.current++;
        }
      }, 5000);
      
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
        
        if (observer) {
          observer.disconnect();
        }
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(initialTimeout);
    };
  }, [aerialVideoRef, hotspots, directVideoRef, debouncedUpdateSvgDimensions, isMountedRef]);

  // Helper function to create polygon points for SVG
  const createSvgPoints = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return '';
    
    // Since our SVG viewBox is now 0 0 100 100, we just need to convert normalized coords to percentages
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
    
    // Use the limiting dimension scale factor (min of width or height scale)
    // This is the key to matching the admin panel calculation
    const uniformScaleFactor = Math.min(widthScale, heightScale);
    
    // Apply uniform scale factor to natural dimensions
    const scaledX = normalizedX * naturalWidth * uniformScaleFactor;
    const scaledY = normalizedY * naturalHeight * uniformScaleFactor;
    
    // Add offsets for letterboxing/pillarboxing
    const absoluteX = scaledX + displayArea.offsetX;
    const absoluteY = scaledY + displayArea.offsetY;
    
    // Apply correction factors to better match admin panel positioning
    // Adjust these values based on observed differences between views
    const correctionFactorX = 0.99; // Slight adjustment for X position
    const correctionFactorY = 0.97; // Slightly more adjustment for Y position
    
    // Apply corrections - adjust these values as needed
    const correctedX = absoluteX * correctionFactorX;
    const correctedY = absoluteY * correctionFactorY;
    
    // Convert to percentage of container for CSS positioning
    const xPercent = (correctedX / containerWidth) * 100;
    const yPercent = (correctedY / containerHeight) * 100;
    
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
    };
  };

  if (!hotspots || hotspots.length === 0) {
    return null;
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
              className={`hotspot-polygon ${hotspot.type.toLowerCase()}-polygon`}
              points={createSvgPoints(hotspot.coordinates)}
              onClick={() => handleClick(hotspot)}
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
            className="hotspot-wrapper"
            style={{
              left: position.left,
              top: position.top
            }}
            onClick={() => handleClick(hotspot)}
          >
            {/* Map pin */}
            {hotspot.mapPin && (
              <div className="map-pin-container">
                <img 
                  src={hotspot.mapPin.accessUrl} 
                  alt={`${hotspot.name} map pin`}
                  className="map-pin-image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(hotspot);
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTEyIDJjMy4zMSAwIDYgMi42OSA2IDYgMCAyLjkzLTMuNiA3LjQ3LTYgMTAuMDgtMi40LTIuNjEtNi03LjE1LTYtMTAuMDggMC0zLjMxIDIuNjktNiA2LTZabTAgM2MtMS42NiAwLTMgMS4zNC0zIDNzMS4zNCAzIDMgMyAzLTEuMzQgMy0zLTEuMzQtMy0zLTNaIiBmaWxsPSIjRTUwOTE0Ii8+PC9zdmc+';
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HotspotOverlay;
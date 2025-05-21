import { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../utils/logger';

const MODULE = 'DimensionCalculator';

/**
 * Custom hook for calculating video dimensions and managing display coordinates
 */
export function useDimensionCalculator({ videoRef, debugMode = false }) {
  // State to track the SVG viewBox
  const [svgViewBox, setSvgViewBox] = useState('0 0 100 100');
  
  // State to track video dimensions
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  
  // State to track the video display area
  const [displayArea, setDisplayArea] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  
  // Refs for internal tracking
  const updateInProgressRef = useRef(false);
  const isMountedRef = useRef(true);
  const dimensionsSetRef = useRef(false);
  
  // Set mounted flag on component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
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
  const debouncedUpdateDimensions = useCallback(() => {
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
        if (!videoEl) {
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
        
        // Mark dimensions as successfully set
        dimensionsSetRef.current = true;
        
        // Use consistent 0-100 coordinates for SVG viewBox
        const svgWidth = 100;
        const svgHeight = 100;
        
        const viewBoxValue = `0 0 ${svgWidth} ${svgHeight}`;
        setSvgViewBox(viewBoxValue);
        
        updateInProgressRef.current = false;
      }, 100);
    };
  }, [checkVideoElement]);
  
  // Apply immediate fallback dimensions if needed
  useEffect(() => {
    // Only apply immediate fallback if dimensions haven't been set yet
    if (!displayArea.width && !dimensionsSetRef.current) {
      logger.info(MODULE, 'Applying immediate fallback dimensions on mount');
      
      // Try to get dimensions from video first
      const videoEl = checkVideoElement();
      if (videoEl && videoEl.videoWidth && videoEl.videoHeight) {
        // Video has natural dimensions, use them
        const parentEl = videoEl.parentElement;
        const containerWidth = parentEl ? parentEl.clientWidth : window.innerWidth;
        const containerHeight = parentEl ? parentEl.clientHeight : window.innerHeight;
        
        logger.info(MODULE, `Using video natural dimensions: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
        
        // Calculate aspect-preserving dimensions
        const widthScale = containerWidth / videoEl.videoWidth;
        const heightScale = containerHeight / videoEl.videoHeight;
        const uniformScale = Math.min(widthScale, heightScale);
        
        const displayWidth = videoEl.videoWidth * uniformScale;
        const displayHeight = videoEl.videoHeight * uniformScale;
        
        // Calculate offsets
        const offsetX = (containerWidth - displayWidth) / 2;
        const offsetY = (containerHeight - displayHeight) / 2;
        
        setDisplayArea({
          width: displayWidth,
          height: displayHeight,
          offsetX,
          offsetY,
          containerWidth,
          containerHeight,
          isFallback: true
        });
        
        setSvgViewBox('0 0 100 100');
        dimensionsSetRef.current = true;
      } else {
        // Use window dimensions as fallback
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        logger.info(MODULE, `Using window dimensions as fallback: ${windowWidth}x${windowHeight}`);
        
        setDisplayArea({
          width: windowWidth,
          height: windowHeight,
          offsetX: 0,
          offsetY: 0,
          containerWidth: windowWidth,
          containerHeight: windowHeight,
          isFallback: true
        });
        
        setSvgViewBox('0 0 100 100');
        dimensionsSetRef.current = true;
      }
    }
  }, [displayArea.width, checkVideoElement]);
  
  // Effect to adjust dimensions based on the video's dimensions
  useEffect(() => {
    // Create a reference to the debounced function
    const updateDimensions = debouncedUpdateDimensions();
    
    // Track if we've already applied fallback dimensions
    let fallbackApplied = false;
    
    // Initial update with delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        updateDimensions();
        
        // Log in development only
        if (process.env.NODE_ENV !== 'production') {
          logger.info(MODULE, `Running initial dimensions update (delayed)`);
        }
        
        // Apply fallback dimensions immediately if needed
        if (!displayArea.width) {
          // Use window dimensions as temporary fallback
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          
          if (windowWidth && windowHeight) {
            logger.info(MODULE, `Applying immediate window-based fallback: ${windowWidth}x${windowHeight}`);
            
            setDisplayArea({
              width: windowWidth,
              height: windowHeight,
              offsetX: 0,
              offsetY: 0,
              containerWidth: windowWidth,
              containerHeight: windowHeight,
              isFallback: true
            });
            
            setSvgViewBox('0 0 100 100');
            fallbackApplied = true;
          }
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
              } else {
                // If video element has no dimensions yet, use window dimensions
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                setDisplayArea({
                  width: windowWidth,
                  height: windowHeight,
                  offsetX: 0,
                  offsetY: 0,
                  containerWidth: windowWidth,
                  containerHeight: windowHeight,
                  isFallback: true
                });
                
                setSvgViewBox('0 0 100 100');
                logger.info(MODULE, `Applied window fallback dimensions: ${windowWidth}x${windowHeight}`);
              }
            } else {
              // Absolute last resort - use fixed dimensions if nothing else works
              setDisplayArea({
                width: 1920,
                height: 1080,
                offsetX: 0,
                offsetY: 0,
                containerWidth: 1920,
                containerHeight: 1080,
                isFallback: true
              });
              
              setSvgViewBox('0 0 100 100');
              logger.info(MODULE, `Applied fixed fallback dimensions: 1920x1080`);
            }
          }
        }, 1000);
      }
    }, 200);
    
    // Update when video ref changes
    if (videoRef?.current) {
      updateDimensions();
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(MODULE, 'Updating dimensions from new video ref');
      }
    }
    
    // Set up event listeners for changes
    window.addEventListener('resize', updateDimensions);
    
    // Get video element
    const videoEl = videoRef?.current;
    
    if (videoEl) {
      // Listen for video events that might change dimensions
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
  }, [videoRef, debouncedUpdateDimensions, checkVideoElement, displayArea.width]);
  
  // Helper to calculate hotspot position, adjusting for letterboxing
  const getHotspotPosition = useCallback((hotspot) => {
    if (!displayArea.width || !displayArea.height || !hotspot?.centerPoint) {
      // Fall back to original coordinates if display area is not calculated
      return {
        left: hotspot?.centerPoint ? `${hotspot.centerPoint.x * 100}%` : '50%',
        top: hotspot?.centerPoint ? `${hotspot.centerPoint.y * 100}%` : '50%'
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
  }, [displayArea, videoDimensions]);
  
  // Helper function to create SVG polygon points
  const createSvgPoints = useCallback((coordinates) => {
    if (!coordinates || coordinates.length < 3) return '';
    
    // Convert normalized coordinates to percentage values for SVG
    return coordinates.map(coord => `${coord.x * 100},${coord.y * 100}`).join(' ');
  }, []);
  
  // Format a number to 2 decimal places (for debug display)
  const formatNumber = useCallback((num) => {
    return typeof num === 'number' ? Math.round(num * 100) / 100 : 'N/A';
  }, []);
  
  return {
    svgViewBox,
    videoDimensions,
    displayArea,
    dimensionsSet: dimensionsSetRef.current,
    getHotspotPosition,
    createSvgPoints,
    formatNumber
  };
} 
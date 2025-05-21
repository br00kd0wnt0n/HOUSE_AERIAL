import { useState, useEffect, useCallback, useRef } from 'react';
import logger from '../../utils/logger';

const MODULE = 'VideoSizeCalculator';

/**
 * Custom hook for calculating and managing video dimensions
 * Maintains proper aspect ratio and handles resizing
 */
export function useVideoSizeCalculator({ videoRef, containerRef }) {
  // State to store calculated video styles
  const [videoStyles, setVideoStyles] = useState({});
  // State to store video dimensions for debugging/external use
  const [dimensions, setDimensions] = useState({
    container: { width: 0, height: 0 },
    video: { width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 },
    display: { width: 0, height: 0, offsetX: 0, offsetY: 0 }
  });
  
  // Ref to track if update is in progress to prevent concurrent updates
  const updateInProgressRef = useRef(false);
  
  // Function to calculate and update video dimensions
  const updateVideoDimensions = useCallback(() => {
    // Prevent concurrent updates
    if (updateInProgressRef.current) return;
    updateInProgressRef.current = true;
    
    try {
      if (!videoRef?.current || !containerRef?.current) {
        updateInProgressRef.current = false;
        return;
      }
      
      const videoEl = videoRef.current;
      const containerEl = containerRef.current;
      
      // Get container dimensions
      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      
      if (containerWidth === 0 || containerHeight === 0) {
        logger.debug(MODULE, 'Container has zero dimensions, skipping update');
        updateInProgressRef.current = false;
        return;
      }
      
      // Get video natural dimensions (if available)
      const videoWidth = videoEl.videoWidth || 1920;  // Default to 1080p
      const videoHeight = videoEl.videoHeight || 1080;
      
      // Calculate scale factors
      const widthScale = containerWidth / videoWidth;
      const heightScale = containerHeight / videoHeight;
      
      // Use the smaller scale factor to maintain aspect ratio
      const uniformScale = Math.min(widthScale, heightScale);
      
      // Calculate new dimensions
      const scaledWidth = videoWidth * uniformScale;
      const scaledHeight = videoHeight * uniformScale;
      
      // Calculate offsets for centering
      const offsetX = (containerWidth - scaledWidth) / 2;
      const offsetY = (containerHeight - scaledHeight) / 2;
      
      // Store dimensions for debugging
      setDimensions({
        container: { width: containerWidth, height: containerHeight },
        video: { 
          width: videoEl.clientWidth, 
          height: videoEl.clientHeight,
          naturalWidth: videoWidth,
          naturalHeight: videoHeight
        },
        display: { 
          width: scaledWidth, 
          height: scaledHeight, 
          offsetX, 
          offsetY,
          aspectRatio: videoWidth / videoHeight 
        }
      });
      
      // Update video style
      setVideoStyles({
        position: 'absolute',
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        left: `${offsetX}px`,
        top: `${offsetY}px`
      });
      
      logger.debug(MODULE, `Updated video dimensions: ${scaledWidth}x${scaledHeight} (offset: ${offsetX},${offsetY})`);
    } catch (error) {
      logger.error(MODULE, 'Error updating video dimensions:', error);
    } finally {
      updateInProgressRef.current = false;
    }
  }, [videoRef, containerRef]);
  
  // Set up event listeners for resizing and video events
  useEffect(() => {
    // Initial update
    updateVideoDimensions();
    
    // Set up window resize listener
    window.addEventListener('resize', updateVideoDimensions);
    
    // Set up video event listeners
    const videoEl = videoRef?.current;
    if (videoEl) {
      const videoEvents = [
        'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
        'playing', 'resize', 'durationchange'
      ];
      
      videoEvents.forEach(event => {
        videoEl.addEventListener(event, updateVideoDimensions);
      });
      
      // Clean up
      return () => {
        window.removeEventListener('resize', updateVideoDimensions);
        
        if (videoEl) {
          videoEvents.forEach(event => {
            videoEl.removeEventListener(event, updateVideoDimensions);
          });
        }
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateVideoDimensions);
    };
  }, [videoRef, updateVideoDimensions]);
  
  // Function to force an update
  const forceUpdate = useCallback(() => {
    updateVideoDimensions();
  }, [updateVideoDimensions]);
  
  return {
    videoStyles,
    dimensions,
    forceUpdate
  };
} 
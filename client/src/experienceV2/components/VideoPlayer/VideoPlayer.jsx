import React, { useRef, useEffect, useState } from 'react';
import logger from '../../utils/logger';
import { cn } from '../../../lib/utils';

/**
 * VideoPlayer.jsx - Enhanced video player for v2 experience
 * Handles smooth transitions between videos with preloading and caching
 * Maintains original aspect ratio for proper hotspot positioning
 */
const VideoPlayer = ({ 
  src, 
  type = 'aerial', 
  onEnded = () => {},
  isPlaying = true,
  onLoadStart = () => {},
  onLoadComplete = () => {},
  onVideoRef = null,
  className = ''
}) => {
  // Module name for logging
  const MODULE = 'VideoPlayer';
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [videoStyles, setVideoStyles] = useState({});
  
  // Calculate video dimensions to maintain aspect ratio
  useEffect(() => {
    // Function to update video container dimensions
    const updateVideoDimensions = () => {
      if (!videoRef.current || !containerRef.current) return;
      
      const videoEl = videoRef.current;
      const containerEl = containerRef.current;
      
      // Get container dimensions
      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      
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
      
      // Update video style
      setVideoStyles({
        position: 'absolute',
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        left: `${offsetX}px`,
        top: `${offsetY}px`
      });
    };
    
    // Initial update
    if (videoRef.current) {
      updateVideoDimensions();
    }
    
    // Set up window resize listener
    window.addEventListener('resize', updateVideoDimensions);
    
    // Set up video event listeners
    const videoEl = videoRef.current;
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
  }, []);
  
  // Expose video ref to parent if needed
  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);
  
  // When source changes, reset loading state
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    
    if (src) {
      onLoadStart(type);
      
      // Reset video element when source changes, especially when returning to aerial
      if (videoRef.current) {
        logger.debug(MODULE, `Source changed to ${type}, resetting video element`);
        
        // For aerial videos, do a complete reset
        if (type === 'aerial') {
          logger.info(MODULE, `Reloading aerial video with source: ${src.substring(0, 50)}...`);
          
          // Complete reset sequence for video element
          videoRef.current.pause();
          videoRef.current.removeAttribute('src'); // Remove the source
          videoRef.current.load(); // Reset the video element
          
          // Set the new source with a slight delay to ensure DOM has updated
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.src = src;
              videoRef.current.load();
              
              // Attempt to play if we should be playing
              if (isPlaying) {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    logger.error(MODULE, `Error playing aerial video after reset:`, error);
                  });
                }
              }
            }
          }, 50);
        } else {
          // For non-aerial videos, just reset the current time
          videoRef.current.currentTime = 0;
        }
      }
    }
  }, [src, type, onLoadStart, isPlaying]);
  
  // Listen for type changes specifically for detecting return to aerial
  useEffect(() => {
    if (type === 'aerial' && videoRef.current && isLoaded) {
      logger.debug(MODULE, 'Type changed to aerial, ensuring proper playback');
      // Ensure the video is actually playing
      if (isPlaying && videoRef.current.paused) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            logger.error(MODULE, `Error playing aerial video after type change:`, error);
          });
        }
      }
    }
  }, [type, isLoaded, isPlaying]);
  
  // Handle play/pause based on isPlaying prop
  useEffect(() => {
    if (!videoRef.current || !src) return;
    
    if (isPlaying && isLoaded) {
      // Use promise to handle autoplay restrictions
      logger.debug(MODULE, `Playing ${type} video`);
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          logger.error(MODULE, `Error playing ${type} video:`, error);
        });
      }
    } else if (!isPlaying) {
      videoRef.current.pause();
    }
  }, [isPlaying, src, type, isLoaded]);
  
  // Handle video loaded event
  const handleVideoLoaded = () => {
    logger.debug(MODULE, `Video ${type} loaded`);
    setIsLoaded(true);
    setHasError(false);
    onLoadComplete(type);
    
    // If video should be playing, start it now
    if (isPlaying && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          logger.error(MODULE, `Error playing ${type} video after load:`, error);
        });
      }
    }
  };
  
  // Handle video error
  const handleVideoError = (error) => {
    logger.error(MODULE, `Error loading ${type} video:`, error);
    setHasError(true);
    setIsLoaded(false);
  };
  
  return (
    <div 
      ref={containerRef}
      className={cn("w-full h-full relative bg-black overflow-hidden", className)}
    >
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            className={cn(
              "video-element",
              // Remove object-cover class to prevent distortion
              type === 'aerial' ? "bg-[#000]" : "bg-black"
            )}
            style={videoStyles}
            playsInline
            muted={type === 'transition'}
            loop={type === 'aerial'}
            onEnded={() => {
              logger.debug(MODULE, `Video ended: ${type}`);
              onEnded(type);
            }}
            onCanPlayThrough={handleVideoLoaded}
            onError={handleVideoError}
            preload="auto"
          />
          
          {/* Loading indicator */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-16 h-16 border-4 border-white border-t-netflix-red rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Error indicator */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <p className="text-netflix-red font-bold mb-2">Error Loading Video</p>
                <p className="text-sm">Please try reloading the page</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black text-white">
          <p>Video Placeholder ({type})</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer; 
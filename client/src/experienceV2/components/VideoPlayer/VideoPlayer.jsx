import React, { useRef, useEffect, useState, useCallback } from 'react';
import logger from '../../utils/logger';
import { cn } from '../../../lib/utils';

/**
 * VideoPlayer.jsx - Enhanced video player for v2 experience
 * Handles smooth transitions between videos with preloading and caching
 * Maintains original aspect ratio for proper hotspot positioning
 * 
 * Autoplay policy requirements:
 * - Muted videos can autoplay on all browsers
 * - playsInline attribute required for iOS Safari
 * - User interaction required to unmute videos
 * - Floor level videos should play with sound, not muted
 */
const VideoPlayer = ({ 
  src, 
  type = 'aerial', 
  onEnded = () => {},
  isPlaying = true,
  onLoadStart = () => {},
  onLoadComplete = () => {},
  onPlaying = () => {},
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
  
  // Ref to track pending play promises to prevent AbortError
  const pendingPlayPromiseRef = useRef(null);
  // Ref to track the current source to detect changes
  const currentSrcRef = useRef(null);
  // Ref to track if onPlaying has been called for current video
  const playingCallbackFiredRef = useRef(false);
  
  // Safe play function that prevents AbortError - wrapped in useCallback
  const safePlayVideo = useCallback(() => {
    if (!videoRef.current) return;
    
    // Only attempt to play if we're supposed to be playing
    if (!isPlaying) return;
    
    // Update current source ref for tracking
    currentSrcRef.current = src;
    
    // Log if video is muted or not
    const isMuted = type === 'aerial' || type === 'transition';
    logger.debug(MODULE, `Attempting to play ${type} video (${isMuted ? 'muted' : 'with audio'})`);
    
    try {
      // Cancel any pending play promises to avoid AbortError
      pendingPlayPromiseRef.current = null;
      
      // Start a new play attempt
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        // Store reference to the promise
        pendingPlayPromiseRef.current = playPromise;
        
        playPromise
          .then(() => {
            // Play succeeded, clear the pending promise if it's the same one
            if (pendingPlayPromiseRef.current === playPromise) {
              pendingPlayPromiseRef.current = null;
            }
            logger.debug(MODULE, `Successfully playing ${type} video`);
            
            // Call the onPlaying callback if it hasn't been called yet for this video
            if (!playingCallbackFiredRef.current) {
              playingCallbackFiredRef.current = true;
              onPlaying(type);
            }
          })
          .catch(error => {
            // Only log error if it's not an AbortError (which we expect when changing sources)
            if (error.name !== 'AbortError') {
              logger.error(MODULE, `Error playing ${type} video:`, error);
              
              // Check if it's an autoplay policy violation
              if (error.name === 'NotAllowedError') {
                logger.warn(MODULE, `Autoplay failed due to browser policy. The video must be muted to autoplay.`);
                
                // Try again with muted if it's not already muted
                if (videoRef.current && !videoRef.current.muted) {
                  logger.info(MODULE, `Forcing muted playback to satisfy autoplay policy`);
                  videoRef.current.muted = true;
                  
                  // Try playing again
                  setTimeout(() => {
                    if (currentSrcRef.current === src) {
                      safePlayVideo();
                    }
                  }, 100);
                }
              }
            } else {
              logger.debug(MODULE, `Play request for ${type} was aborted (expected during source change)`);
            }
            
            // Clear the pending promise if it's the same one
            if (pendingPlayPromiseRef.current === playPromise) {
              pendingPlayPromiseRef.current = null;
            }
          });
      }
    } catch (error) {
      logger.error(MODULE, `Exception during play() call:`, error);
    }
  }, [isPlaying, src, type, onPlaying]);
  
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
    // Source has changed - capture this for comparison
    const previousSrc = currentSrcRef.current;
    const sourceChanged = previousSrc !== src;
    
    if (sourceChanged) {
      logger.debug(MODULE, `Source changed from ${previousSrc ? 'previous' : 'none'} to ${src ? 'new' : 'none'}`);
      
      // Reset state for new source
      setIsLoaded(false);
      setHasError(false);
      
      // Reset playing callback flag when source changes
      playingCallbackFiredRef.current = false;
      
      if (src) {
        onLoadStart(type);
        
        // Ensure video is paused before changing source to avoid AbortError
        if (videoRef.current && !videoRef.current.paused) {
          try {
            videoRef.current.pause();
          } catch (e) {
            // Ignore errors when pausing
          }
        }
        
        // Reset video element when source changes, especially when returning to aerial
        if (videoRef.current) {
          logger.debug(MODULE, `Source changed to ${type}, resetting video element`);
          
          // For aerial videos, do a complete reset
          if (type === 'aerial') {
            logger.info(MODULE, `Reloading aerial video with source: ${src.substring(0, 50)}...`);
            
            // Complete reset sequence for video element
            try {
              videoRef.current.pause();
              videoRef.current.removeAttribute('src'); // Remove the source
              videoRef.current.load(); // Reset the video element
              
              // Set the new source with a slight delay to ensure DOM has updated
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.src = src;
                  videoRef.current.load();
                  
                  // Ensure muted status is correct for the video type
                  videoRef.current.muted = (type === 'aerial' || type === 'transition');
                  logger.info(MODULE, `Set ${type} video to ${videoRef.current.muted ? 'muted' : 'unmuted'}`);
                  
                  // Update current source ref
                  currentSrcRef.current = src;
                  
                  // Attempt to play if we should be playing - with a delay
                  // to avoid immediate play after load which can cause issues
                  if (isPlaying) {
                    setTimeout(() => {
                      if (currentSrcRef.current === src) {
                        safePlayVideo();
                      }
                    }, 100);
                  }
                }
              }, 50);
            } catch (error) {
              logger.error(MODULE, `Error during aerial video reset:`, error);
            }
          } else {
            // For non-aerial videos, use a simpler approach
            try {
              videoRef.current.currentTime = 0;
              videoRef.current.src = src;
              videoRef.current.load();
              
              // Ensure muted status is correct for the video type
              videoRef.current.muted = (type === 'aerial' || type === 'transition');
              logger.info(MODULE, `Set ${type} video to ${videoRef.current.muted ? 'muted' : 'unmuted'}`);
              
              // Update current source ref
              currentSrcRef.current = src;
              
              if (isPlaying) {
                setTimeout(safePlayVideo, 100);
              }
            } catch (error) {
              logger.error(MODULE, `Error during video source change:`, error);
            }
          }
        }
      }
    }
  }, [src, type, onLoadStart, isPlaying, safePlayVideo]);
  
  // Listen for type changes specifically for detecting return to aerial
  useEffect(() => {
    if (type === 'aerial' && videoRef.current && isLoaded && currentSrcRef.current === src) {
      logger.debug(MODULE, 'Type changed to aerial, ensuring proper playback');
      // Ensure the video is actually playing
      if (isPlaying && videoRef.current.paused) {
        safePlayVideo();
      }
    }
  }, [type, isLoaded, isPlaying, src, safePlayVideo]);
  
  // Handle play/pause based on isPlaying prop
  useEffect(() => {
    if (!videoRef.current || !src) return;
    
    if (isPlaying && isLoaded) {
      // Use our safe play function to handle autoplay restrictions
      safePlayVideo();
    } else if (!isPlaying) {
      try {
        videoRef.current.pause();
      } catch (error) {
        logger.error(MODULE, `Error pausing video:`, error);
      }
    }
  }, [isPlaying, src, type, isLoaded, safePlayVideo]);
  
  // Setup event listener for "playing" event
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    const handlePlayingEvent = () => {
      logger.debug(MODULE, `Video playing event fired for ${type}`);
      // Call the onPlaying callback if it hasn't been called yet for this video
      if (!playingCallbackFiredRef.current) {
        playingCallbackFiredRef.current = true;
        onPlaying(type);
      }
    };
    
    // Add event listener for the playing event
    videoEl.addEventListener('playing', handlePlayingEvent);
    
    return () => {
      videoEl.removeEventListener('playing', handlePlayingEvent);
    };
  }, [videoRef, type, onPlaying]);
  
  // Handle video loaded event
  const handleVideoLoaded = () => {
    logger.debug(MODULE, `Video ${type} loaded`);
    setIsLoaded(true);
    setHasError(false);
    onLoadComplete(type);
    
    // Double check that the muted state is correctly set for this video type
    if (videoRef.current) {
      const shouldBeMuted = type === 'aerial' || type === 'transition';
      if (videoRef.current.muted !== shouldBeMuted) {
        videoRef.current.muted = shouldBeMuted;
        logger.info(MODULE, `Corrected muted state for ${type} video: ${shouldBeMuted ? 'muted' : 'with sound'}`);
      }
    }
    
    // If video should be playing, start it now
    if (isPlaying && videoRef.current && currentSrcRef.current === src) {
      safePlayVideo();
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
      className={cn("w-full h-full relative overflow-hidden", className)}
      style={{ 
        background: type === 'aerial' 
          ? 'linear-gradient(to bottom, rgb(207 234 235), rgb(239 249 251))' 
          : 'black' 
      }}
    >
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            className={cn(
              "video-element",
              // Remove specific background colors since we're using gradient on container
              type === 'aerial' ? "" : ""
            )}
            style={videoStyles}
            playsInline
            muted={type === 'aerial' || type === 'transition'}
            loop={type === 'aerial'}
            autoPlay={isPlaying}
            onEnded={() => {
              logger.debug(MODULE, `Video ended: ${type}`);
              onEnded(type);
            }}
            onCanPlayThrough={handleVideoLoaded}
            onError={handleVideoError}
            preload="auto"
          />
          
          {/* Loading indicator - removed since all videos are pre-cached */}
          {/* {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 249, 251, 0.5)' }}>
              <div className="w-16 h-16 border-4 border-white border-t-netflix-red rounded-full animate-spin"></div>
            </div>
          )} */}
          
          {/* Error indicator */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ 
              background: type === 'aerial'
                ? 'linear-gradient(to bottom, rgba(207, 234, 235, 0.5), rgba(239, 249, 251, 0.5))'
                : 'rgba(0, 0, 0, 0.75)'
            }}>
              <div className="text-netflix-red text-center">
                <p className="text-netflix-red font-bold mb-2">Error Loading Video</p>
                <p className="text-sm">Please try reloading the page</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-netflix-red" style={{ 
          background: type === 'aerial'
            ? 'linear-gradient(to bottom, rgb(207 234 235), rgb(239 249 251))'
            : 'black'
        }}>
          <p>Video Placeholder ({type})</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer; 
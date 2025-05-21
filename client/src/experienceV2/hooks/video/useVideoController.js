import { useRef, useState, useCallback, useEffect } from 'react';
import logger from '../../utils/logger';

const MODULE = 'VideoController';

/**
 * Custom hook for video playback control logic
 * Handles autoplay restrictions, play/pause, and source changes
 */
export function useVideoController({
  src,
  type = 'aerial',
  isPlaying = true,
  onLoadStart = () => {},
  onLoadComplete = () => {},
  onPlaying = () => {},
  onEnded = () => {}
}) {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Ref to track pending play promises to prevent AbortError
  const pendingPlayPromiseRef = useRef(null);
  // Ref to track the current source to detect changes
  const currentSrcRef = useRef(null);
  // Ref to track if onPlaying has been called for current video
  const playingCallbackFiredRef = useRef(false);
  
  // Safe play function that prevents AbortError
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
  
  // When source changes, reset loading state
  useEffect(() => {
    // Source has changed - capture this for comparison
    const previousSrc = currentSrcRef.current;
    const sourceChanged = previousSrc !== src;
    
    if (sourceChanged) {
      logger.debug(MODULE, `Source changed from ${previousSrc ? 'previous' : 'none'} to ${src ? 'new' : 'none'}`);
      
      // Reset state for new source
      setIsLoaded(false);
      
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
  const handleVideoLoaded = useCallback(() => {
    logger.debug(MODULE, `Video ${type} loaded`);
    setIsLoaded(true);
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
  }, [type, onLoadComplete, isPlaying, src, safePlayVideo]);
  
  // Handle video ended event
  const handleVideoEnded = useCallback(() => {
    logger.debug(MODULE, `Video ended: ${type}`);
    onEnded(type);
  }, [type, onEnded]);
  
  return {
    videoRef,
    isLoaded,
    handleVideoLoaded,
    handleVideoEnded,
    currentSrc: currentSrcRef.current,
    safePlayVideo
  };
} 
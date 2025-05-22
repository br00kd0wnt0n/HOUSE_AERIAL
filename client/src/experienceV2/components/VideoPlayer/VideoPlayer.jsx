import React, { useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { useVideoController } from '../../hooks/video/useVideoController';
import { useVideoErrorHandler } from '../../hooks/video/useVideoErrorHandler';
import { useVideoSizeCalculator } from '../../hooks/video/useVideoSizeCalculator';

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
  // Create refs for video and container elements
  const containerRef = useRef(null);
  
  // Use custom hooks
  const {
    videoRef,
    handleVideoLoaded,
    handleVideoEnded
  } = useVideoController({
    src,
    type,
    isPlaying,
    onLoadStart,
    onLoadComplete,
    onPlaying,
    onEnded
  });
  
  const {
    hasError,
    handleVideoError,
    getErrorContent
  } = useVideoErrorHandler({
    type
  });
  
  const {
    videoStyles
  } = useVideoSizeCalculator({
    videoRef,
    containerRef
  });
  
  // Expose video ref to parent component if needed - using useEffect
  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef, videoRef]);
  
  // Determine if this is a transition video to apply higher z-index
  const isTransition = type === 'transition' || type === 'locationTransition' || type.includes('transition');
  
  // Get container styles based on video type
  const containerStyles = {
    background: type === 'aerial' 
      ? 'linear-gradient(to bottom, rgb(207 234 235), rgb(239 249 251))' 
      : 'black',
    zIndex: isTransition ? 50 : 'auto', // Add high z-index for transition videos
    // Use fixed positioning for transition videos to ensure they appear on top
    position: isTransition ? 'fixed' : 'relative',
    inset: isTransition ? '0' : 'auto',
    width: isTransition ? '100%' : '100%',
    height: isTransition ? '100%' : '100%',
    // Add touch handling
    touchAction: 'manipulation',
    // Center content
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  
  // Enhanced video styles for better mobile handling
  const enhancedVideoStyles = {
    ...videoStyles,
    touchAction: 'manipulation', // Improve touch handling
    WebkitTapHighlightColor: 'transparent', // Remove tap highlight on iOS
    WebkitUserSelect: 'none', // Prevent text selection on touch
    userSelect: 'none', // Prevent text selection on touch
  };
  
  return (
    <div 
      ref={containerRef}
      className={cn("overflow-hidden", isTransition ? "fixed inset-0" : "w-full h-full relative", className)}
      style={containerStyles}
    >
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            className={cn("video-element", isTransition ? "w-full h-full object-cover" : "")}
            style={enhancedVideoStyles}
            playsInline
            webkitPlaysinline="true"
            x5Playsinline="true"
            muted={type === 'aerial' || type === 'transition' || type.includes('transition')}
            loop={type === 'aerial'}
            autoPlay={isPlaying}
            onEnded={() => handleVideoEnded()}
            onCanPlayThrough={handleVideoLoaded}
            onError={handleVideoError}
            preload="auto"
            playbackRate={1.0}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />
          
          {/* Error indicator */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ 
              background: type === 'aerial'
                ? 'linear-gradient(to bottom, rgba(207, 234, 235, 0.5), rgba(239, 249, 251, 0.5))'
                : 'rgba(0, 0, 0, 0.75)'
            }}>
              <div className="text-netflix-red text-center">
                <p className="text-netflix-red font-bold mb-2">{getErrorContent()?.title || 'Error Loading Video'}</p>
                <p className="text-sm">{getErrorContent()?.message || 'Please try reloading the page'}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        // Empty container with same background as the video type would have
        // No visible placeholder text to avoid disrupting the user experience
        <div className="w-full h-full" style={{ 
          background: type === 'aerial'
            ? 'linear-gradient(to bottom, rgb(207 234 235), rgb(239 249 251))'
            : 'black'
        }} />
      )}
    </div>
  );
};

export default VideoPlayer; 
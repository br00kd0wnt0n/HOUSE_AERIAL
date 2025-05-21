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
            className="video-element"
            style={videoStyles}
            playsInline
            muted={type === 'aerial' || type === 'transition'}
            loop={type === 'aerial'}
            autoPlay={isPlaying}
            onEnded={() => handleVideoEnded()}
            onCanPlayThrough={handleVideoLoaded}
            onError={handleVideoError}
            preload="auto"
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
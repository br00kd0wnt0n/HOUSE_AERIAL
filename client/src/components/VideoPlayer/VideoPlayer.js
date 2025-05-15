import React, { useRef, useEffect, useState } from 'react';
import './VideoPlayer.css';
import { instance } from '../../utils/api';

const VideoPlayer = ({ 
  videoAssets, 
  currentVideo, 
  onVideoEnded,
  activeHotspot,
  videoLoader 
}) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset states when video changes
  useEffect(() => {
    if (videoRef.current) {
      setError(null);
      setIsLoading(true);
      const source = getCurrentVideoSource();
      if (source) {
        // Source should already be a full URL from getVideoUrl
        console.log('Setting video source:', source);
        videoRef.current.src = source;
        videoRef.current.load();
      } else {
        console.warn('No video source available for:', currentVideo);
        setIsLoading(false);
      }
    }
  }, [currentVideo, videoAssets, activeHotspot]);

  const handleVideoError = (e) => {
    console.error('Error loading video:', e);
    console.error('Video element:', videoRef.current);
    console.error('Video source:', videoRef.current?.src);
    setError('Failed to load video. Please try refreshing the page.');
    setIsLoading(false);
    
    // If aerial video fails, try to continue with other videos
    if (currentVideo === 'aerial' && onVideoEnded) {
      onVideoEnded('aerial');
    }
  };

  const handleVideoLoaded = () => {
    console.log('Video loaded successfully:', currentVideo);
    setIsLoading(false);
    setError(null);
  };

  const getCurrentVideoSource = () => {
    if (!videoAssets || !currentVideo) {
      console.log('No video assets or current video:', { videoAssets, currentVideo });
      return null;
    }
    
    let source = null;
    if (currentVideo === 'aerial' && videoAssets.aerial?.s3Key) {
      source = videoAssets.aerial.s3Key;
    } else if (currentVideo === 'transition' && videoAssets.transition?.s3Key) {
      source = videoAssets.transition.s3Key;
    } else if (activeHotspot) {
      // Handle playlist videos
      const [type, hotspotId] = currentVideo.split('_');
      const video = videoAssets[type]?.find(v => v.hotspotId === hotspotId);
      if (video?.s3Key) {
        source = video.s3Key;
      }
    }
    
    if (source) {
      console.log('Video source for', currentVideo, ':', source);
    } else {
      console.warn('No source found for video type:', currentVideo);
    }
    return source;
  };

  return (
    <div className="video-player-container">
      {error && (
        <div className="video-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {isLoading && !error && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      )}
      <video
        ref={videoRef}
        className="video-player"
        onEnded={() => onVideoEnded && onVideoEnded(currentVideo)}
        onError={handleVideoError}
        onLoadedData={handleVideoLoaded}
        controls
        autoPlay
        playsInline
      />
    </div>
  );
};

export default VideoPlayer;
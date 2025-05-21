import React from 'react';
import { useVideo } from '../../context/VideoContext';

const LoadingSpinner = ({ progress, message = 'Loading...' }) => {
  // Get the video context to check for transition state
  const { currentVideo, isInTransition } = useVideo();
  
  // Don't render anything if we're in a transition or the current video is a transition
  if (isInTransition || currentVideo === 'transition' || 
      (currentVideo && currentVideo.toString().includes('transition'))) {
    return null;
  }
  
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner"></div>
      <div className="loading-message">{message}</div>
      {progress !== undefined && (
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
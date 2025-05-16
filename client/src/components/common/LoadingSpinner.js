import React from 'react';

const LoadingSpinner = ({ progress, message = 'Loading...' }) => {
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
import React, { useState } from 'react';
import VideoPreview from '../../../components/VideoPlayer/VideoPreview';
import { baseBackendUrl } from '../../../utils/api';

const AssetPreview = ({ asset, width = 120, height = 80, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!asset) return null;
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Display placeholder for missing or errored assets
  if (imageError || !asset.accessUrl) {
    return (
      <div 
        className={`bg-netflix-black/50 flex items-center justify-center rounded ${className}`}
        style={{ width, height }}
      >
        <span className="text-netflix-gray text-xs text-center p-1">
          {imageError ? 'Error loading preview' : 'No preview'}
        </span>
      </div>
    );
  }
  
  return (
    <>
      {asset.fileType === 'mp4' ? (
        <VideoPreview 
          video={{
            accessUrl: asset.accessUrl || '',
            title: asset.name,
            width: width,
            height: height
          }}
          className={className}
        />
      ) : (
        <img 
          src={asset.accessUrl ? `${baseBackendUrl}${asset.accessUrl}` : ''} 
          alt={asset.name} 
          width={width}
          height={height}
          className={`rounded object-contain max-w-full max-h-full ${className}`}
          onError={handleImageError}
          loading="lazy"
        />
      )}
    </>
  );
};

export default AssetPreview; 
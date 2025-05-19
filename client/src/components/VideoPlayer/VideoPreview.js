import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { baseBackendUrl } from '../../utils/api';

const VideoPreview = ({ video, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Handle missing video prop gracefully
  if (!video) {
    return (
      <div className={`video-preview ${className}`}>
        <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-500">
          No video selected
        </div>
      </div>
    );
  }

  // Format video URL
  const getVideoUrl = () => {
    if (!video) return '';
    
    if (!video.accessUrl) {
      return '';
    }
    
    if (video.accessUrl.startsWith('http')) {
      return video.accessUrl;
    }
    
    if (video.accessUrl.startsWith('/api/')) {
      return `${baseBackendUrl}${video.accessUrl}`;
    } else {
      return `${baseBackendUrl}/api${video.accessUrl}`;
    }
  };

  const videoUrl = getVideoUrl();

  return (
    <>
      {/* Video thumbnail that opens the modal */}
      <div
        className="cursor-pointer relative rounded-md overflow-hidden group"
        onClick={() => setIsOpen(true)}
        style={{ width: video.width, height: video.height }}
      >
        <video 
          width={video.width} 
          height={video.height} 
          preload="metadata" 
          className="rounded-md object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        
        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-netflix-red/80 flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-white" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Video preview modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl p-1 overflow-hidden bg-netflix-dark">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{video.title}</DialogTitle>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center">
            <video 
              controls 
              autoPlay
              className="rounded-md max-h-[70vh] max-w-full" 
              style={{ maxHeight: '70vh' }}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoPreview; 
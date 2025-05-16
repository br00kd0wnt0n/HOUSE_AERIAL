// client/src/components/VideoPlayer/VideoPlayer.js - Custom video player component

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ 
  videoAssets, 
  currentVideo, 
  onVideoEnded, 
  activeHotspot,
  videoLoader
}) => {
  // Refs for video elements
  const aerialVideoRef = useRef(null);
  const diveInVideoRef = useRef(null);
  const floorLevelVideoRef = useRef(null);
  const zoomOutVideoRef = useRef(null);
  const transitionVideoRef = useRef(null);
  
  // State to track which video is active
  const [activeVideoId, setActiveVideoId] = useState('aerial');
  
  // Function to get the appropriate video source
  const getVideoSource = useCallback((type) => {
    if (type === 'aerial' && videoAssets.aerial) {
      return videoAssets.aerial.accessUrl;
    } else if (type === 'transition' && videoAssets.transition) {
      return videoAssets.transition.accessUrl;
    } else if (activeHotspot) {
      // For hotspot videos, get from the videoLoader which has preloaded videos
      if (type === 'diveIn') {
        return videoLoader.get(`diveIn_${activeHotspot._id}`)?.src || '';
      } else if (type === 'floorLevel') {
        return videoLoader.get(`floorLevel_${activeHotspot._id}`)?.src || '';
      } else if (type === 'zoomOut') {
        return videoLoader.get(`zoomOut_${activeHotspot._id}`)?.src || '';
      }
    }
    return '';
  }, [videoAssets, activeHotspot, videoLoader]);
  
  // Handle video ending events
  const handleVideoEnd = (videoType) => {
    if (onVideoEnded) {
      onVideoEnded(videoType);
    }
  };
  
  // Switch active video when currentVideo changes
  useEffect(() => {
    setActiveVideoId(currentVideo);
    
    // Get the appropriate video ref
    let videoRef;
    switch (currentVideo) {
      case 'aerial':
        videoRef = aerialVideoRef.current;
        break;
      case 'diveIn':
        videoRef = diveInVideoRef.current;
        break;
      case 'floorLevel':
        videoRef = floorLevelVideoRef.current;
        break;
      case 'zoomOut':
        videoRef = zoomOutVideoRef.current;
        break;
      case 'transition':
        videoRef = transitionVideoRef.current;
        break;
      default:
        videoRef = aerialVideoRef.current;
    }
    
    // If we have a valid video, play it
    if (videoRef && videoRef.src) {
      // Reset to beginning for non-looping videos
      if (currentVideo !== 'aerial') {
        videoRef.currentTime = 0;
      }
      
      // Play the video
      const playPromise = videoRef.play();
      
      // Handle promise to avoid DOMException
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing video:', error);
        });
      }
    }
  }, [currentVideo]);
  
  // Set up looping for aerial video
  useEffect(() => {
    if (aerialVideoRef.current) {
      aerialVideoRef.current.loop = true;
    }
  }, []);
  
  // Set initial video sources on component mount or when assets change
  useEffect(() => {
    // Set aerial video source
    if (aerialVideoRef.current && videoAssets.aerial) {
      aerialVideoRef.current.src = videoAssets.aerial.accessUrl;
      aerialVideoRef.current.load();
    }
    
    // Set transition video source
    if (transitionVideoRef.current && videoAssets.transition) {
      transitionVideoRef.current.src = videoAssets.transition.accessUrl;
      transitionVideoRef.current.load();
    }
  }, [videoAssets]);
  
  // Update hotspot video sources when activeHotspot changes
  useEffect(() => {
    if (activeHotspot && activeHotspot.type === 'PRIMARY') {
      // Set dive-in video source
      const diveInSrc = getVideoSource('diveIn');
      if (diveInVideoRef.current && diveInSrc) {
        diveInVideoRef.current.src = diveInSrc;
        diveInVideoRef.current.load();
      }
      
      // Set floor-level video source
      const floorLevelSrc = getVideoSource('floorLevel');
      if (floorLevelVideoRef.current && floorLevelSrc) {
        floorLevelVideoRef.current.src = floorLevelSrc;
        floorLevelVideoRef.current.load();
      }
      
      // Set zoom-out video source
      const zoomOutSrc = getVideoSource('zoomOut');
      if (zoomOutVideoRef.current && zoomOutSrc) {
        zoomOutVideoRef.current.src = zoomOutSrc;
        zoomOutVideoRef.current.load();
      }
    }
  }, [activeHotspot, getVideoSource]);
  
  return (
    <div className="video-player-container">
      {/* Aerial video (looping) */}
      <video
        ref={aerialVideoRef}
        className={`video-element ${activeVideoId === 'aerial' ? 'active' : ''}`}
        preload="auto"
        muted={false}
        playsInline
        onEnded={() => handleVideoEnd('aerial')}
      ></video>
      
      {/* Dive-in video (part 1 of hotspot sequence) */}
      <video
        ref={diveInVideoRef}
        className={`video-element ${activeVideoId === 'diveIn' ? 'active' : ''}`}
        preload="auto"
        muted={false}
        playsInline
        onEnded={() => handleVideoEnd('diveIn')}
      ></video>
      
      {/* Floor-level video (part 2 of hotspot sequence) */}
      <video
        ref={floorLevelVideoRef}
        className={`video-element ${activeVideoId === 'floorLevel' ? 'active' : ''}`}
        preload="auto"
        muted={false}
        playsInline
        onEnded={() => handleVideoEnd('floorLevel')}
      ></video>
      
      {/* Zoom-out video (part 3 of hotspot sequence) */}
      <video
        ref={zoomOutVideoRef}
        className={`video-element ${activeVideoId === 'zoomOut' ? 'active' : ''}`}
        preload="auto"
        muted={false}
        playsInline
        onEnded={() => handleVideoEnd('zoomOut')}
      ></video>
      
      {/* Transition video (shown when changing locations) */}
      <video
        ref={transitionVideoRef}
        className={`video-element ${activeVideoId === 'transition' ? 'active' : ''}`}
        preload="auto"
        muted={false}
        playsInline
        onEnded={() => handleVideoEnd('transition')}
      ></video>
      
      {/* Video controls (optional) */}
      <div className="video-controls">
        <button className="control-button volume-button">
          <i className="volume-icon"></i>
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;

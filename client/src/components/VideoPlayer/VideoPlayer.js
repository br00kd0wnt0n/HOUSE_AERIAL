import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoPlayer.css';

// Import baseBackendUrl for consistent URL handling
import { baseBackendUrl } from '../../utils/api';

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
  // Add state to track if we're in a playlist sequence
  const [inPlaylistSequence, setInPlaylistSequence] = useState(false);
  // Add ref to track the current source to avoid unnecessary reloading
  const currentSourceRef = useRef(null);
  // Add ref to track preloaded videos in the current sequence
  const sequenceVideosRef = useRef({});
  // Add ref to track if the entire sequence is preloaded
  const sequencePreloadedRef = useRef(false);

  // Helper function to properly format video URLs
  const formatVideoUrl = useCallback((url) => {
    if (!url) return null;
    
    // Skip if already a full URL
    if (url.startsWith('http')) return url;
    
    // Remove any duplicate /api/ prefixes
    let cleanUrl = url;
    if (cleanUrl.startsWith('/api/')) {
      // URL already has /api/ prefix, just append to base URL
      return `${baseBackendUrl}${cleanUrl}`;
    }
    
    // Add /api/ prefix to other URLs
    return cleanUrl.startsWith('/') 
      ? `${baseBackendUrl}/api${cleanUrl}` 
      : `${baseBackendUrl}/api/${cleanUrl}`;
  }, []);

  // Check if current video is part of a playlist sequence
  useEffect(() => {
    // Video types that are part of a sequence
    const sequenceTypes = ['diveIn', 'floorLevel', 'zoomOut'];
    
    // Check if current video is part of a sequence
    const isSequenceVideo = currentVideo && 
      (sequenceTypes.some(type => currentVideo.startsWith(type)) ||
      sequenceTypes.includes(currentVideo));
    
    // Set the sequence state
    setInPlaylistSequence(isSequenceVideo);
    
    // When we return to aerial, reset the sequence flag
    if (currentVideo === 'aerial') {
      setInPlaylistSequence(false);
      sequencePreloadedRef.current = false;
    }
  }, [currentVideo]);

  // Preload all videos in a sequence when we detect an active hotspot
  useEffect(() => {
    if (!activeHotspot || !videoAssets || activeHotspot.type !== 'PRIMARY') {
      return;
    }

    const preloadSequence = async () => {
      try {
        console.log('Preloading video sequence for hotspot:', activeHotspot._id);
        
        // Get playlist info
        const hotspotId = activeHotspot._id;
        
        // Initialize loader if needed
        if (!videoLoader) {
          console.warn('VideoLoader not available for preloading');
          return;
        }
        
        // Check if we have already preloaded the sequence for this hotspot
        if (sequencePreloadedRef.current && sequenceVideosRef.current[hotspotId]) {
          console.log('Sequence already preloaded for hotspot:', hotspotId);
          return;
        }
        
        // Find videos in the sequence
        const diveInAsset = videoAssets.diveIn?.find(v => v.hotspotId === hotspotId);
        const floorLevelAsset = videoAssets.floorLevel?.find(v => v.hotspotId === hotspotId);
        const zoomOutAsset = videoAssets.zoomOut?.find(v => v.hotspotId === hotspotId);
        
        if (!diveInAsset || !floorLevelAsset || !zoomOutAsset) {
          console.warn('Missing one or more videos in sequence');
          return;
        }
        
        // Format URLs properly
        const diveInUrl = formatVideoUrl(diveInAsset.accessUrl);
        const floorLevelUrl = formatVideoUrl(floorLevelAsset.accessUrl);
        const zoomOutUrl = formatVideoUrl(zoomOutAsset.accessUrl);
        
        // Add all sequence videos to loader
        if (!videoLoader.isLoaded(`diveIn_${hotspotId}`)) {
          videoLoader.add(`diveIn_${hotspotId}`, diveInUrl);
        }
        
        if (!videoLoader.isLoaded(`floorLevel_${hotspotId}`)) {
          videoLoader.add(`floorLevel_${hotspotId}`, floorLevelUrl);
        }
        
        if (!videoLoader.isLoaded(`zoomOut_${hotspotId}`)) {
          videoLoader.add(`zoomOut_${hotspotId}`, zoomOutUrl);
        }
        
        // Start preloading in parallel
        console.log('Preloading all videos in sequence');
        await videoLoader.preloadAll();
        
        // Store loaded videos in reference
        sequenceVideosRef.current[hotspotId] = {
          diveIn: diveInUrl,
          floorLevel: floorLevelUrl,
          zoomOut: zoomOutUrl,
          loaded: true
        };
        
        sequencePreloadedRef.current = true;
        console.log('All sequence videos preloaded for hotspot:', hotspotId);
      } catch (error) {
        console.error('Error preloading sequence videos:', error);
      }
    };
    
    preloadSequence();
  }, [activeHotspot, videoAssets, videoLoader, formatVideoUrl]);

  // Get the current video source with memoization
  const getCurrentVideoSource = useCallback(() => {
    if (!videoAssets || !currentVideo) {
      console.log('No video assets or current video:', { videoAssets, currentVideo });
      return null;
    }
    
    let source = null;
    
    // Check if we're playing a sequence video and use the preloaded source if available
    if (inPlaylistSequence && activeHotspot) {
      const hotspotId = activeHotspot._id;
      const sequenceVideos = sequenceVideosRef.current[hotspotId];
      
      if (sequenceVideos?.loaded) {
        // Get preloaded URL from sequence cache
        if (currentVideo === 'diveIn' || currentVideo.startsWith('diveIn_')) {
          source = sequenceVideos.diveIn;
          console.log('Using preloaded diveIn video');
        } else if (currentVideo === 'floorLevel' || currentVideo.startsWith('floorLevel_')) {
          source = sequenceVideos.floorLevel;
          console.log('Using preloaded floorLevel video');
        } else if (currentVideo === 'zoomOut' || currentVideo.startsWith('zoomOut_')) {
          source = sequenceVideos.zoomOut;
          console.log('Using preloaded zoomOut video');
        }
        
        if (source) {
          return source;
        }
      }
    }
    
    if (currentVideo === 'aerial' && videoAssets.aerial) {
      console.log('Aerial video assets:', videoAssets.aerial);
      
      if (!videoAssets.aerial.accessUrl) {
        console.error('Aerial video is missing accessUrl property:', videoAssets.aerial);
        return null;
      }
      
      source = videoAssets.aerial.accessUrl;
      console.log('Using aerial video source:', source);
    } else if (currentVideo === 'transition' && videoAssets.transition) {
      console.log('Transition video assets:', videoAssets.transition);
      
      if (!videoAssets.transition.accessUrl) {
        console.error('Transition video is missing accessUrl property:', videoAssets.transition);
        return null;
      }
      
      source = videoAssets.transition.accessUrl;
      console.log('Using transition video source:', source);
    } else if (activeHotspot) {
      // Handle playlist videos
      const [type, hotspotId] = currentVideo.split('_');
      
      if (!videoAssets[type]) {
        console.error(`Video assets for ${type} not found:`, videoAssets);
        return null;
      }
      
      const video = videoAssets[type]?.find(v => v.hotspotId === hotspotId);
      console.log(`Playlist video (${type}_${hotspotId}):`, video);
      
      if (video) {
        if (!video.accessUrl) {
          console.error('Playlist video is missing accessUrl property:', video);
          return null;
        }
        
        source = video.accessUrl;
        console.log('Using playlist video source:', source);
      } else {
        console.error(`Playlist video (${type}_${hotspotId}) not found in assets:`, videoAssets[type]);
      }
    }
    
    if (source) {
      return formatVideoUrl(source);
    } else {
      console.warn('No source found for video type:', currentVideo);
    }
    return source;
  }, [videoAssets, currentVideo, activeHotspot, inPlaylistSequence, formatVideoUrl]);

  // Define handleVideoError with useCallback to avoid recreation on every render
  const handleVideoError = useCallback((e) => {
    console.error('Error loading video:', e);
    
    if (videoRef.current) {
      console.error('Video error code:', videoRef.current.error?.code);
      console.error('Video error message:', videoRef.current.error?.message);
      console.error('Video element:', videoRef.current);
      console.error('Video source:', videoRef.current.src);
    }
    
    console.error('Video asset details:', 
      currentVideo === 'aerial' ? videoAssets?.aerial : 
      currentVideo === 'transition' ? videoAssets?.transition : 
      'playlist video');
      
    setError('Failed to load video. Please try refreshing the page.');
    setIsLoading(false);
    
    // If aerial video fails, try to continue with other videos
    if (currentVideo === 'aerial' && onVideoEnded) {
      console.warn('Aerial video failed, handling as if video ended');
      onVideoEnded('aerial');
    }
  }, [currentVideo, videoAssets, onVideoEnded]);

  // Reset states when video changes
  useEffect(() => {
    if (videoRef.current) {
      const source = getCurrentVideoSource();
      
      // Skip reloading if source is the same as current
      if (source && source === currentSourceRef.current && !error) {
        console.log('Video source unchanged, skipping reload:', source);
        return;
      }
      
      // Skip loading indicator if we're transitioning between playlist videos
      // and the videos are already preloaded
      const isPreloadedSequence = inPlaylistSequence && 
                                sequencePreloadedRef.current && 
                                activeHotspot && 
                                sequenceVideosRef.current[activeHotspot._id]?.loaded;
                                
      // Save new source to ref
      currentSourceRef.current = source;
      
      // Only reset error state, keep isLoading as is during playlist sequence
      setError(null);
      
      // Only set loading to true if not in a playlist sequence or not preloaded
      if (!inPlaylistSequence && !isPreloadedSequence) {
        console.log('Setting isLoading to true for non-sequence or non-preloaded video');
        setIsLoading(true);
      } else if (inPlaylistSequence && !isPreloadedSequence) {
        // For sequence videos that aren't yet preloaded, show minimal loading indicator
        console.log('Setting isLoading to true for sequence video not yet preloaded');
        setIsLoading(true);
      } else {
        console.log('Keeping loading state for preloaded sequence video');
      }
      
      if (source) {
        console.log('Setting video source:', source);
        
        if (isPreloadedSequence) {
          // For preloaded sequence videos, we want immediate playback
          console.log('Using preloaded video for smooth transition');
          
          // Set source and load immediately
          videoRef.current.src = source;
          videoRef.current.load();
          
          // Auto-play after a very short delay to ensure smooth transition
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().catch(err => {
                console.error('Error playing preloaded video:', err);
              });
            }
          }, 50);
        } else {
          // Normal loading process for non-sequence videos
          videoRef.current.src = source;
          videoRef.current.load();
        }
        
        // Add timeout to handle videos that might fail to load silently
        const loadTimeout = setTimeout(() => {
          if (isLoading) {
            console.warn('Video load timeout reached, handling as error');
            handleVideoError(new Error('Video load timeout'));
          }
        }, 10000); // 10 second timeout
        
        return () => clearTimeout(loadTimeout);
      } else {
        console.warn('No video source available for:', currentVideo);
        setIsLoading(false);
        setError('No video source available');
      }
    }
  }, [currentVideo, videoAssets, activeHotspot, getCurrentVideoSource, isLoading, handleVideoError, error, inPlaylistSequence]);

  const handleVideoLoaded = () => {
    console.log('Video loaded successfully:', currentVideo);
    setIsLoading(false);
    setError(null);
    
    // Start playback immediately for sequence videos
    if (inPlaylistSequence) {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      }
    } else {
      // Start playback after a short delay for non-sequence videos
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
    }
  };

  // Handle specific onEnded behavior based on video type
  const handleVideoEnded = () => {
    // Only trigger onVideoEnded for non-aerial videos
    // Aerial videos will loop automatically due to the loop attribute
    if (currentVideo !== 'aerial' && onVideoEnded) {
      onVideoEnded(currentVideo);
    }
  };

  return (
    <div className="video-player-container">
      {error && (
        <div className="video-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {/* Only show loading spinner for initial loads, not during playlist transitions */}
      {isLoading && !error && !inPlaylistSequence && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      )}
      <video
        ref={videoRef}
        className="video-player"
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        onLoadedData={handleVideoLoaded}
        // Remove controls so play/pause buttons aren't visible
        autoPlay
        playsInline
        // Add loop attribute for aerial videos
        loop={currentVideo === 'aerial'}
        // Preload videos for better performance
        preload="auto"
      />
    </div>
  );
};

export default VideoPlayer;
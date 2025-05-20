import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

// Import baseBackendUrl for consistent URL handling
import { baseBackendUrl } from '../../utils/api';

const VideoPlayer = ({ 
  videoAssets, 
  currentVideo, 
  onVideoEnded,
  activeHotspot,
  videoLoader,
  onVideoRef // New prop to expose the video reference
}) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Add state to track if we're in a playlist sequence
  const [inPlaylistSequence, setInPlaylistSequence] = useState(false);
  // Add state to explicitly track initial load vs transitions
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // Add ref to track the current source to avoid unnecessary reloading
  const currentSourceRef = useRef(null);
  // Add ref to track preloaded videos in the current sequence
  const sequenceVideosRef = useRef({});
  // Add ref to track if the entire sequence is preloaded
  const sequencePreloadedRef = useRef(false);
  // Add ref to track if we're transitioning between playlist videos
  const isTransitioningRef = useRef(false);
  // Add ref to track sequence mode without state timing issues
  const inSequenceRef = useRef(false);
  // Track which video we're currently playing
  const currentVideoRef = useRef(currentVideo);

  // Update currentVideoRef when currentVideo changes
  useEffect(() => {
    currentVideoRef.current = currentVideo;
  }, [currentVideo]);

  // Expose video reference to parent components
  useEffect(() => {
    if (videoRef.current) {
      if (onVideoRef) {
        // Create a reference to the current video element to avoid ESLint warning
        const currentVideoEl = videoRef.current;
        
        // Ensure we pass the actual DOM element
        onVideoRef(currentVideoEl);
        
        // Create named event handlers so they can be properly removed
        const eventHandlers = {};
        
        // Update on every video state change
        const videoEvents = [
          'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
          'playing', 'resize', 'durationchange'
        ];
        
        videoEvents.forEach(event => {
          // Store the handler function so we can remove it later
          eventHandlers[event] = () => {
            if (onVideoRef && videoRef.current) {
              onVideoRef(videoRef.current);
            }
          };
          
          // Add the event listener
          currentVideoEl.addEventListener(event, eventHandlers[event]);
        });
        
        // Cleanup event listeners
        return () => {
          // Use the captured reference to the video element
          videoEvents.forEach(event => {
            if (eventHandlers[event]) {
              // This fixes the ESLint warning by using a captured value
              currentVideoEl.removeEventListener(event, eventHandlers[event]);
            }
          });
        };
      }
    }
  }, [onVideoRef, videoRef, currentVideo]);

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

  // Helper function to check if a video is part of a sequence
  const isSequenceVideo = useCallback((videoType) => {
    return videoType === 'diveIn' || 
           videoType === 'floorLevel' || 
           videoType === 'zoomOut' ||
           videoType?.startsWith('diveIn_') ||
           videoType?.startsWith('floorLevel_') ||
           videoType?.startsWith('zoomOut_');
  }, []);

  // Extract the base type from a video type string (e.g., 'diveIn_123abc' -> 'diveIn')
  const getBaseVideoType = useCallback((videoType) => {
    if (!videoType || typeof videoType !== 'string') return '';
    return videoType.includes('_') ? videoType.split('_')[0] : videoType;
  }, []);

  // Extract the hotspot ID from a video type string (e.g., 'diveIn_123abc' -> '123abc')
  const getHotspotIdFromVideoType = useCallback((videoType) => {
    if (!videoType || typeof videoType !== 'string' || !videoType.includes('_')) return null;
    return videoType.split('_')[1];
  }, []);

  // Track when we enter a playlist sequence
  useEffect(() => {
    // Check if this is a playlist sequence video
    const isCurrentVideoInSequence = isSequenceVideo(currentVideo);
    
    if (isCurrentVideoInSequence && activeHotspot) {
      // We're in a playlist sequence - set both state and ref
      setInPlaylistSequence(true);
      inSequenceRef.current = true;
      
      // Get the base video type for determining transitions
      const baseVideoType = getBaseVideoType(currentVideo);
      
      // Set transitioning flag at the start of video change
      if (baseVideoType === 'diveIn') {
        // Only set transitioning when entering the sequence
        isTransitioningRef.current = true;
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 3000); // Extend to 3 seconds
      } else if (baseVideoType === 'floorLevel' || baseVideoType === 'zoomOut') {
        // Set transitioning for subsequent videos in sequence
        isTransitioningRef.current = true;
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 3000); // Extend to 3 seconds
      }
      
      // Always force isLoading to false for sequence videos
      setIsLoading(false);
    } else {
      // Not in a playlist sequence
      setInPlaylistSequence(false);
      
      // If we're returning to aerial from a sequence, set transitioning
      if (currentVideo === 'aerial' && (inPlaylistSequence || inSequenceRef.current)) {
        isTransitioningRef.current = true;
        
        // Only reset the sequence ref when returning to aerial
        inSequenceRef.current = false;
        
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 3000); // Extend to 3 seconds
      }
    }
  }, [currentVideo, activeHotspot, inPlaylistSequence, isSequenceVideo, getBaseVideoType]);

  // Preload all videos in a sequence when we detect an active hotspot
  useEffect(() => {
    if (!activeHotspot || !videoAssets || activeHotspot.type !== 'PRIMARY') {
      return;
    }

    const preloadSequence = async () => {
      try {
        // Get playlist info
        const hotspotId = activeHotspot._id;
        
        // Initialize loader if needed
        if (!videoLoader) {
          return;
        }
        
        // Check if we have already preloaded the sequence for this hotspot
        if (sequencePreloadedRef.current && sequenceVideosRef.current[hotspotId]) {
          return;
        }
        
        // Find videos in the sequence
        const diveInAsset = videoAssets.diveIn?.find(v => v.hotspotId === hotspotId);
        const floorLevelAsset = videoAssets.floorLevel?.find(v => v.hotspotId === hotspotId);
        const zoomOutAsset = videoAssets.zoomOut?.find(v => v.hotspotId === hotspotId);
        
        // Check if we have all required videos
        const missingVideos = [];
        if (!diveInAsset) missingVideos.push('Dive In');
        if (!floorLevelAsset) missingVideos.push('Floor Level');
        if (!zoomOutAsset) missingVideos.push('Zoom Out');
        
        if (missingVideos.length > 0) {
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
        await videoLoader.preloadAll();
        
        // Store loaded videos in reference
        sequenceVideosRef.current[hotspotId] = {
          diveIn: diveInUrl,
          floorLevel: floorLevelUrl,
          zoomOut: zoomOutUrl,
          loaded: true
        };
        
        sequencePreloadedRef.current = true;
      } catch (error) {
        console.error('Error preloading sequence videos:', error);
      }
    };
    
    preloadSequence();
  }, [activeHotspot, videoAssets, videoLoader, formatVideoUrl]);

  // Get the current video source with memoization
  const getCurrentVideoSource = useCallback(() => {
    if (!videoAssets || !currentVideo) {
      return null;
    }
    
    let source = null;
    
    // Check if we're playing a sequence video
    if ((inPlaylistSequence || inSequenceRef.current) && activeHotspot) {
      // Extract hotspot ID from the currentVideo if available, otherwise use activeHotspot._id
      const hotspotId = getHotspotIdFromVideoType(currentVideo) || activeHotspot._id;
      const baseVideoType = getBaseVideoType(currentVideo);
      
      // Debug the videoAssets arrays
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Looking for ${baseVideoType} video for hotspot ${hotspotId}`);
        if (videoAssets[baseVideoType]) {
          console.log(`Available ${baseVideoType} videos:`, 
            videoAssets[baseVideoType].map(v => ({
              id: v._id,
              hotspotId: v.hotspotId || 'none',
              name: v.name
            }))
          );
        } else {
          console.warn(`No ${baseVideoType} videos available in videoAssets`);
        }
      }
      
      // Check if we have preloaded videos for this specific hotspot
      const sequenceVideos = sequenceVideosRef.current[hotspotId];
      
      if (sequenceVideos?.loaded) {
        // Mark that videos are preloaded so we don't show loading indicators
        sequencePreloadedRef.current = true;
        
        // Get preloaded URL from sequence cache for the specific hotspot
        if (baseVideoType === 'diveIn') {
          source = sequenceVideos.diveIn;
        } else if (baseVideoType === 'floorLevel') {
          source = sequenceVideos.floorLevel;
        } else if (baseVideoType === 'zoomOut') {
          source = sequenceVideos.zoomOut;
        }
        
        if (source) {
          return source;
        }
      }
    }
    
    // Handle non-sequence videos
    if (currentVideo === 'aerial' && videoAssets.aerial) {
      if (!videoAssets.aerial.accessUrl) {
        console.error('Aerial video is missing accessUrl property:', videoAssets.aerial);
        return null;
      }
      
      // Log which aerial video we're playing to help debug location switching issues
      console.log(`Playing aerial video: ${videoAssets.aerial.name} (${videoAssets.aerial._id})`, 
                  videoAssets.aerial.locationId ? `for location ${videoAssets.aerial.locationId}` : '');
      
      source = videoAssets.aerial.accessUrl;
    } else if (currentVideo === 'transition' && videoAssets.transition) {
      if (!videoAssets.transition.accessUrl) {
        console.error('Transition video is missing accessUrl property:', videoAssets.transition);
        return null;
      }
      
      console.log(`Playing transition video: ${videoAssets.transition.name}`);
      source = videoAssets.transition.accessUrl;
    } else if (activeHotspot) {
      // For playlist videos with format "type_hotspotId"
      const baseType = getBaseVideoType(currentVideo);
      const hotspotId = getHotspotIdFromVideoType(currentVideo) || activeHotspot._id;
      
      if (!videoAssets[baseType]) {
        console.error(`Video assets for ${baseType} not found:`, videoAssets);
        return null;
      }
      
      // Find the video for the specific hotspot
      const video = videoAssets[baseType]?.find(v => v.hotspotId === hotspotId);
      
      if (video) {
        if (!video.accessUrl) {
          console.error('Playlist video is missing accessUrl property:', video);
          return null;
        }
        
        source = video.accessUrl;
      } else {
        // Improved error message with more context
        console.error(
          `Playlist video (${baseType} for hotspot ${hotspotId}) not found in assets:`, 
          videoAssets[baseType],
          `\nActive hotspot:`, activeHotspot,
          `\nAvailable videos:`, videoAssets[baseType]?.map(v => `${v.name} (${v.hotspotId || 'no hotspot'})`)
        );
      }
    }
    
    if (source) {
      // First format the URL properly
      const formattedSource = formatVideoUrl(source);
      
      // Then add a cache-busting parameter to ensure the browser doesn't cache the video
      // This is critical for location switching to work properly
      const sourceWithCache = formattedSource.includes('?') ? 
        `${formattedSource}&nocache=${Date.now()}` : 
        `${formattedSource}?nocache=${Date.now()}`;
      
      return sourceWithCache;
    }
    return source;
  }, [videoAssets, currentVideo, activeHotspot, inPlaylistSequence, formatVideoUrl, inSequenceRef, getBaseVideoType, getHotspotIdFromVideoType]);

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
      
    // Don't show errors for sequence videos - just continue to the next video
    if (isSequenceVideo(currentVideo)) {
      console.warn(`Error loading sequence video ${currentVideo}, continuing to next video`);
      setIsLoading(false);
      
      // Go to the next video in sequence
      if (onVideoEnded) {
        onVideoEnded(currentVideo);
      }
      return;
    }
    
    setError('Failed to load video. Please try refreshing the page.');
    setIsLoading(false);
    
    // If aerial video fails, try to continue with other videos
    if (currentVideo === 'aerial' && onVideoEnded) {
      console.warn('Aerial video failed, handling as if video ended');
      onVideoEnded('aerial');
    }
  }, [currentVideo, videoAssets, onVideoEnded, isSequenceVideo]);

  // Reset states when video changes
  useEffect(() => {
    if (videoRef.current) {
      const source = getCurrentVideoSource();
      
      // Add a timestamp to prevent browser caching when switching between locations
      const sourceWithTimestamp = source ? `${source}${source.includes('?') ? '&' : '?'}t=${Date.now()}` : null;
      
      // Skip reloading if source is the same as current
      if (source && source === currentSourceRef.current && !error) {
        // Even if source is the same, we should reload if we're changing video type
        // This ensures proper reload when returning to a previously viewed location
        const currentType = currentVideo?.split('_')[0]; // Extract base type (aerial, transition, etc)
        const prevType = currentVideoRef.current?.split('_')[0];
        
        // If we're just changing between the same type, we can skip reloading
        if (currentType === prevType) {
          return;
        }
        // Otherwise we'll continue and force a reload of the video
      }
      
      // Check if videos in the sequence are preloaded
      const isPreloadedSequence = (inPlaylistSequence || inSequenceRef.current) && 
                                activeHotspot && 
                                sequenceVideosRef.current[activeHotspot._id]?.loaded;
      
      // Always consider sequence as preloaded if we have the videos in our ref
      if (isPreloadedSequence) {
        sequencePreloadedRef.current = true;
      }
                                
      // Save new source to ref - use the source without timestamp for comparison later
      currentSourceRef.current = source;
      
      // Only reset error state
      setError(null);
      
      // IMMEDIATELY set isLoading to false for ANY sequence video or transition
      if (isSequenceVideo(currentVideo) || isTransitioningRef.current) {
        setIsLoading(false);
      } else if (!initialLoadComplete) {
        // For initial videos (aerial, transition), show loading only for the first load
        setIsLoading(true);
      }
      
      if (sourceWithTimestamp) {
        // Set source and load immediately for all videos
        videoRef.current.src = sourceWithTimestamp;
        videoRef.current.load();
        
        // Auto-play immediately for smooth transitions
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
          
          // If we can't play, don't show loader - just try to recover
          if (isSequenceVideo(currentVideo)) {
            console.warn(`Could not play ${currentVideo}, attempting to continue sequence`);
            if (onVideoEnded) {
              // Try to move to next video
              onVideoEnded(currentVideo);
            }
          }
        });
        
        // For preloaded sequences or transitions, never show loading indicators
        if (isPreloadedSequence || isTransitioningRef.current || inSequenceRef.current || 
            isSequenceVideo(currentVideo)) {
          setIsLoading(false);
        }
        
        // Add timeout to handle videos that might fail to load silently
        const loadTimeout = setTimeout(() => {
          if (isLoading) {
            // Don't trigger error for sequence videos - just continue
            if (isSequenceVideo(currentVideoRef.current)) {
              console.warn(`Loading timeout for sequence video ${currentVideoRef.current}, continuing`);
              if (onVideoEnded) {
                onVideoEnded(currentVideoRef.current);
              }
            } else {
              handleVideoError(new Error('Video load timeout'));
            }
          }
        }, 10000); // 10 second timeout
        
        return () => clearTimeout(loadTimeout);
      } else {
        setIsLoading(false);
        setError('No video source available');
      }
    }
  }, [currentVideo, videoAssets, activeHotspot, getCurrentVideoSource, isLoading, handleVideoError, error, inPlaylistSequence, initialLoadComplete, isSequenceVideo, onVideoEnded, inSequenceRef]);

  const handleVideoLoaded = () => {
    setIsLoading(false);
    setError(null);
    
    // Mark initial load as complete after first video loads
    if (!initialLoadComplete) {
      setInitialLoadComplete(true);
    }
    
    // Expose the video ref again after loading is complete
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
    
    // Start playback immediately for all videos
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
        
        // If we can't play a sequence video, try to move to next one
        if (isSequenceVideo(currentVideoRef.current)) {
          console.warn(`Could not play ${currentVideoRef.current}, attempting to continue sequence`);
          if (onVideoEnded) {
            onVideoEnded(currentVideoRef.current);
          }
        }
      });
    }
  };

  // Handle specific onEnded behavior based on video type
  const handleVideoEnded = () => {
    // Only trigger onVideoEnded for non-aerial videos
    // Aerial videos will loop automatically due to the loop attribute
    if (currentVideo !== 'aerial' && onVideoEnded) {
      // Set transitioning flag before video changes - for ALL sequence videos
      if (isSequenceVideo(currentVideo)) {
        isTransitioningRef.current = true;
        // Reset after a longer delay - 3 seconds should cover loading time
        setTimeout(() => {
          if (currentVideoRef.current !== currentVideo) { // Only reset if we've moved to a new video
            isTransitioningRef.current = false;
          }
        }, 3000);
      }
      
      // Force isLoading to false for ALL sequence transitions
      setIsLoading(false);
      
      onVideoEnded(currentVideo);
    }
  };

  return (
    <div 
      className={cn(
        "relative w-full h-full overflow-hidden",
        currentVideo === 'aerial' ? "bg-[#def2f4]" : "bg-black"
      )} 
      data-video-type={currentVideo}
    >
      {error && !isSequenceVideo(currentVideo) && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                      bg-black/70 p-5 rounded-lg text-white text-center max-w-[80%] z-20">
          <p className="m-0 mb-4 text-base">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 py-2 px-4 bg-netflix-red text-white border-none rounded cursor-pointer
                     hover:bg-netflix-red/90"
          >
            Retry
          </button>
        </div>
      )}
      {/* Only show loading spinner when:
          1. isLoading is true
          2. There's no error
          3. We're not in a playlist sequence
          4. We're not in a sequence (via ref)
          5. We're not transitioning between videos
          6. Current video is not a sequence video
      */}
      {isLoading && !error && 
        !inPlaylistSequence && 
        !inSequenceRef.current && 
        !isTransitioningRef.current && 
        !isSequenceVideo(currentVideo) && (
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/60 text-white z-15">
            <div className="w-[50px] h-[50px] border-3 border-white/30 rounded-full border-t-netflix-red
                          animate-spin mb-4"></div>
            <p className="m-0 text-base">Loading video...</p>
          </div>
      )}
      <video
        ref={videoRef}
        className={cn(
          "w-full h-full absolute top-0 left-0 object-contain",
          currentVideo === 'aerial' ? "bg-[#def2f4]" : "bg-black",
          "hover:cursor-default"
        )}
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
        data-video-id={`video-${currentVideo}`}
      />
    </div>
  );
};

export default VideoPlayer;
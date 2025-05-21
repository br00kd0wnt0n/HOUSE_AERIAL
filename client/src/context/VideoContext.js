// client/src/context/VideoContext.js - Context for video state management

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import api, { baseBackendUrl } from '../utils/api';

const VideoContext = createContext();

export function useVideo() {
  return useContext(VideoContext);
}

// Helper function to properly format video URLs
const formatVideoUrl = (url) => {
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
};

export function VideoProvider({ children }) {
  // State for locations
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  
  // Video state
  const [currentVideo, setCurrentVideo] = useState('aerial');
  const [aerialVideo, setAerialVideo] = useState(null);
  const [transitionVideo, setTransitionVideo] = useState(null);
  const [videoSequence, setVideoSequence] = useState(null);
  
  // Hotspot state
  const [hotspots, setHotspots] = useState([]);
  const [activeHotspot, setActiveHotspot] = useState(null);
  
  // Cache for assets by location
  const [assetsCache, setAssetsCache] = useState({});
  
  // Refs for video elements
  const aerialVideoRef = useRef(null);
  const diveInVideoRef = useRef(null);
  const floorLevelVideoRef = useRef(null);
  const zoomOutVideoRef = useRef(null);
  const transitionVideoRef = useRef(null);
  
  // Add ref to track the last location ID to detect changes
  const lastLocationIdRef = useRef(null);
  
  // Create a dedicated cache for transition videos
  const [transitionVideosCache, setTransitionVideosCache] = useState({});
  
  // Add ref to track if we've started preloading transition videos
  const transitionPreloadStartedRef = useRef(false);
  
  // Add state to track if we're in transition mode
  const [isInTransition, setIsInTransition] = useState(false);
  
  // Add state to track stable videos that won't change quickly
  const [stableAerialVideo, setStableAerialVideo] = useState(null);
  
  // Add ref to track if we need to update the stable video
  const pendingStableUpdateRef = useRef(null);
  
  // Load initial locations only once
  useEffect(() => {
    let isMounted = true;
    
    const fetchLocations = async () => {
      if (!isMounted) return;
      
      try {
        const response = await api.getLocations();
        if (isMounted) {
          setLocations(response.data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchLocations();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once
  
  // Enhanced setCurrentLocation function with additional validation
  const handleLocationChange = (location) => {
    if (!location) return;
    
    // Track location changes for debugging
    const isLocationChange = lastLocationIdRef.current !== location._id;
    if (isLocationChange) {
      console.log(`Changing location from ${lastLocationIdRef.current || 'initial'} to ${location._id} (${location.name})`);
      lastLocationIdRef.current = location._id;
    }
    
    // Update currentLocation state
    setCurrentLocation(location);
  };
  
  // Preload all transition videos for better location switching
  useEffect(() => {
    // Only run once
    if (transitionPreloadStartedRef.current) {
      return;
    }
    
    let isMounted = true;
    transitionPreloadStartedRef.current = true;
    
    const preloadTransitionVideos = async () => {
      try {
        console.log('Preloading all transition videos for smoother location changes');
        
        // Fetch all transition videos
        const transitionResponse = await api.getAssetsByType('Transition');
        
        if (!isMounted) return;
        
        // Store all transition videos in the dedicated cache
        const transitionAssets = transitionResponse.data || [];
        
        if (transitionAssets.length > 0) {
          console.log(`Found ${transitionAssets.length} transition videos to cache`);
          
          // Format the videos and add to cache
          const transitionCache = {};
          
          for (const video of transitionAssets) {
            if (video.accessUrl) {
              // Ensure we have a properly formatted URL with baseBackendUrl
              video.accessUrl = formatVideoUrl(video.accessUrl);
              
              // Use the video ID as the key in the cache
              transitionCache[video._id] = video;
              
              // Also store by name for easier lookup
              if (video.name) {
                transitionCache[video.name] = video;
              }
              
              // Try to pre-fetch the video to browser cache using Image preloading trick
              try {
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.href = video.accessUrl;
                preloadLink.as = 'video';
                document.head.appendChild(preloadLink);
                
                // Clean up after 10 seconds to avoid memory leaks
                setTimeout(() => {
                  if (document.head.contains(preloadLink)) {
                    document.head.removeChild(preloadLink);
                  }
                }, 10000);
              } catch (err) {
                // Ignore errors in prefetching
              }
            }
          }
          
          // Update the transition cache state
          setTransitionVideosCache(transitionCache);
          
          // Also update the general transition video state with the first video
          if (transitionAssets.length > 0 && !transitionVideo) {
            setTransitionVideo(transitionAssets[0]);
          }
          
          console.log('Successfully cached transition videos for faster switching');
        }
      } catch (error) {
        console.error('Error preloading transition videos:', error);
      }
    };
    
    preloadTransitionVideos();
    
    return () => {
      isMounted = false;
    };
  }, [transitionVideo]); // Added transitionVideo as a dependency
  
  // Update stable aerial video with debounce to avoid flicker
  useEffect(() => {
    if (aerialVideo && (!stableAerialVideo || stableAerialVideo._id !== aerialVideo._id)) {
      // Cancel any pending updates
      if (pendingStableUpdateRef.current) {
        clearTimeout(pendingStableUpdateRef.current);
      }
      
      // Wait a bit before updating to ensure we don't get quick switches
      pendingStableUpdateRef.current = setTimeout(() => {
        setStableAerialVideo(aerialVideo);
        pendingStableUpdateRef.current = null;
      }, 500);
    }
    
    return () => {
      if (pendingStableUpdateRef.current) {
        clearTimeout(pendingStableUpdateRef.current);
      }
    };
  }, [aerialVideo, stableAerialVideo]);
  
  // Load assets for current location with improved caching and cache validation
  useEffect(() => {
    if (!currentLocation) return;
    
    let isMounted = true;
    console.log(`Loading assets for location ${currentLocation._id} (${currentLocation.name})`);
    
    const fetchAssets = async () => {
      // Check if cache exists and is valid for this location
      const hasValidCache = assetsCache[currentLocation._id] && 
                          assetsCache[currentLocation._id].aerial && 
                          assetsCache[currentLocation._id].aerial.accessUrl;
      
      if (hasValidCache) {
        const cachedAssets = assetsCache[currentLocation._id];
        if (isMounted) {
          console.log(`Using cached assets for location: ${currentLocation.name}`);
          console.log(`Cached aerial video: ${cachedAssets.aerial.name} (${cachedAssets.aerial._id})`);
          
          // Ensure the aerial video has the location ID tagged for debugging
          const updatedAerialVideo = {
            ...cachedAssets.aerial,
            locationId: currentLocation._id, // Add explicit location tag
            locationName: currentLocation.name
          };
          
          // Update states with cached data
          setAerialVideo(updatedAerialVideo);
          
          // Only update transition video if we don't already have one
          if (!transitionVideo && cachedAssets.transition) {
            setTransitionVideo(cachedAssets.transition);
          }
          
          setHotspots(cachedAssets.hotspots);
          setIsLoading(false);
        }
        return;
      }
      
      if (isMounted) {
        setIsLoading(true);
      }
      
      try {
        console.log(`Fetching new assets for location: ${currentLocation.name}`);
        
        // Load all assets in parallel but handle transition videos separately
        // since we've already preloaded them
        const [aerialResponse, hotspotsResponse] = await Promise.all([
          api.getAssetsByType('AERIAL', currentLocation._id),
          api.getHotspotsByLocation(currentLocation._id)
        ]);
        
        if (!isMounted) return;
        
        console.log('Aerial video response:', aerialResponse.data);
        
        const aerialAsset = aerialResponse.data.length > 0 ? aerialResponse.data[0] : null;
        const hotspots = hotspotsResponse.data;
        
        // Use cached transition video or fetch if needed
        let transitionAsset = transitionVideo;
        if (!transitionAsset && Object.keys(transitionVideosCache).length > 0) {
          // Get first transition video from cache
          transitionAsset = Object.values(transitionVideosCache)[0];
          console.log('Using cached transition video:', transitionAsset.name);
        } else if (!transitionAsset) {
          // Fetch transition video only if not already available
          try {
            const transitionResponse = await api.getAssetsByType('Transition');
            transitionAsset = transitionResponse.data.length > 0 ? transitionResponse.data[0] : null;
            
            if (transitionAsset) {
              console.log('Fetched transition video:', transitionAsset.name);
            }
          } catch (error) {
            console.error('Error fetching transition video:', error);
          }
        }
        
        // Make sure the video URLs are properly formatted using our formatter function
        if (aerialAsset && aerialAsset.accessUrl) {
          aerialAsset.accessUrl = formatVideoUrl(aerialAsset.accessUrl);
          console.log(`Formatted aerial video URL for ${currentLocation.name}:`, aerialAsset.accessUrl);
          
          // Tag the aerial video with location info for debugging
          aerialAsset.locationId = currentLocation._id;
          aerialAsset.locationName = currentLocation.name;
        }
        
        if (transitionAsset && transitionAsset.accessUrl) {
          transitionAsset.accessUrl = formatVideoUrl(transitionAsset.accessUrl);
          console.log('Formatted transition video URL:', transitionAsset.accessUrl);
        }
        
        // Cache the assets for this location
        setAssetsCache(prev => ({
          ...prev,
          [currentLocation._id]: {
            aerial: aerialAsset,
            transition: transitionAsset, // Use the transition from cache or new fetch
            hotspots: hotspots
          }
        }));
        
        // Update states with newly fetched data
        setAerialVideo(aerialAsset);
        
        // Only update transition video if we have a new one and it's not already set
        if (transitionAsset && (!transitionVideo || transitionVideo._id !== transitionAsset._id)) {
          setTransitionVideo(transitionAsset);
        }
        
        setHotspots(hotspots);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching assets:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchAssets();
    
    return () => {
      isMounted = false;
    };
  }, [currentLocation, assetsCache, transitionVideo, transitionVideosCache]); // Removed formatVideoUrl from dependencies
  
  // Handle hotspot click
  const handleHotspotClick = async (hotspot) => {
    // If hotspot is null (called from InfoPanel close), just clear the active hotspot
    if (!hotspot) {
      setActiveHotspot(null);
      return;
    }
    
    setActiveHotspot(hotspot);
    
    // Only handle PRIMARY hotspot video sequences
    if (hotspot.type === 'PRIMARY') {
      try {
        const playlistResponse = await api.getPlaylistByHotspot(hotspot._id);
        const playlist = playlistResponse.data;
        
        console.log('Playlist fetched for hotspot:', playlist);
        
        // First check if playlist.sequence exists
        if (!playlist.sequence) {
          console.error('Playlist is missing sequence property. Playlist requires configuration in Admin Panel.');
          return;
        }
        
        // Set video sequence and start playback only if all videos are present
        if (playlist.sequence.diveInVideo && 
            playlist.sequence.floorLevelVideo && 
            playlist.sequence.zoomOutVideo) {
          
          // Make sure the video URLs are properly formatted using our helper function
          if (playlist.sequence.diveInVideo.accessUrl) {
            playlist.sequence.diveInVideo.accessUrl = formatVideoUrl(playlist.sequence.diveInVideo.accessUrl);
          }
          
          if (playlist.sequence.floorLevelVideo.accessUrl) {
            playlist.sequence.floorLevelVideo.accessUrl = formatVideoUrl(playlist.sequence.floorLevelVideo.accessUrl);
          }
          
          if (playlist.sequence.zoomOutVideo.accessUrl) {
            playlist.sequence.zoomOutVideo.accessUrl = formatVideoUrl(playlist.sequence.zoomOutVideo.accessUrl);
          }
          
          // Store the sequence in state and include the hotspot ID to identify which sequence it is
          setVideoSequence({
            hotspotId: hotspot._id,
            diveIn: playlist.sequence.diveInVideo,
            floorLevel: playlist.sequence.floorLevelVideo,
            zoomOut: playlist.sequence.zoomOutVideo
          });
          
          // Small artificial delay to ensure videos are fully preloaded
          // This prevents the spinner from appearing during transitions
          setTimeout(() => {
            // Start playing the sequence - use format 'diveIn_hotspotId' to identify which hotspot's playlist we're playing
            setCurrentVideo(`diveIn_${hotspot._id}`);
          }, 50); // 50ms delay is imperceptible but helps with preloading
        } else {
          console.error('Playlist is incomplete. One or more videos missing.');
          // Show visual feedback to the user (maybe a toast notification)
        }
      } catch (error) {
        console.error('Error fetching playlist:', error);
      }
    }
  };
  
  // Handle changing location with improved transition handling
  const changeLocation = (locationId) => {
    const newLocation = locations.find(loc => loc._id === locationId);
    if (newLocation) {
      // Skip if already in transition mode
      if (isInTransition) {
        console.log('Already in transition mode, ignoring location change request');
        return;
      }
    
      // Mark that we're in transition mode - this will prevent loading indicators
      setIsInTransition(true);
      
      // Ensure we have a transition video before changing location
      let usableTransitionVideo = transitionVideo;
      
      if (!usableTransitionVideo && Object.keys(transitionVideosCache).length > 0) {
        // Get transition video from cache if we don't have one set
        usableTransitionVideo = Object.values(transitionVideosCache)[0];
        console.log('Using cached transition video for location change:', usableTransitionVideo.name);
        // Update the transition video state
        setTransitionVideo(usableTransitionVideo);
      }
      
      // Handle location directly without explicit transition video playback
      // Let Experience.js handle the transition video
      handleLocationChange(newLocation);
      
      // Reset transition mode after a delay (transition videos are typically short)
      // This ensures isInTransition is cleared even if something goes wrong
      setTimeout(() => {
        setIsInTransition(false);
      }, 8000); // 8 seconds should cover most transition videos and edge cases
    }
  };
  
  // Handle video sequence transitions with transition tracking
  const handleVideoEnded = (videoType) => {
    // Check if we're in a sequence by looking for the hotspot ID in the video type
    const isSequence = videoType.includes('_');
    
    if (isSequence) {
      // Extract the hotspot ID from the video type (e.g., 'diveIn_123abc' -> '123abc')
      const [baseType, hotspotId] = videoType.split('_');
      
      // Determine the next video in the sequence
      if (baseType === 'diveIn') {
        setCurrentVideo(`floorLevel_${hotspotId}`);
      } else if (baseType === 'floorLevel') {
        setCurrentVideo(`zoomOut_${hotspotId}`);
      } else if (baseType === 'zoomOut') {
        setCurrentVideo('aerial');
        setActiveHotspot(null);
      }
    } else if (videoType === 'transition') {
      // For the transition video - mark transition as complete
      setIsInTransition(false);
      
      // Set to aerial video if we're still on transition video
      // Only do this if we're not in the middle of a location change
      // Experience.js should handle navigation in most cases
      if (currentVideo === 'transition') {
        console.log('Transition video ended naturally in VideoContext');
        setCurrentVideo('aerial');
        setActiveHotspot(null);
      }
    }
    // Aerial video loops automatically, so no need to handle it here
  };
  
  // Track video loading progress
  const updateLoadingProgress = (loaded, total) => {
    setLoadingProgress({
      loaded,
      total,
      percent: Math.floor((loaded / total) * 100)
    });
  };
  
  // Add debug info about current aerial video
  useEffect(() => {
    if (aerialVideo) {
      console.log(`Current aerial video: ${aerialVideo.name} for location ${aerialVideo.locationName || 'unknown'}`);
    }
  }, [aerialVideo]);
  
  // Context value
  const value = {
    locations,
    currentLocation,
    setCurrentLocation: handleLocationChange, // Use enhanced function
    aerialVideo: stableAerialVideo || aerialVideo, // Use stable video when available
    transitionVideo,
    currentVideo,
    setCurrentVideo,
    isLoading,
    hotspots,
    activeHotspot,
    handleHotspotClick,
    changeLocation,
    handleVideoEnded,
    videoSequence,
    aerialVideoRef,
    diveInVideoRef,
    floorLevelVideoRef,
    zoomOutVideoRef,
    transitionVideoRef,
    loadingProgress,
    updateLoadingProgress,
    formatVideoUrl,
    transitionVideosCache,
    isInTransition // Export transition state
  };
  
  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
}

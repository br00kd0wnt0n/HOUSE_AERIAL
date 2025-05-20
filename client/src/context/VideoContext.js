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
  
  // Load assets for current location with improved caching
  useEffect(() => {
    if (!currentLocation) return;
    
    let isMounted = true;
    
    const fetchAssets = async () => {
      // Check if we already have assets cached for this location
      if (assetsCache[currentLocation._id]) {
        const cachedAssets = assetsCache[currentLocation._id];
        if (isMounted) {
          console.log('Using cached assets for location:', currentLocation.name);
          console.log('Cached aerial video:', cachedAssets.aerial);
          setAerialVideo(cachedAssets.aerial);
          setTransitionVideo(cachedAssets.transition);
          setHotspots(cachedAssets.hotspots);
        }
        return;
      }
      
      if (isMounted) {
        setIsLoading(true);
      }
      
      try {
        console.log('Fetching assets for location:', currentLocation.name);
        
        // Load all assets in parallel
        const [aerialResponse, transitionResponse, hotspotsResponse] = await Promise.all([
          api.getAssetsByType('AERIAL', currentLocation._id),
          api.getAssetsByType('Transition'),
          api.getHotspotsByLocation(currentLocation._id)
        ]);
        
        if (!isMounted) return;
        
        console.log('Aerial video response:', aerialResponse.data);
        
        const aerialVideo = aerialResponse.data.length > 0 ? aerialResponse.data[0] : null;
        const transitionVideo = transitionResponse.data.length > 0 ? transitionResponse.data[0] : null;
        const hotspots = hotspotsResponse.data;
        
        // Make sure the video URLs are properly formatted
        if (aerialVideo && aerialVideo.accessUrl) {
          aerialVideo.accessUrl = formatVideoUrl(aerialVideo.accessUrl);
          console.log('Formatted aerial video URL:', aerialVideo.accessUrl);
        }
        
        if (transitionVideo && transitionVideo.accessUrl) {
          transitionVideo.accessUrl = formatVideoUrl(transitionVideo.accessUrl);
          console.log('Formatted transition video URL:', transitionVideo.accessUrl);
        }
        
        // Cache the assets for this location
        setAssetsCache(prev => ({
          ...prev,
          [currentLocation._id]: {
            aerial: aerialVideo,
            transition: transitionVideo,
            hotspots: hotspots
          }
        }));
        
        setAerialVideo(aerialVideo);
        setTransitionVideo(transitionVideo);
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
  }, [currentLocation, assetsCache]); // Added assetsCache to dependency array
  
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
  
  // Handle changing location
  const changeLocation = (locationId) => {
    const newLocation = locations.find(loc => loc._id === locationId);
    if (newLocation) {
      // Play transition video first
      setCurrentVideo('transition');
      setCurrentLocation(newLocation);
    }
  };
  
  // Handle video sequence transitions
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
      // For the transition video
      setCurrentVideo('aerial');
      setActiveHotspot(null);
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
  
  // Context value
  const value = {
    locations,
    currentLocation,
    setCurrentLocation,
    aerialVideo,
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
    formatVideoUrl
  };
  
  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
}

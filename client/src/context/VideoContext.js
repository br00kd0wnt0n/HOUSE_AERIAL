// client/src/context/VideoContext.js - Context for video state management

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import api from '../utils/api';

const VideoContext = createContext();

export function useVideo() {
  return useContext(VideoContext);
}

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
        // Load all assets in parallel
        const [aerialResponse, transitionResponse, hotspotsResponse] = await Promise.all([
          api.getAssetsByType('AERIAL', currentLocation._id),
          api.getAssetsByType('Transition'),
          api.getHotspotsByLocation(currentLocation._id)
        ]);
        
        if (!isMounted) return;
        
        const aerialVideo = aerialResponse.data.length > 0 ? aerialResponse.data[0] : null;
        const transitionVideo = transitionResponse.data.length > 0 ? transitionResponse.data[0] : null;
        const hotspots = hotspotsResponse.data;
        
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
  }, [currentLocation?._id]); // Only depend on location ID
  
  // Handle hotspot click
  const handleHotspotClick = async (hotspot) => {
    setActiveHotspot(hotspot);
    
    // Only handle PRIMARY hotspot video sequences
    if (hotspot.type === 'PRIMARY') {
      try {
        const playlistResponse = await api.getPlaylistByHotspot(hotspot._id);
        const playlist = playlistResponse.data;
        
        // Set video sequence and start playback
        if (playlist.sequence.diveInVideo && 
            playlist.sequence.floorLevelVideo && 
            playlist.sequence.zoomOutVideo) {
          
          setVideoSequence({
            diveIn: playlist.sequence.diveInVideo,
            floorLevel: playlist.sequence.floorLevelVideo,
            zoomOut: playlist.sequence.zoomOutVideo
          });
          
          // Start playing the sequence
          setCurrentVideo('diveIn');
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
    if (videoType === 'diveIn') {
      setCurrentVideo('floorLevel');
    } else if (videoType === 'floorLevel') {
      setCurrentVideo('zoomOut');
    } else if (videoType === 'zoomOut' || videoType === 'transition') {
      setCurrentVideo('aerial');
      setActiveHotspot(null);
    }
    // Aerial video loops automatically
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
    updateLoadingProgress
  };
  
  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
}

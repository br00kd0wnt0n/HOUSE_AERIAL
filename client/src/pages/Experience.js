// client/src/pages/Experience.js - Main interactive video experience

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import HotspotOverlay from '../components/Hotspot/HotspotOverlay';
import InfoPanel from '../components/Hotspot/InfoPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import VideoLoader from '../utils/videoLoader';
import api, { baseBackendUrl } from '../utils/api';
import { cn } from '../lib/utils';
import '../styles/Experience.css';

// Add a custom hook for debounced state updates
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

const Experience = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { 
    locations, 
    setCurrentLocation, 
    currentVideo,
    setCurrentVideo,
    handleVideoEnded,
    hotspots,
    activeHotspot,
    handleHotspotClick,
    updateLoadingProgress,
    aerialVideo,
    transitionVideo,
    isLoading: contextLoading,
    aerialVideoRef: contextAerialVideoRef // Get the context's video ref
  } = useVideo();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoAssets, setVideoAssets] = useState(null);
  const [locationButtons, setLocationButtons] = useState([]);
  
  // Add state to store direct video reference
  const [directVideoRef, setDirectVideoRef] = useState(null);
  
  // Add retry state
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  // Add loadingFailed state to act as a circuit breaker
  const [loadingFailed, setLoadingFailed] = useState(false);
  
  // Use ref to track loaded assets without triggering re-renders
  const loadedAssetsRef = useRef({
    diveIn: false,
    floorLevel: false,
    zoomOut: false,
    button: false
  });
  
  // Track which asset types have been requested to prevent duplicate requests
  const requestedAssetsRef = useRef({
    diveIn: false,
    floorLevel: false,
    zoomOut: false,
    button: false
  });
  
  // Track component mount state
  const isMountedRef = useRef(true);
  
  // Video loader reference
  const videoLoader = useRef(new VideoLoader((loaded, total) => {
    const progress = Math.floor((loaded / total) * 100);
    setLoadingProgress(progress);
    updateLoadingProgress(loaded, total);
  }));

  // Add state to control when we're ready to display videos
  const [isVideoReady, setIsVideoReady] = useState(false);
  

  
  // Debounce the current video to prevent rapid switches
  const debouncedVideo = useDebounce(currentVideo, 300);
  
  // Helper function to check if we're in a playlist sequence
  const inPlaylistMode = useCallback(() => {
    // Check for standard video types
    if (currentVideo === 'diveIn' || 
        currentVideo === 'floorLevel' || 
        currentVideo === 'zoomOut') {
      return true;
    }
    
    // Check for video types that include hotspot IDs
    if (typeof currentVideo === 'string') {
      return currentVideo.startsWith('diveIn_') || 
             currentVideo.startsWith('floorLevel_') || 
             currentVideo.startsWith('zoomOut_');
    }
    
    return false;
  }, [currentVideo]);
  
  // Debounce loading state changes to prevent flickering
  const controlledIsLoading = useCallback((loading) => {
    // If we're in a playlist or transition, don't show loading
    if (currentVideo === 'transition' || 
        currentVideo?.includes('transition') || 
        inPlaylistMode()) {
      return false;
    }
    return loading;
  }, [currentVideo, inPlaylistMode]);

  // Handle receiving the video reference from VideoPlayer
  const handleVideoRef = useCallback((videoElement) => {
    if (videoElement) {
      setDirectVideoRef(videoElement);
      
      // Also update the context reference for consistency
      if (contextAerialVideoRef) {
        contextAerialVideoRef.current = videoElement;
      }
    }
  }, [contextAerialVideoRef]);

  // Track when a primary hotspot is clicked to ensure no loaders are shown
  const handleHotspotClickWithTracking = useCallback((hotspot) => {
    if (hotspot && hotspot.type === 'PRIMARY') {
      // First check if this hotspot's videos are properly preloaded
      const loader = videoLoader.current;
      const hotspotId = hotspot._id;
      
      // Mark as transitioning to prevent any loading spinners
      if (loader.isSequencePreloaded(hotspotId)) {
        console.log(`Hotspot ${hotspotId} videos are fully preloaded, playing sequence without loading indicators`);
      } else {
        console.warn(`Hotspot ${hotspotId} videos are NOT fully preloaded. Will attempt seamless playback anyway.`);
      }
    }
    
    // Call the normal handler from context
    handleHotspotClick(hotspot);
  }, [handleHotspotClick]);

  // Create a stable wrapper for loading a playlist to avoid the loop-func eslint error
  const loadPlaylistForHotspot = useCallback(async (hotspot) => {
    try {
      const playlistResponse = await api.getPlaylistByHotspot(hotspot._id);
      if (!isMountedRef.current) return null;
      
      const playlist = playlistResponse.data;
      const hotspotId = hotspot._id;
      const loader = videoLoader.current;
      
      // Track videos that were added to the loader for this hotspot
      const addedVideos = {
        diveIn: null,
        floorLevel: null,
        zoomOut: null
      };
      
      if (playlist?.sequence?.diveInVideo) {
        const diveInVideo = playlist.sequence.diveInVideo;
        if (!loader.isLoaded(`diveIn_${hotspotId}`)) {
          loader.add(`diveIn_${hotspotId}`, diveInVideo.accessUrl);
        }
        // Store the video info with its hotspotId for the videoAssets state
        addedVideos.diveIn = {
          ...diveInVideo,
          hotspotId: hotspotId
        };
      }
      
      if (playlist?.sequence?.floorLevelVideo) {
        const floorLevelVideo = playlist.sequence.floorLevelVideo;
        if (!loader.isLoaded(`floorLevel_${hotspotId}`)) {
          loader.add(`floorLevel_${hotspotId}`, floorLevelVideo.accessUrl);
        }
        // Store the video info with its hotspotId for the videoAssets state
        addedVideos.floorLevel = {
          ...floorLevelVideo,
          hotspotId: hotspotId
        };
      }
      
      if (playlist?.sequence?.zoomOutVideo) {
        const zoomOutVideo = playlist.sequence.zoomOutVideo;
        if (!loader.isLoaded(`zoomOut_${hotspotId}`)) {
          loader.add(`zoomOut_${hotspotId}`, zoomOutVideo.accessUrl);
        }
        // Store the video info with its hotspotId for the videoAssets state
        addedVideos.zoomOut = {
          ...zoomOutVideo,
          hotspotId: hotspotId
        };
      }
      
      // Update videoAssets directly to ensure videos are associated with the correct hotspot
      setVideoAssets(prev => {
        const updatedAssets = { ...prev };
        
        // Add the videos to their respective arrays, making sure hotspotId is included
        if (addedVideos.diveIn) {
          // Check if this video already exists in the array
          const existingIndex = updatedAssets.diveIn ? 
            updatedAssets.diveIn.findIndex(v => v._id === addedVideos.diveIn._id) : -1;
            
          if (existingIndex >= 0) {
            // Update existing video entry
            updatedAssets.diveIn[existingIndex] = addedVideos.diveIn;
          } else {
            // Add as a new video
            updatedAssets.diveIn = [...(updatedAssets.diveIn || []), addedVideos.diveIn];
          }
        }
        
        if (addedVideos.floorLevel) {
          const existingIndex = updatedAssets.floorLevel ? 
            updatedAssets.floorLevel.findIndex(v => v._id === addedVideos.floorLevel._id) : -1;
            
          if (existingIndex >= 0) {
            updatedAssets.floorLevel[existingIndex] = addedVideos.floorLevel;
          } else {
            updatedAssets.floorLevel = [...(updatedAssets.floorLevel || []), addedVideos.floorLevel];
          }
        }
        
        if (addedVideos.zoomOut) {
          const existingIndex = updatedAssets.zoomOut ? 
            updatedAssets.zoomOut.findIndex(v => v._id === addedVideos.zoomOut._id) : -1;
            
          if (existingIndex >= 0) {
            updatedAssets.zoomOut[existingIndex] = addedVideos.zoomOut;
          } else {
            updatedAssets.zoomOut = [...(updatedAssets.zoomOut || []), addedVideos.zoomOut];
          }
        }
        
        return updatedAssets;
      });
      
      return playlist;
    } catch (error) {
      console.error(`Error loading playlist for hotspot ${hotspot._id}:`, error);
      return null;
    }
  }, []);
  
  // Function to preload all videos for all hotspots with improved feedback
  const preloadAllHotspotVideos = useCallback(async (hotspotsToPreload) => {
    if (!hotspotsToPreload || !hotspotsToPreload.length) return;
    
    // Filter for PRIMARY hotspots only
    const primaryHotspots = hotspotsToPreload.filter(hotspot => hotspot.type === 'PRIMARY');
    if (!primaryHotspots.length) return;
    
    console.log(`Starting to preload videos for ${primaryHotspots.length} PRIMARY hotspots`);
    
    // Ensure video assets state is initialized properly
    setVideoAssets(prev => {
      // Initialize video assets structure if needed
      const updated = prev || {
        aerial: aerialVideo,
        transition: transitionVideo,
        diveIn: [],
        floorLevel: [],
        zoomOut: []
      };
      return updated;
    });
    
    // Preload in small batches to avoid too many concurrent requests
    const batchSize = 2;
    const loader = videoLoader.current;
    
    // Process hotspots in batches
    for (let i = 0; i < primaryHotspots.length; i += batchSize) {
      const batch = primaryHotspots.slice(i, i + batchSize);
      
      // Process this batch in parallel
      await Promise.all(batch.map(async hotspot => {
        try {
          // Skip if we've already loaded this hotspot's videos
          if (loader.isSequencePreloaded(hotspot._id)) {
            console.log(`Videos for hotspot ${hotspot._id} already preloaded, skipping`);
            return;
          }
          
          // Load the playlist for this hotspot
          const playlist = await loadPlaylistForHotspot(hotspot);
          
          if (playlist) {
            console.log(`Added hotspot ${hotspot._id} videos to preload queue`);
          } else {
            console.warn(`Failed to load playlist for hotspot ${hotspot._id}`);
          }
        } catch (error) {
          console.error(`Error preloading videos for hotspot ${hotspot._id}:`, error);
        }
      }));
    }
    
    // After adding all videos to the queue, start preloading them
    try {
      console.log('Starting to preload all hotspot videos');
      await loader.preloadAll();
      
      // Get list of fully preloaded sequences
      const preloadedSequences = loader.getPreloadedSequences();
      console.log(`Successfully preloaded ${preloadedSequences.length} complete hotspot sequences`);
    } catch (error) {
      console.error('Error during video preloading:', error);
    }
    
    console.log('Finished preload process for hotspot videos');
  }, [loadPlaylistForHotspot, aerialVideo, transitionVideo]);
  
  // Add state to track if transition videos are already preloaded
  const [transitionsPreloaded, setTransitionsPreloaded] = useState(false);
  const transitionPreloadedRef = useRef(false);
  
  // Function to preload transition videos for all locations
  const preloadTransitionVideos = useCallback(async () => {
    // Skip if already preloaded
    if (transitionsPreloaded || transitionPreloadedRef.current) {
      return;
    }
    
    try {
      // Get all transition videos from API
      const transitionResponse = await api.getAssetsByType('Transition');
      
      if (!isMountedRef.current) return;
      
      if (transitionResponse.data && transitionResponse.data.length > 0) {
        console.log(`Preloading ${transitionResponse.data.length} transition videos`);
        
        // Get the loader from ref
        const loader = videoLoader.current;
        
        // Add all transition videos to loader - with proper URL formatting
        for (const transitionAsset of transitionResponse.data) {
          if (transitionAsset.accessUrl) {
            // Make sure to use a fully qualified URL with baseBackendUrl
            const fullUrl = transitionAsset.accessUrl.startsWith('http') ? 
              transitionAsset.accessUrl : 
              `${baseBackendUrl}${transitionAsset.accessUrl.startsWith('/api/') ? '' : '/api'}${
                transitionAsset.accessUrl.startsWith('/') ? transitionAsset.accessUrl : `/${transitionAsset.accessUrl}`
              }`;
              
              // Track each transition by a unique key (video ID or name)
              const videoKey = `transition_${transitionAsset._id || transitionAsset.name}`;
              
              if (!loader.isLoaded(videoKey)) {
                console.log(`Adding transition video to preload queue: ${videoKey}`);
                loader.add(videoKey, fullUrl);
              }
          }
        }
        
        // Start preloading in background - don't await to prevent UI blocking
        console.log('Starting transition videos preload...');
        
        // Use a timeout to limit how long we wait for transitions to preload
        const preloadPromise = loader.preloadAll();
        const timeoutPromise = new Promise(resolve => {
          setTimeout(() => {
            console.log('Transition preload timeout reached, continuing anyway');
            resolve(null);
          }, 10000); // 10-second timeout for transition preloading
        });
        
        // Use whichever finishes first
        await Promise.race([preloadPromise, timeoutPromise]);
        
        console.log('Successfully preloaded transition videos');
        setTransitionsPreloaded(true);
        transitionPreloadedRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching transition videos for preloading:', error);
      // Consider them preloaded to avoid repeated attempts
      setTransitionsPreloaded(true);
      transitionPreloadedRef.current = true;
    }
  }, [transitionsPreloaded]);
  
  // Preload transition videos once locations are loaded
  useEffect(() => {
    if (locations.length > 0 && !transitionsPreloaded && !transitionPreloadedRef.current) {
      preloadTransitionVideos();
    }
  }, [locations, transitionsPreloaded, preloadTransitionVideos]);
  
  // Set current location based on URL param
  useEffect(() => {
    if (!locations.length) return;
    
    const location = locations.find(loc => loc._id === locationId);
    if (location) {
      setCurrentLocation(location);
      
      // Reset retry count when location changes
      setRetryCount(0);
      setLoadingFailed(false);
      
      // Reset the refs for loaded assets and requested assets
      loadedAssetsRef.current = {
        diveIn: false,
        floorLevel: false,
        zoomOut: false,
        button: false
      };
      
      requestedAssetsRef.current = {
        diveIn: false,
        floorLevel: false,
        zoomOut: false,
        button: false
      };
    } else if (locations.length > 0) {
      navigate(`/v0/experience/${locations[0]._id}`);
    }
  }, [locationId, locations, setCurrentLocation, navigate]);
  
  // Update video assets when context data changes
  useEffect(() => {
    if (!aerialVideo && !transitionVideo) {
      return;
    }
    
    // Always update videoAssets when we have aerialVideo and transitionVideo
    // Use functional update to avoid dependency on videoAssets
    setVideoAssets(prev => ({
      aerial: aerialVideo,
      transition: transitionVideo,
      diveIn: prev?.diveIn || [],
      floorLevel: prev?.floorLevel || [],
      zoomOut: prev?.zoomOut || []
    }));
  }, [aerialVideo, transitionVideo]);
  
  // Update hotspot debug info
  useEffect(() => {
    if (hotspots && hotspots.length) {
      // As soon as hotspots are available, start preloading all playlist videos
      preloadAllHotspotVideos(hotspots);
    }
  }, [hotspots, preloadAllHotspotVideos]);
  
  // Set isMounted cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Load additional assets with retry logic
  useEffect(() => {
    let retryTimeout;
    
    const loadAssetWithRetry = async (assetType, locationId = null) => {
      // Skip if already requested to prevent duplicate requests
      if (requestedAssetsRef.current[assetType.toLowerCase()]) {
        return [];
      }
      
      try {
        // Mark as requested before making the API call
        requestedAssetsRef.current[assetType.toLowerCase()] = true;
        
        const response = await api.getAssetsByType(assetType, locationId);
        if (!isMountedRef.current) return [];
        
        // Update ref without triggering re-renders
        loadedAssetsRef.current[assetType.toLowerCase()] = true;
        
        return response.data;
      } catch (error) {
        console.error(`Error fetching ${assetType} assets:`, error);
        if (!isMountedRef.current) return [];
        
        // Only retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryTimeout = setTimeout(() => {
            if (isMountedRef.current) {
              // Clear the requested flag to allow retry
              requestedAssetsRef.current[assetType.toLowerCase()] = false;
              setRetryCount(prev => prev + 1);
            }
          }, retryDelay);
        } else {
          // Mark as failed but "loaded" to prevent more attempts
          loadedAssetsRef.current[assetType.toLowerCase()] = true;
        }
        return [];
      }
    };
    
    const loadAdditionalAssets = async () => {
      // Use aerialVideo directly from context instead of videoAssets.aerial
      if (!locationId || contextLoading || !aerialVideo) {
        return;
      }
      
      // Circuit breaker - if max retries reached, stop trying
      if (retryCount >= maxRetries) {
        setLoadingFailed(true);
        setIsLoading(false);
        
        // Still set current video to aerial so the user sees something
        if (!currentVideo) {
          setCurrentVideo('aerial');
        }
        return;
      }
      
      // Skip if we've already loaded all assets - check the ref instead of state
      if (loadedAssetsRef.current.diveIn && loadedAssetsRef.current.floorLevel && 
          loadedAssetsRef.current.zoomOut && loadedAssetsRef.current.button) {
        
        // If we have all assets loaded but aren't showing the video yet, set loading to false
        if (isLoading) {
          setIsLoading(false);
          
          // Start with aerial video if not already set
          if (!currentVideo) {
            setCurrentVideo('aerial');
          }
        }
        return;
      }
      
      try {
        if (isMountedRef.current) {
          setIsLoading(true);
        }
        
        // Load assets in parallel with retry logic
        const [diveInAssets, floorLevelAssets, zoomOutAssets, buttonAssets] = await Promise.all([
          !loadedAssetsRef.current.diveIn ? loadAssetWithRetry('DiveIn', locationId) : Promise.resolve([]),
          !loadedAssetsRef.current.floorLevel ? loadAssetWithRetry('FloorLevel', locationId) : Promise.resolve([]),
          !loadedAssetsRef.current.zoomOut ? loadAssetWithRetry('ZoomOut', locationId) : Promise.resolve([]),
          !loadedAssetsRef.current.button ? loadAssetWithRetry('Button') : Promise.resolve([])
        ]);
        
        if (!isMountedRef.current) return;
        
        // Update video assets state only when we receive new data
        if (diveInAssets.length > 0 || floorLevelAssets.length > 0 || zoomOutAssets.length > 0) {
          setVideoAssets(prev => {
            // Create a new object to avoid mutating the previous state
            const updatedAssets = {
              ...(prev || {}),
              aerial: aerialVideo, // Always use the latest aerial video
              transition: transitionVideo, // Always use the latest transition video
            };
            
            // Preserve hotspot associations when updating the video assets
            // For diveIn videos
            if (diveInAssets.length > 0) {
              // Start with existing videos that might have hotspotId associations
              const existingWithHotspotIds = prev?.diveIn?.filter(v => v.hotspotId) || [];
              // Add new videos
              updatedAssets.diveIn = [
                ...existingWithHotspotIds,
                ...diveInAssets.filter(newVideo => 
                  !existingWithHotspotIds.some(existing => existing._id === newVideo._id)
                )
              ];
            } else {
              updatedAssets.diveIn = prev?.diveIn || [];
            }
            
            // For floorLevel videos
            if (floorLevelAssets.length > 0) {
              const existingWithHotspotIds = prev?.floorLevel?.filter(v => v.hotspotId) || [];
              updatedAssets.floorLevel = [
                ...existingWithHotspotIds,
                ...floorLevelAssets.filter(newVideo => 
                  !existingWithHotspotIds.some(existing => existing._id === newVideo._id)
                )
              ];
            } else {
              updatedAssets.floorLevel = prev?.floorLevel || [];
            }
            
            // For zoomOut videos
            if (zoomOutAssets.length > 0) {
              const existingWithHotspotIds = prev?.zoomOut?.filter(v => v.hotspotId) || [];
              updatedAssets.zoomOut = [
                ...existingWithHotspotIds,
                ...zoomOutAssets.filter(newVideo => 
                  !existingWithHotspotIds.some(existing => existing._id === newVideo._id)
                )
              ];
            } else {
              updatedAssets.zoomOut = prev?.zoomOut || [];
            }
            
            return updatedAssets;
          });
        }
        
        if (buttonAssets && buttonAssets.length > 0) {
          // Organize buttons by location and state (ON/OFF)
          const buttonsMap = {};
          
          buttonAssets.forEach(asset => {
            if (!asset.location || !asset.location._id) return;
            
            const locationId = asset.location._id;
            
            if (!buttonsMap[locationId]) {
              buttonsMap[locationId] = { 
                normal: null,  // OFF button
                hover: null    // ON button
              };
            }
            
            // Determine button state from name
            if (asset.name.endsWith('_Button_ON')) {
              buttonsMap[locationId].hover = asset.accessUrl;
            } else if (asset.name.endsWith('_Button_OFF')) {
              buttonsMap[locationId].normal = asset.accessUrl;
            }
          });
          
          console.log('Organized button assets by location:', buttonsMap);
          setLocationButtons(buttonsMap);
        }
        
        // Preload all video assets with better error handling
        const loader = videoLoader.current;
        
        // Cancel any existing load operations before starting new ones
        loader.clear();
        
        // Add aerial video to loader if not already loaded - ensure proper URL formatting
        if (aerialVideo && !loader.isLoaded('aerial') && aerialVideo.accessUrl) {
          // Make sure we have an absolute URL
          const fullUrl = aerialVideo.accessUrl.startsWith('http') ?
            aerialVideo.accessUrl :
            `${baseBackendUrl}${aerialVideo.accessUrl.startsWith('/api/') ? '' : '/api'}${
              aerialVideo.accessUrl.startsWith('/') ? aerialVideo.accessUrl : `/${aerialVideo.accessUrl}`
            }`;
            
          console.log('Adding aerial video to loader:', fullUrl);
          loader.add('aerial', fullUrl);
        }
        
        // Add transition video to loader if not already loaded - ensure proper URL formatting
        if (transitionVideo && !loader.isLoaded('transition') && transitionVideo.accessUrl) {
          // Make sure we have an absolute URL
          const fullUrl = transitionVideo.accessUrl.startsWith('http') ?
            transitionVideo.accessUrl :
            `${baseBackendUrl}${transitionVideo.accessUrl.startsWith('/api/') ? '' : '/api'}${
              transitionVideo.accessUrl.startsWith('/') ? transitionVideo.accessUrl : `/${transitionVideo.accessUrl}`
            }`;
            
          console.log('Adding transition video to loader:', fullUrl);
          loader.add('transition', fullUrl);
        }
        
        // Add playlist videos to loader (for primary hotspots) - but only if we have hotspots
        const primaryHotspots = hotspots?.filter(hotspot => hotspot?.type === 'PRIMARY') || [];
        console.log('Primary hotspots to load playlists for:', primaryHotspots);
        
        // Use a limited number of concurrent requests for playlists
        const maxConcurrentRequests = 2;
        const chunks = [];
        
        // Split hotspots into chunks
        for (let i = 0; i < primaryHotspots.length; i += maxConcurrentRequests) {
          chunks.push(primaryHotspots.slice(i, i + maxConcurrentRequests));
        }
        
        // Process each chunk sequentially
        for (const hotspotChunk of chunks) {
          // Use the stable callback function to handle playlist loading
          await Promise.all(
            hotspotChunk.map(hotspot => loadPlaylistForHotspot(hotspot))
          );
        }
        
        // Start preloading all videos with a timeout to prevent hanging
        console.log('Starting preload of all videos');
        const preloadPromise = loader.preloadAll();
        
        // Add a timeout to prevent hanging on video preloading
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('Video preloading timed out, continuing anyway');
            resolve();
          }, 20000); // 20 second timeout - reduced from 30 seconds
        });
        
        await Promise.race([preloadPromise, timeoutPromise]);
        
        if (isMountedRef.current) {
          setIsLoading(false);
          
          // Start with aerial video if not already set
          if (!currentVideo) {
            console.log('Setting current video to aerial');
            setCurrentVideo('aerial');
          }
        }
      } catch (error) {
        console.error('Error loading additional assets:', error);
        if (isMountedRef.current) {
          // Still mark as not loading so user can interact
          setIsLoading(false);
          
          // Start with aerial video even if there's an error
          if (!currentVideo) {
            console.log('Setting current video to aerial despite errors');
            setCurrentVideo('aerial');
          }
        }
      }
    };
    
    loadAdditionalAssets();
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  // Removed isLoading from dependency array intentionally to break circular dependency
  // Adding it would cause an infinite loop since we're updating isLoading in the effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, contextLoading, aerialVideo, transitionVideo, hotspots, 
      currentVideo, setCurrentVideo, retryCount, maxRetries, loadPlaylistForHotspot]);
  
  // Add a transition lock to prevent multiple transitions from happening simultaneously
  const transitionInProgressRef = useRef(false);
  // Add a transition navigation ref to track if we've already navigated
  const transitionNavigatedRef = useRef(false);
  
  // Handle location change with improved stability
  const handleLocationChange = (newLocationId) => {
    // Don't do anything if we're already on the transition video or a transition is in progress
    if (currentVideo === 'transition' || transitionInProgressRef.current) {
      console.log('Transition already in progress, ignoring location change request');
      return;
    }
    
    // Verify we're changing to a different location
    if (locationId === newLocationId) {
      console.log(`Ignoring location change request - already at ${newLocationId}`);
      return;
    }

    // Set transition lock
    transitionInProgressRef.current = true;
    // Reset navigation flag
    transitionNavigatedRef.current = false;

    // IMPORTANT: Force set loading to false before transition to prevent loaders
    setIsLoading(false);

    // Log debug info about current state before transition
    console.log(`Starting location change from ${locationId} to ${newLocationId}`);
    console.log(`Current aerial video:`, aerialVideo?.name, aerialVideo?._id, aerialVideo?.locationId || 'unknown');
    
    // Ensure transition videos are preloaded before changing location
    if (!transitionsPreloaded && !transitionPreloadedRef.current) {
      console.log('Preloading transition videos before location change');
      // Allow a short time for videos to preload but don't block the UI
      preloadTransitionVideos()
        .then(() => continueWithTransition())
        .catch(() => continueWithTransition());
    } else {
      // Small delay before transition to stabilize
      setTimeout(continueWithTransition, 100);
    }
    
    // Continue with the transition after preloading
    function continueWithTransition() {
      // Play transition video first
      console.log(`Setting video to transition before navigating to: ${newLocationId}`);
      
      // Put a small delay between state updates to avoid React batching them
      // This ensures the transition video actually shows
      setTimeout(() => {
        setCurrentVideo('transition');
        
        // Store a reference to the video element
        const transitionVideoElement = directVideoRef;
        
        if (transitionVideoElement) {
          // Add a one-time event listener for the transition video's 'ended' event
          const handleTransitionEnd = () => {
            // Skip if we've already navigated
            if (transitionNavigatedRef.current) {
              return;
            }
            
            console.log(`Transition video ended naturally, navigating to new location: ${newLocationId}`);
            
            // Mark that we've navigated from this event handler
            transitionNavigatedRef.current = true;
            
            // Force clear ONLY non-transition videos to ensure clean transition
            videoLoader.current.clearNonTransitionVideos();
            
            // Force loading to false to prevent loader during navigation
            setIsLoading(false);
            
            // Navigate only when the transition video has finished playing
            navigate(`/v0/experience/${newLocationId}`);
            
            // Release transition lock
            transitionInProgressRef.current = false;
            
            // Clean up the event listener
            transitionVideoElement.removeEventListener('ended', handleTransitionEnd);
          };
          
          transitionVideoElement.addEventListener('ended', handleTransitionEnd);
          
          // Add a safety timeout in case the ended event doesn't fire
          // But with a much longer delay and only for backup
          setTimeout(() => {
            // Only navigate if not already navigated and transition is still in progress
            if (transitionInProgressRef.current && !transitionNavigatedRef.current) {
              console.log(`Safety timeout reached, navigating to new location: ${newLocationId}`);
              
              // Mark that we've navigated from the safety timeout
              transitionNavigatedRef.current = true;
              
              // Force clear ONLY non-transition videos to ensure clean transition
              videoLoader.current.clearNonTransitionVideos();
              
              // Force loading to false to prevent loader during navigation
              setIsLoading(false);
              
              navigate(`/v0/experience/${newLocationId}`);
              
              // Release transition lock
              transitionInProgressRef.current = false;
              
              // Clean up the event listener in case it's still attached
              transitionVideoElement.removeEventListener('ended', handleTransitionEnd);
            }
          }, 8000); // 8 seconds is a much safer timeout - most transition videos are 3-5 seconds
        } else {
          // Fallback if we can't get the video element for some reason
          console.warn('No video reference available, using fallback timeout');
          
          // Use a longer timeout to ensure transition video has a chance to play
          setTimeout(() => {
            // Only navigate if not already navigated and transition is still in progress
            if (transitionInProgressRef.current && !transitionNavigatedRef.current) {
              console.log(`Fallback timeout ended, navigating to new location: ${newLocationId}`);
              
              // Mark that we've navigated from the fallback
              transitionNavigatedRef.current = true;
              
              // Force clear ONLY non-transition videos to ensure clean transition
              videoLoader.current.clearNonTransitionVideos();
              
              // Force loading to false to prevent loader during navigation
              setIsLoading(false);
              
              navigate(`/v0/experience/${newLocationId}`);
              
              // Release transition lock
              transitionInProgressRef.current = false;
            }
          }, 5000); // Use 5 seconds as a safe fallback
        }
      }, 100); // Small delay to separate state updates
    }
  };
  
  // Mark video ready a bit after we have aerialVideo ready
  useEffect(() => {
    if (aerialVideo && !isVideoReady) {
      // Wait a bit to ensure everything is loaded before showing
      const timer = setTimeout(() => {
        setIsVideoReady(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [aerialVideo, isVideoReady]);
  
  // Only render VideoPlayer when we're ready and have the necessary assets
  // Use aerialVideo directly from context instead of videoAssets.aerial
  if (!aerialVideo || !isVideoReady) {
    console.log('No aerial video available yet, showing loading spinner');
    return <LoadingSpinner />;
  }
  
  // Get current location
  // eslint-disable-next-line no-unused-vars
  const currentLocation = locations.find(loc => loc._id === locationId);
  
  // Get other location buttons
  const otherLocations = locations.filter(loc => loc._id !== locationId);
  
  // Render location navigation button
  const renderLocationButton = (location, index) => {
    const buttonAsset = locationButtons[location._id];
    const hasButtonImage = buttonAsset && (buttonAsset.normal || buttonAsset.hover);
    
    return (
      <button
        key={location._id}
        className={cn(
          "w-[200px] h-[120px] bg-transparent border-none p-0 cursor-pointer",
          "transition-transform duration-300 block overflow-hidden",
          "hover:scale-105 focus:outline-none"
        )}
        onClick={() => handleLocationChange(location._id)}
        onMouseOver={(e) => {
          if (hasButtonImage && buttonAsset.hover) {
            e.currentTarget.querySelector('img').src = `${baseBackendUrl}${buttonAsset.hover}`;
          }
        }}
        onMouseOut={(e) => {
          if (hasButtonImage && buttonAsset.normal) {
            e.currentTarget.querySelector('img').src = `${baseBackendUrl}${buttonAsset.normal}`;
          }
        }}
      >
        {hasButtonImage ? (
          <img 
            src={buttonAsset.normal ? 
              `${baseBackendUrl}${buttonAsset.normal}` : 
              `${baseBackendUrl}${buttonAsset.hover}`
            } 
            alt={location.name} 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-2xl font-bold text-white p-4 bg-netflix-red/80 rounded">
            {location.name}
          </div>
        )}
      </button>
    );
  };
  
  return (
    <div className={cn(
      "relative w-full h-screen overflow-hidden",
      "text-white",
      currentVideo === 'aerial' ? "bg-[#def2f4]" : "bg-black"
    )}>
      {/* Only show loading spinner during initial load, not during sequences or transitions */}
      {controlledIsLoading(isLoading) && !activeHotspot && (
        <LoadingSpinner 
          progress={loadingProgress} 
          message={loadingFailed ? `Loading failed. Showing available content.` : 
                   retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading...'}
        />
      )}
      {/* Only mount VideoPlayer once we have the necessary data */}
      {videoAssets && debouncedVideo && (
        <VideoPlayer
          videoAssets={videoAssets}
          currentVideo={debouncedVideo}
          onVideoEnded={handleVideoEnded}
          activeHotspot={activeHotspot}
          videoLoader={videoLoader.current}
          onVideoRef={handleVideoRef} // Pass the callback to receive the video reference
        />
      )}
      
      {/* Hotspot overlay (only visible when showing aerial view) */}
      {currentVideo === 'aerial' && !isLoading && (
        <HotspotOverlay 
          hotspots={hotspots} 
          onHotspotClick={handleHotspotClickWithTracking} // Use the tracking wrapper
          directVideoRef={directVideoRef} // Pass direct video reference as a prop
        />
      )}
      
      {/* Info panel for secondary hotspots */}
      {activeHotspot && activeHotspot.type === 'SECONDARY' && currentVideo === 'aerial' && (
        <InfoPanel 
          hotspot={activeHotspot}
          onClose={() => handleHotspotClick(null)}
        />
      )}
      
      {/* Location navigation buttons (only visible when showing aerial view) */}
      {currentVideo === 'aerial' && (
        <div className="absolute bottom-10 left-0 w-full flex justify-center z-10 gap-15">
          {otherLocations.map((location, index) => renderLocationButton(location, index))}
        </div>
      )}
      
      {/* Return to menu button */}
      <button 
        className="absolute top-5 right-5 bg-black/70 text-white border border-white/40 px-4 py-2 rounded hover:bg-black/90 hover:border-netflix-red transition-all z-20"
        onClick={() => navigate('/v0')}
      >
        Back to Menu
      </button>
    </div>
  );
};

export default Experience;

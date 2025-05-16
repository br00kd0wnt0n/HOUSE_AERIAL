// client/src/pages/Experience.js - Main interactive video experience

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import HotspotOverlay from '../components/Hotspot/HotspotOverlay';
import InfoPanel from '../components/Hotspot/InfoPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import VideoLoader from '../utils/videoLoader';
import api from '../utils/api';
import '../styles/Experience.css';

// Get API base URL from environment or use a default
const API_BASE_URL = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

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
    updateLoadingProgress,
    aerialVideo,
    transitionVideo,
    isLoading: contextLoading
  } = useVideo();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoAssets, setVideoAssets] = useState(null);
  const [locationButtons, setLocationButtons] = useState([]);
  
  // Add retry state
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  // Use ref to track loaded assets without triggering re-renders
  const loadedAssetsRef = useRef({
    diveIn: false,
    floorLevel: false,
    zoomOut: false,
    button: false
  });
  
  // Debug states - only used for debugging, can be safely commented out for production
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo] = useState({
    currentLocationId: null,
    hotspotCount: 0,
    hasAerialVideo: false,
    videoUrl: null
  });
  
  // Video loader reference
  const videoLoader = useRef(new VideoLoader((loaded, total) => {
    const progress = Math.floor((loaded / total) * 100);
    setLoadingProgress(progress);
    updateLoadingProgress(loaded, total);
  }));
  
  // Set current location based on URL param
  useEffect(() => {
    if (!locations.length) return;
    
    console.log('Locations available:', locations);
    console.log('Current locationId from URL:', locationId);
    
    const location = locations.find(loc => loc._id === locationId);
    if (location) {
      console.log('Found matching location:', location.name);
      setCurrentLocation(location);
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        currentLocationId: location._id
      }));
      
      // Reset retry count when location changes
      setRetryCount(0);
      
      // Reset the ref for loaded assets
      loadedAssetsRef.current = {
        diveIn: false,
        floorLevel: false,
        zoomOut: false,
        button: false
      };
    } else if (locations.length > 0) {
      console.log('No matching location found, defaulting to first location');
      navigate(`/experience/${locations[0]._id}`);
    }
  }, [locationId, locations, setCurrentLocation, navigate]);
  
  // Update video assets when context data changes
  useEffect(() => {
    if (!aerialVideo && !transitionVideo) {
      console.log('No aerial or transition video available yet');
      return;
    }
    
    console.log('Aerial video:', aerialVideo);
    console.log('Transition video:', transitionVideo);
    
    // Always update videoAssets when we have aerialVideo and transitionVideo
    // Use functional update to avoid dependency on videoAssets
    setVideoAssets(prev => ({
      aerial: aerialVideo,
      transition: transitionVideo,
      diveIn: prev?.diveIn || [],
      floorLevel: prev?.floorLevel || [],
      zoomOut: prev?.zoomOut || []
    }));
      
    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      hasAerialVideo: !!aerialVideo,
      videoUrl: aerialVideo?.accessUrl
    }));
    
  }, [aerialVideo, transitionVideo]);
  
  // Update hotspot debug info
  useEffect(() => {
    if (hotspots && hotspots.length) {
      console.log('Hotspots available:', hotspots);
      setDebugInfo(prev => ({
        ...prev,
        hotspotCount: hotspots.length
      }));
    }
  }, [hotspots]);
  
  // Load additional assets with retry logic
  useEffect(() => {
    let isMounted = true;
    let retryTimeout;
    
    const loadAssetWithRetry = async (assetType, locationId = null) => {
      try {
        console.log(`Loading ${assetType} assets for location:`, locationId);
        const response = await api.getAssetsByType(assetType, locationId);
        if (!isMounted) return;
        
        console.log(`Loaded ${assetType} assets:`, response.data);
        
        // Update ref without triggering re-renders
        loadedAssetsRef.current[assetType.toLowerCase()] = true;
        
        return response.data;
      } catch (error) {
        console.error(`Error fetching ${assetType} assets:`, error);
        if (!isMounted) return;
        
        // Only retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`Retrying ${assetType} assets in ${retryDelay}ms...`);
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              setRetryCount(prev => prev + 1);
            }
          }, retryDelay);
        }
        return [];
      }
    };
    
    const loadAdditionalAssets = async () => {
      // Use aerialVideo directly from context instead of videoAssets.aerial
      if (!locationId || contextLoading || !aerialVideo) {
        console.log('Not ready to load additional assets yet');
        return;
      }
      
      // Skip if we've already loaded all assets - check the ref instead of state
      if (loadedAssetsRef.current.diveIn && loadedAssetsRef.current.floorLevel && 
          loadedAssetsRef.current.zoomOut && loadedAssetsRef.current.button) {
        console.log('All assets already loaded, skipping additional loading');
        
        // If we have all assets loaded but aren't showing the video yet, set loading to false
        if (isLoading) {
          setIsLoading(false);
          
          // Start with aerial video if not already set
          if (!currentVideo) {
            console.log('Setting current video to aerial');
            setCurrentVideo('aerial');
          }
        }
        return;
      }
      
      try {
        if (isMounted) {
          setIsLoading(true);
        }
        
        // Load assets in parallel with retry logic
        const [diveInAssets, floorLevelAssets, zoomOutAssets, buttonAssets] = await Promise.all([
          !loadedAssetsRef.current.diveIn ? loadAssetWithRetry('DiveIn', locationId) : Promise.resolve([]),
          !loadedAssetsRef.current.floorLevel ? loadAssetWithRetry('FloorLevel', locationId) : Promise.resolve([]),
          !loadedAssetsRef.current.zoomOut ? loadAssetWithRetry('ZoomOut', locationId) : Promise.resolve([]),
          !loadedAssetsRef.current.button ? loadAssetWithRetry('Button') : Promise.resolve([])
        ]);
        
        if (!isMounted) return;
        
        // Update video assets state only when we receive new data
        if (diveInAssets.length > 0 || floorLevelAssets.length > 0 || zoomOutAssets.length > 0) {
          setVideoAssets(prev => ({
            ...(prev || {}),
            aerial: aerialVideo, // Always use the latest aerial video
            transition: transitionVideo, // Always use the latest transition video
            diveIn: diveInAssets.length > 0 ? diveInAssets : (prev?.diveIn || []),
            floorLevel: floorLevelAssets.length > 0 ? floorLevelAssets : (prev?.floorLevel || []),
            zoomOut: zoomOutAssets.length > 0 ? zoomOutAssets : (prev?.zoomOut || [])
          }));
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
        
        // Preload all video assets
        const loader = videoLoader.current;
        loader.clear();
        
        // Add aerial video to loader if not already loaded
        if (aerialVideo && !loader.isLoaded('aerial')) {
          console.log('Adding aerial video to loader:', aerialVideo.accessUrl);
          loader.add('aerial', aerialVideo.accessUrl);
        }
        
        // Add transition video to loader if not already loaded
        if (transitionVideo && !loader.isLoaded('transition')) {
          console.log('Adding transition video to loader:', transitionVideo.accessUrl);
          loader.add('transition', transitionVideo.accessUrl);
        }
        
        // Add playlist videos to loader (for primary hotspots)
        const primaryHotspots = hotspots.filter(hotspot => hotspot.type === 'PRIMARY');
        console.log('Primary hotspots to load playlists for:', primaryHotspots);
        
        for (const hotspot of primaryHotspots) {
          try {
            const playlistResponse = await api.getPlaylistByHotspot(hotspot._id);
            if (!isMounted) return;
            
            const playlist = playlistResponse.data;
            console.log(`Loaded playlist for hotspot ${hotspot._id}:`, playlist);
            const hotspotId = hotspot._id;
            
            if (playlist?.sequence?.diveInVideo && !loader.isLoaded(`diveIn_${hotspotId}`)) {
              console.log('Adding diveIn video to loader:', playlist.sequence.diveInVideo.accessUrl);
              loader.add(`diveIn_${hotspotId}`, playlist.sequence.diveInVideo.accessUrl);
            }
            
            if (playlist?.sequence?.floorLevelVideo && !loader.isLoaded(`floorLevel_${hotspotId}`)) {
              console.log('Adding floorLevel video to loader:', playlist.sequence.floorLevelVideo.accessUrl);
              loader.add(`floorLevel_${hotspotId}`, playlist.sequence.floorLevelVideo.accessUrl);
            }
            
            if (playlist?.sequence?.zoomOutVideo && !loader.isLoaded(`zoomOut_${hotspotId}`)) {
              console.log('Adding zoomOut video to loader:', playlist.sequence.zoomOutVideo.accessUrl);
              loader.add(`zoomOut_${hotspotId}`, playlist.sequence.zoomOutVideo.accessUrl);
            }
          } catch (error) {
            console.error(`Error loading playlist for hotspot ${hotspot._id}:`, error);
            // Continue with other hotspots even if one fails
          }
        }
        
        // Start preloading all videos
        console.log('Starting preload of all videos');
        await loader.preloadAll();
        
        if (isMounted) {
          setIsLoading(false);
          
          // Start with aerial video if not already set
          if (!currentVideo) {
            console.log('Setting current video to aerial');
            setCurrentVideo('aerial');
          }
        }
      } catch (error) {
        console.error('Error loading additional assets:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadAdditionalAssets();
    
    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [locationId, contextLoading, aerialVideo, transitionVideo, hotspots, 
      currentVideo, setCurrentVideo, retryCount, isLoading]);
  
  // Handle location change
  const handleLocationChange = (newLocationId) => {
    // Play transition video first
    console.log(`Changing location to: ${newLocationId}`);
    setCurrentVideo('transition');
    
    // Wait for transition video to finish
    setTimeout(() => {
      navigate(`/experience/${newLocationId}`);
    }, 500);
  };
  
  // Only render VideoPlayer when we have the necessary assets
  // Use aerialVideo directly from context instead of videoAssets.aerial
  if (!aerialVideo) {
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
    const buttonPosition = index === 0 ? 'left' : 'right';
    const buttonAsset = locationButtons[location._id];
    const hasButtonImage = buttonAsset && (buttonAsset.normal || buttonAsset.hover);
    
    return (
      <button
        key={location._id}
        className={`location-nav-button ${buttonPosition} ${hasButtonImage ? 'has-image' : ''}`}
        onClick={() => handleLocationChange(location._id)}
      >
        {hasButtonImage ? (
          <img 
            src={buttonAsset.normal ? 
              `${API_BASE_URL}${buttonAsset.normal}` : 
              `${API_BASE_URL}${buttonAsset.hover}`
            } 
            alt={location.name} 
            className="nav-button-image" 
            onMouseOver={(e) => {
              if (buttonAsset.hover) {
                e.target.src = `${API_BASE_URL}${buttonAsset.hover}`;
              }
            }}
            onMouseOut={(e) => {
              if (buttonAsset.normal) {
                e.target.src = `${API_BASE_URL}${buttonAsset.normal}`;
              }
            }}
          />
        ) : (
          <div className="nav-button-text-container">
            <span className="nav-button-text">
              {location.name}
            </span>
            <span className="nav-button-arrow">
              {buttonPosition === 'left' ? '←' : '→'}
            </span>
          </div>
        )}
      </button>
    );
  };
  
  return (
    <div className="experience-container">
      {isLoading && (
        <LoadingSpinner 
          progress={loadingProgress} 
          message={retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading...'}
        />
      )}
      <VideoPlayer
        videoAssets={videoAssets}
        currentVideo={currentVideo}
        onVideoEnded={handleVideoEnded}
        activeHotspot={activeHotspot}
        videoLoader={videoLoader.current}
      />
      
      {/* Hotspot overlay (only visible when showing aerial view) */}
      {currentVideo === 'aerial' && !isLoading && (
        <HotspotOverlay 
          hotspots={hotspots} 
        />
      )}
      
      {/* Info panel for secondary hotspots */}
      {activeHotspot && activeHotspot.type === 'SECONDARY' && currentVideo === 'aerial' && (
        <InfoPanel 
          hotspot={activeHotspot}
        />
      )}
      
      {/* Location navigation buttons (only visible when showing aerial view) */}
      {currentVideo === 'aerial' && (
        <div className="location-nav-buttons">
          {otherLocations.map((location, index) => renderLocationButton(location, index))}
        </div>
      )}
      
      {/* Return to menu button */}
      <button 
        className="menu-button"
        onClick={() => navigate('/')}
      >
        Back to Menu
      </button>
    </div>
  );
};

export default Experience;

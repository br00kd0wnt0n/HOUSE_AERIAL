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
  
  // Add asset loading state
  const [loadedAssets, setLoadedAssets] = useState({
    diveIn: false,
    floorLevel: false,
    zoomOut: false,
    button: false
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
    
    const location = locations.find(loc => loc._id === locationId);
    if (location) {
      setCurrentLocation(location);
      // Reset retry count when location changes
      setRetryCount(0);
      setLoadedAssets({
        diveIn: false,
        floorLevel: false,
        zoomOut: false,
        button: false
      });
    } else if (locations.length > 0) {
      navigate(`/experience/${locations[0]._id}`);
    }
  }, [locationId, locations, setCurrentLocation, navigate]);
  
  // Update video assets when context data changes
  useEffect(() => {
    if (!aerialVideo && !transitionVideo) return;
    
    setVideoAssets(prev => {
      // Only update if we have new data
      if (prev?.aerial?.s3Key === aerialVideo?.s3Key && 
          prev?.transition?.s3Key === transitionVideo?.s3Key) {
        return prev;
      }
      
      return {
        aerial: aerialVideo,
        transition: transitionVideo,
        diveIn: prev?.diveIn || [],
        floorLevel: prev?.floorLevel || [],
        zoomOut: prev?.zoomOut || []
      };
    });
  }, [aerialVideo, transitionVideo]);
  
  // Load additional assets with retry logic
  useEffect(() => {
    let isMounted = true;
    let retryTimeout;
    
    const loadAssetWithRetry = async (assetType, locationId = null) => {
      try {
        const response = await api.getAssetsByType(assetType, locationId);
        if (!isMounted) return;
        
        setLoadedAssets(prev => ({
          ...prev,
          [assetType.toLowerCase()]: true
        }));
        
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
      if (!locationId || contextLoading || !videoAssets?.aerial) return;
      
      try {
        if (isMounted) {
          setIsLoading(true);
        }
        
        // Load assets in parallel with retry logic
        const [diveInAssets, floorLevelAssets, zoomOutAssets, buttonAssets] = await Promise.all([
          !loadedAssets.diveIn ? loadAssetWithRetry('DiveIn', locationId) : Promise.resolve(videoAssets.diveIn || []),
          !loadedAssets.floorLevel ? loadAssetWithRetry('FloorLevel', locationId) : Promise.resolve(videoAssets.floorLevel || []),
          !loadedAssets.zoomOut ? loadAssetWithRetry('ZoomOut', locationId) : Promise.resolve(videoAssets.zoomOut || []),
          !loadedAssets.button ? loadAssetWithRetry('Button') : Promise.resolve(locationButtons)
        ]);
        
        if (!isMounted) return;
        
        // Update video assets state
        setVideoAssets(prev => ({
          ...prev,
          diveIn: diveInAssets,
          floorLevel: floorLevelAssets,
          zoomOut: zoomOutAssets
        }));
        
        setLocationButtons(buttonAssets);
        
        // Preload all video assets
        const loader = videoLoader.current;
        loader.clear();
        
        // Add aerial video to loader if not already loaded
        if (videoAssets.aerial && !loader.isLoaded('aerial')) {
          loader.add('aerial', videoAssets.aerial.s3Key);
        }
        
        // Add transition video to loader if not already loaded
        if (videoAssets.transition && !loader.isLoaded('transition')) {
          loader.add('transition', videoAssets.transition.s3Key);
        }
        
        // Add playlist videos to loader (for primary hotspots)
        const primaryHotspots = hotspots.filter(hotspot => hotspot.type === 'PRIMARY');
        
        for (const hotspot of primaryHotspots) {
          try {
            const playlistResponse = await api.getPlaylistByHotspot(hotspot._id);
            if (!isMounted) return;
            
            const playlist = playlistResponse.data;
            const hotspotId = hotspot._id;
            
            if (playlist.sequence.diveInVideo && !loader.isLoaded(`diveIn_${hotspotId}`)) {
              loader.add(`diveIn_${hotspotId}`, playlist.sequence.diveInVideo.s3Key);
            }
            
            if (playlist.sequence.floorLevelVideo && !loader.isLoaded(`floorLevel_${hotspotId}`)) {
              loader.add(`floorLevel_${hotspotId}`, playlist.sequence.floorLevelVideo.s3Key);
            }
            
            if (playlist.sequence.zoomOutVideo && !loader.isLoaded(`zoomOut_${hotspotId}`)) {
              loader.add(`zoomOut_${hotspotId}`, playlist.sequence.zoomOutVideo.s3Key);
            }
          } catch (error) {
            console.error(`Error loading playlist for hotspot ${hotspot._id}:`, error);
            // Continue with other hotspots even if one fails
          }
        }
        
        // Start preloading all videos
        await loader.preloadAll();
        
        if (isMounted) {
          setIsLoading(false);
          
          // Start with aerial video if not already set
          if (!currentVideo) {
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
  }, [locationId, contextLoading, videoAssets, hotspots, currentVideo, setCurrentVideo, retryCount, loadedAssets]);
  
  // Handle location change
  const handleLocationChange = (newLocationId) => {
    // Play transition video first
    setCurrentVideo('transition');
    
    // Wait for transition video to finish
    setTimeout(() => {
      navigate(`/experience/${newLocationId}`);
    }, 500);
  };
  
  // Only render VideoPlayer when we have the necessary assets
  if (!videoAssets?.aerial) {
    return <LoadingSpinner />;
  }
  
  // Get current location
  const currentLocation = locations.find(loc => loc._id === locationId);
  
  // Get other location buttons
  const otherLocations = locations.filter(loc => loc._id !== locationId);
  
  // Render location navigation button
  const renderLocationButton = (location, index) => {
    const buttonPosition = index === 0 ? 'left' : 'right';
    const buttonAsset = locationButtons.find(
      button => button.name.includes(location.name)
    );
    
    return (
      <button
        key={location._id}
        className={`location-nav-button ${buttonPosition}`}
        onClick={() => handleLocationChange(location._id)}
      >
        {buttonAsset?.s3Key ? (
          <img 
            src={buttonAsset.s3Key} 
            alt={location.name} 
            className="nav-button-image" 
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
      {currentVideo === 'aerial' && (
        <HotspotOverlay 
          hotspots={hotspots} 
          locationId={locationId}
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

import React, { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExperience } from '../context/ExperienceContext';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import HotspotOverlay from '../components/Hotspot/HotspotOverlay';
import InfoPanel from '../components/Hotspot/InfoPanel';
import LocationNavigation from '../components/Experience/LocationNavigation';
import TransitionEffect from '../components/Experience/TransitionEffect';
import FadeToBlackEffect from '../components/Experience/FadeToBlackEffect';
import LocationBanner from '../components/Experience/LocationBanner';
import logger from '../utils/logger';
import { useVideoController } from '../hooks/useVideoController';
import { useHotspotController } from '../hooks/useHotspotController';
import { useLocationController } from '../hooks/useLocationController';

// Import animations
import '../styles/animations.css';

// Initial state for the reducer
const initialState = {
  // Video state
  currentVideo: 'aerial',
  isVideoPlaying: false,
  videoUrl: null,
  isPlaying: true, // Start with playing set to true for autoplay

  // Hotspot state
  hotspots: [],
  inPlaylistMode: false,
  activeHotspot: null,
  activePrimaryHotspot: null,
  activeSecondaryHotspot: null,

  // Location state
  currentLocation: null,
  inLocationTransition: false,
  destinationLocation: null,
  transitionComplete: false,
  
  // Transition effects
  fadeToBlackActive: false
};

// Reducer function
function experienceReducer(state, action) {
  switch (action.type) {
    // Video actions
    case 'SET_CURRENT_VIDEO':
      return { ...state, currentVideo: action.payload };
    case 'SET_VIDEO_PLAYING':
      return { ...state, isVideoPlaying: action.payload };
    case 'SET_VIDEO_URL':
      return { ...state, videoUrl: action.payload };
    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.payload };
      
    // Hotspot actions
    case 'SET_HOTSPOTS':
      return { ...state, hotspots: action.payload };
    case 'SET_IN_PLAYLIST_MODE':
      return { ...state, inPlaylistMode: action.payload };
    case 'SET_ACTIVE_HOTSPOT':
      return { ...state, activeHotspot: action.payload };
    case 'SET_ACTIVE_PRIMARY_HOTSPOT':
      return { ...state, activePrimaryHotspot: action.payload };
    case 'SET_ACTIVE_SECONDARY_HOTSPOT':
      return { ...state, activeSecondaryHotspot: action.payload };
    case 'CLEAR_SECONDARY_HOTSPOT':
      return { 
        ...state, 
        activeSecondaryHotspot: null,
        // Only clear activeHotspot if no primary hotspot is active
        activeHotspot: state.activePrimaryHotspot ? state.activeHotspot : null
      };
    case 'RESET_HOTSPOTS':
      return {
        ...state,
        activeHotspot: null,
        activePrimaryHotspot: null,
        activeSecondaryHotspot: null
      };
      
    // Location actions
    case 'SET_CURRENT_LOCATION':
      return { ...state, currentLocation: action.payload };
    case 'SET_IN_LOCATION_TRANSITION':
      return { ...state, inLocationTransition: action.payload };
    case 'SET_DESTINATION_LOCATION':
      return { ...state, destinationLocation: action.payload };
    case 'SET_TRANSITION_COMPLETE':
      return { ...state, transitionComplete: action.payload };
    case 'COMPLETE_TRANSITION':
      return {
        ...state,
        inLocationTransition: false,
        destinationLocation: null,
        transitionComplete: true
      };
      
    // Transition effect actions
    case 'SET_FADE_TO_BLACK_ACTIVE':
      return { ...state, fadeToBlackActive: action.payload };
      
    default:
      return state;
  }
}

/**
 * Experience.jsx - Main experience view for a selected location
 * Handles displaying videos, hotspots, and transitions with offline capability
 * Phase 2: Adds interactive hotspot playlist playback and secondary hotspot modals
 * Phase 3: Adds multi-location navigation support
 */
const Experience = () => {
  // Module name for logging
  const MODULE = 'Experience';
  
  // Get location ID from URL params
  const { locationId } = useParams();
  const navigate = useNavigate();
  
  // Access the experience context
  const { 
    locations,
    serviceWorkerReady,
    videoPreloaderRef,
    loadLocations,
  } = useExperience();
  
  // Use reducer for state management
  const [state, dispatch] = useReducer(experienceReducer, initialState);
  
  // Debug mode state (kept separate from reducer since it's UI-specific)
  const [debugMode, setDebugMode] = useState(false);
  
  // Fade to black effect callback
  const [fadeToBlackCallback, setFadeToBlackCallback] = useState(null);
  
  // Add state to control navigation visibility to prevent flickering
  const [navButtonsReady, setNavButtonsReady] = useState(false);
  const navMountedRef = useRef(false);
  
  // Ensure all locations are loaded when component mounts (especially for direct URL access)
  useEffect(() => {
    // If locations array is empty, load all locations
    if (locations.length === 0) {
      logger.info(MODULE, 'No locations found in context, loading all locations');
      loadLocations().then(loadedLocations => {
        logger.info(MODULE, `Loaded ${loadedLocations.length} locations for navigation`);
      }).catch(err => {
        logger.error(MODULE, 'Failed to load locations:', err);
      });
    } else {
      logger.debug(MODULE, `Locations already loaded: ${locations.length}`);
    }
  }, [locations, loadLocations]);
  
  // Handle fade to black completion
  const handleFadeToBlackComplete = useCallback(() => {
    logger.info(MODULE, 'Fade to black effect completed');
    
    // Execute the stored callback if available
    if (fadeToBlackCallback && typeof fadeToBlackCallback === 'function') {
      logger.info(MODULE, 'Executing fade to black callback');
      fadeToBlackCallback();
      
      // Clear the callback after execution
      setFadeToBlackCallback(null);
    }
    
    // Keep fade effect active until explicitly turned off by the callback
  }, [fadeToBlackCallback]);
  
  // Use controller hooks for specific functionality
  const videoController = useVideoController({
    locationId,
    videoPreloaderRef,
    serviceWorkerReady,
    state,
    dispatch,
    navigate,
    locations
  });
  
  // Function to start fade to black effect
  const startFadeToBlack = useCallback((callback) => {
    logger.info(MODULE, 'Starting fade to black effect');
    
    // Hide nav buttons immediately when fade starts
    setNavButtonsReady(false);
    
    // Store the callback to be executed after fade completes
    setFadeToBlackCallback(() => callback);
    
    // Activate the fade effect
    dispatch({ type: 'SET_FADE_TO_BLACK_ACTIVE', payload: true });
  }, []);
  
  // Create enhanced versions of the controllers with fade-to-black support
  const hotspotController = useHotspotController({
    locationId,
    videoStateManagerRef: videoController.videoStateManagerRef,
    state: { ...state, videoRef: videoController.videoRef }, // Pass videoRef to hotspot controller
    dispatch,
    startFadeToBlack
  });
  
  const locationController = useLocationController({
    locationId,
    locations,
    videoStateManagerRef: videoController.videoStateManagerRef,
    state,
    dispatch,
    navigate,
    startFadeToBlack
  });
  
  // Only show navigation buttons after initial render and when transitions complete
  useEffect(() => {
    // On initial mount, delay showing buttons slightly
    if (!navMountedRef.current) {
      // Mark as mounted
      navMountedRef.current = true;
      
      // Delay showing nav buttons on first render to avoid flickering
      const timer = setTimeout(() => {
        if (!state.inLocationTransition && !state.fadeToBlackActive) {
          setNavButtonsReady(true);
        }
      }, 500); // Short delay to ensure page is stable
      
      return () => clearTimeout(timer);
    }
    
    // Otherwise, handle showing buttons based on transition state
    if (state.inLocationTransition || state.fadeToBlackActive) {
      // Hide buttons during transitions
      setNavButtonsReady(false);
    } else if (state.currentVideo === 'aerial' && !state.inPlaylistMode) {
      // Show buttons after a short delay when returning to aerial view
      const timer = setTimeout(() => {
        setNavButtonsReady(true);
      }, 300); // Short delay after transition completes
      
      return () => clearTimeout(timer);
    }
  }, [state.inLocationTransition, state.fadeToBlackActive, state.currentVideo, state.inPlaylistMode]);
  
  // Set up debug mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        setDebugMode(prev => {
          const newValue = !prev;
          // Only log in development mode to avoid cluttering production logs
          if (process.env.NODE_ENV !== 'production') {
            logger.info(MODULE, `Debug mode ${newValue ? 'enabled' : 'disabled'}`);
          }
          return newValue;
        });
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Only log in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.info(MODULE, 'Debug mode shortcut available (Ctrl+Shift+D)');
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ 
      background: state.currentVideo === 'aerial' && !state.inPlaylistMode
        ? 'linear-gradient(to bottom, rgb(207 234 235), rgb(239 249 251))'
        : 'black',
      // Add safe area insets for devices with notches
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      // Ensure content is centered
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="relative w-full h-full overflow-hidden">
        {/* Main video player */}
        <VideoPlayer 
          src={state.videoUrl}
          type={state.currentVideo}
          onEnded={videoController.handleVideoEnded}
          onLoadStart={videoController.handleVideoLoadStart}
          onLoadComplete={videoController.handleVideoLoadComplete}
          onPlaying={videoController.handleVideoPlaying}
          isPlaying={state.isPlaying}
          onVideoRef={videoController.handleVideoRef}
          key={`video-player-${state.videoUrl}`}
        />
        
        {/* CSS Transition Effect - shown when in location transition but no video */}
        <TransitionEffect 
          isActive={state.inLocationTransition && state.currentVideo !== 'locationTransition'}
          onTransitionComplete={locationController.handleCssTransitionComplete}
          duration={400}
          sourceLocationName={state.currentLocation?.name}
          destinationLocationName={state.destinationLocation?.name}
        />
        
        {/* Fade to Black Effect - shown before hotspot or location transitions */}
        <FadeToBlackEffect
          isActive={state.fadeToBlackActive}
          onComplete={handleFadeToBlackComplete}
          duration={250} // Super snappy fade as requested
        />
        
        {/* Hotspot overlay - only shown for aerial video when playing */}
        {state.currentVideo === 'aerial' && state.isVideoPlaying && videoController.videoRef.current && (
          <HotspotOverlay 
            hotspots={state.hotspots}
            onHotspotClick={hotspotController.handleHotspotClick}
            videoRef={videoController.videoRef}
            debugMode={debugMode}
            currentVideo={state.currentVideo}
            currentLocationId={state.currentLocation?._id || locationId}
            key={`hotspot-overlay-${state.videoUrl}`}
          />
        )}
        
        {/* Info panel for secondary hotspots */}
        {state.activeSecondaryHotspot && state.currentVideo === 'aerial' && (
          <InfoPanel 
            hotspot={state.activeSecondaryHotspot}
            onClose={hotspotController.handleInfoPanelClose}
          />
        )}
        
        {/* Location navigation buttons - only show during aerial view and when nav is ready */}
        {state.currentVideo === 'aerial' && !state.inPlaylistMode && navButtonsReady && (
          <LocationNavigation 
            locations={locations}
            currentLocationId={state.currentLocation?._id || locationId}
            onClick={locationController.handleLocationButtonClick}
            debugMode={debugMode}
            key={`location-nav-${state.currentLocation?._id || locationId}`}
          />
        )}
        
        {/* Location Banner - show in aerial view */}
        {state.currentVideo === 'aerial' && (
          <LocationBanner 
            locationId={state.currentLocation?._id || locationId} 
            key={`location-banner-${state.currentLocation?._id || locationId}`}
          />
        )}
        
        {/* Play button overlay if autoplay fails - show only if not playing and not loading */}
        {!state.isPlaying && state.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
            <button 
              className="w-24 h-24 bg-netflix-red rounded-full flex items-center justify-center hover:bg-netflix-red/80 transition-colors"
              onClick={videoController.handlePlayClick}
            >
              <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[25px] border-l-white ml-2"></div>
            </button>
          </div>
        )}
        
        {/* UI Controls - Back to Map button with fixed positioning */}
        {/* Only show when in playlist mode or not in aerial view */}
        {(state.inPlaylistMode || state.currentVideo !== 'aerial') && (
          <div className="fixed top-4 right-4 z-30">
            <button 
              className="w-12 h-12 bg-netflix-red text-white rounded-full flex items-center justify-center hover:bg-netflix-red/80 transition-colors text-3xl font-bold"
              onClick={locationController.handleBackToMap}
              aria-label="Back to Map"
              title="Back to Map"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Experience; 
/**
 * VideoStateManager.js - Handles video state transitions for interactive hotspot playback
 * 
 * This class manages the entire lifecycle of hotspot interactions, including:
 * - Tracking the current video state (aerial, diveIn, floorLevel, zoomOut)
 * - Managing playlists associated with hotspots
 * - Handling transitions between video states
 */

import logger from './logger';

// Module name for logging
const MODULE = 'VideoStateManager';

// Valid video states
const VIDEO_STATES = {
  AERIAL: 'aerial',
  DIVE_IN: 'diveIn',
  FLOOR_LEVEL: 'floorLevel',
  ZOOM_OUT: 'zoomOut',
  TRANSITION: 'transition',
  LOCATION_TRANSITION: 'locationTransition'
};

// State machine transitions
const STATE_TRANSITIONS = {
  [VIDEO_STATES.AERIAL]: [VIDEO_STATES.DIVE_IN, VIDEO_STATES.LOCATION_TRANSITION],
  [VIDEO_STATES.DIVE_IN]: [VIDEO_STATES.FLOOR_LEVEL],
  [VIDEO_STATES.FLOOR_LEVEL]: [VIDEO_STATES.ZOOM_OUT],
  [VIDEO_STATES.ZOOM_OUT]: [VIDEO_STATES.AERIAL],
  [VIDEO_STATES.TRANSITION]: [VIDEO_STATES.AERIAL],
  [VIDEO_STATES.LOCATION_TRANSITION]: [VIDEO_STATES.AERIAL]
};

class VideoStateManager {
  /**
   * Initialize the state manager
   * @param {Object} options Configuration options
   * @param {Function} options.onVideoChange Callback for video changes
   * @param {Function} options.onLoadVideo Callback to load a video
   * @param {Function} options.onError Callback for errors
   */
  constructor(options = {}) {
    // State
    this.currentState = VIDEO_STATES.AERIAL;
    this.currentHotspot = null;
    this.currentPlaylist = null;
    this.inPlaylistMode = false;
    this.playlistIndex = 0;
    this.playlistVideos = [];
    
    // Location transition tracking
    this.sourceLocation = null;
    this.destinationLocation = null;
    this.inLocationTransition = false;
    
    // Callbacks
    this.onVideoChange = options.onVideoChange || (() => {});
    this.onLoadVideo = options.onLoadVideo || (() => {});
    this.onError = options.onError || (() => {});
    
    // Debug logging
    logger.info(MODULE, 'VideoStateManager initialized');
  }
  
  /**
   * Handle hotspot specific logic based on type
   * @param {Object} hotspot The hotspot to check
   * @returns {boolean} True if the hotspot triggers a playlist, false otherwise
   */
  handleHotspotAction(hotspot) {
    if (!hotspot) return false;
    
    // For SECONDARY hotspots, immediately return without affecting video state
    if (hotspot.type === 'SECONDARY') {
      logger.debug(MODULE, `Secondary hotspot clicked (${hotspot.name}), video playback unchanged`);
      return false; // Don't process in the playlist system
    }
    
    // Store the current hotspot for PRIMARY hotspots
    if (hotspot.type === 'PRIMARY') {
      this.currentHotspot = hotspot;
      return true; // Allow playlist handling
    }
    
    // Default case - unknown hotspot type
    logger.warn(MODULE, `Unknown hotspot type: ${hotspot.type}, hotspot:`, hotspot);
    return false;
  }
  
  /**
   * Start a playlist for a hotspot
   * @param {Object} hotspot The hotspot to play
   * @param {Object} playlist The playlist associated with the hotspot
   * @returns {boolean} Success indicator
   */
  startHotspotPlaylist(hotspot, playlist) {
    // Validate inputs
    if (!hotspot || !playlist) {
      logger.error(MODULE, 'Cannot start playlist: missing hotspot or playlist');
      this.onError('Missing hotspot or playlist');
      return false;
    }
    
    // Check if we're already in a playlist and need to reset
    if (this.inPlaylistMode) {
      this.resetPlaylist();
    }
    
    // Handle the hotspot based on its type
    if (!this.handleHotspotAction(hotspot)) {
      logger.debug(MODULE, `Hotspot ${hotspot.name} (${hotspot.type}) does not trigger a playlist`);
      return false;
    }
    
    logger.info(MODULE, `Starting playlist for hotspot: ${hotspot.name}`);
    
    // Store current hotspot and playlist
    this.currentHotspot = hotspot;
    this.currentPlaylist = playlist;
    this.inPlaylistMode = true;
    this.playlistIndex = 0;
    
    // Extract sequence videos from playlist
    try {
      this.playlistVideos = [];
      
      // Add dive-in video if available
      if (playlist.sequence?.diveInVideo) {
        this.playlistVideos.push({
          type: VIDEO_STATES.DIVE_IN,
          id: `diveIn_${hotspot._id}`,
          ...playlist.sequence.diveInVideo
        });
      }
      
      // Add floor-level video if available
      if (playlist.sequence?.floorLevelVideo) {
        this.playlistVideos.push({
          type: VIDEO_STATES.FLOOR_LEVEL,
          id: `floorLevel_${hotspot._id}`,
          ...playlist.sequence.floorLevelVideo
        });
      }
      
      // Add zoom-out video if available
      if (playlist.sequence?.zoomOutVideo) {
        this.playlistVideos.push({
          type: VIDEO_STATES.ZOOM_OUT,
          id: `zoomOut_${hotspot._id}`,
          ...playlist.sequence.zoomOutVideo
        });
      }
      
      logger.info(MODULE, `Loaded ${this.playlistVideos.length} videos for playlist`);
      
      // Start playing the first video if available
      if (this.playlistVideos.length > 0) {
        this.playNextInPlaylist();
        return true;
      } else {
        logger.warn(MODULE, 'Playlist has no videos');
        this.resetPlaylist();
        this.onError('Playlist has no videos');
        return false;
      }
    } catch (error) {
      logger.error(MODULE, 'Error starting playlist:', error);
      this.resetPlaylist();
      this.onError(`Error starting playlist: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Play the next video in the current playlist
   * @returns {boolean} Success indicator
   */
  playNextInPlaylist() {
    if (!this.inPlaylistMode || !this.playlistVideos.length) {
      logger.warn(MODULE, 'Cannot play next: no active playlist');
      return false;
    }
    
    // Check if we've reached the end of the playlist
    if (this.playlistIndex >= this.playlistVideos.length) {
      logger.info(MODULE, 'Reached end of playlist, returning to aerial');
      
      // Make sure to properly reset the playlist mode
      const wasInPlaylistMode = this.inPlaylistMode;
      const hotspotId = this.currentHotspot?._id;
      
      // Reset playlist first to ensure clean state
      this.resetPlaylist();
      
      // Set internal state first
      this.currentState = VIDEO_STATES.AERIAL;
      
      // Then trigger state change callback
      // We're bypassing changeState() to avoid any potential issues with state validation
      this.onVideoChange(VIDEO_STATES.AERIAL);
      
      // Load a "null" aerial video to signal return to default aerial
      this.onLoadVideo({
        type: VIDEO_STATES.AERIAL,
        id: 'aerial_return',
        accessUrl: null // This signals to the Experience component to find the proper aerial URL
      });
      
      // Log the transition
      if (wasInPlaylistMode) {
        logger.info(MODULE, `Successfully transitioned from playlist mode to aerial view for hotspot: ${hotspotId}`);
      }
      
      return true;
    }
    
    try {
      // Get the current video from the playlist
      const video = this.playlistVideos[this.playlistIndex];
      if (!video) {
        logger.error(MODULE, `Invalid playlist index: ${this.playlistIndex}`);
        this.resetPlaylist();
        
        // Set internal state first
        this.currentState = VIDEO_STATES.AERIAL;
        
        // Then trigger state change callback
        this.onVideoChange(VIDEO_STATES.AERIAL);
        return false;
      }
      
      logger.info(MODULE, `Playing playlist video ${this.playlistIndex + 1}/${this.playlistVideos.length}: ${video.type}`);
      
      // Update current state
      this.currentState = video.type;
      
      // Trigger video load
      this.onLoadVideo(video);
      
      // Notify about state change
      this.onVideoChange(video.type);
      
      // Increment playlist index for next time
      this.playlistIndex++;
      
      return true;
    } catch (error) {
      // Handle any errors during playlist progression
      logger.error(MODULE, `Error playing next video in playlist: ${error.message}`);
      
      // Reset playlist and return to aerial view as a safety measure
      this.resetPlaylist();
      
      // Set internal state first
      this.currentState = VIDEO_STATES.AERIAL;
      
      // Then trigger state change callback
      this.onVideoChange(VIDEO_STATES.AERIAL);
      
      return false;
    }
  }
  
  /**
   * Handle a video ending
   * @param {string} videoType Type of video that ended
   * @returns {void}
   */
  handleVideoEnded(videoType) {
    logger.debug(MODULE, `Video ended: ${videoType}`);
    
    // Check if this is a location transition video
    const isLocationTransition = videoType.startsWith(VIDEO_STATES.LOCATION_TRANSITION) || 
                                 videoType === VIDEO_STATES.LOCATION_TRANSITION;
    
    if (isLocationTransition && this.inLocationTransition) {
      logger.info(MODULE, 'Location transition video ended, completing transition');
      this.completeLocationTransition();
      return;
    }
    
    // Check if we're in a playlist, play the next video
    if (this.inPlaylistMode) {
      // Check if this is the last video in the sequence (zoomOut)
      // It could be in the format 'zoomOut_123abc' so check the base type
      const isZoomOut = videoType.startsWith(VIDEO_STATES.ZOOM_OUT);
      
      // If this was the zoom-out video and playlist index indicates we've reached the end
      if (isZoomOut && this.playlistIndex >= this.playlistVideos.length) {
        logger.info(MODULE, 'Last video (zoom-out) in playlist ended, returning to aerial view');
        
        // Store state before resetting playlist
        const currentHotspotId = this.currentHotspot?._id;
        
        // Important: Reset playlist BEFORE changing state to avoid infinite loop
        this.resetPlaylist();
        
        // Explicitly clear internal state to ensure clean transition
        this.currentState = VIDEO_STATES.AERIAL;
        
        // Then trigger the state change notification
        this.onVideoChange(VIDEO_STATES.AERIAL);
        
        // Log detailed information about the transition
        logger.info(MODULE, `Completed playlist for hotspot: ${currentHotspotId}, transitioned to aerial view`);
        return;
      }
      
      // Otherwise continue with next video in playlist
      this.playNextInPlaylist();
      return;
    }
    
    // For non-playlist mode, just return to aerial
    // Check the base type without the hotspot ID suffix
    const baseVideoType = videoType.split('_')[0];
    if (baseVideoType !== VIDEO_STATES.AERIAL) {
      this.changeState(VIDEO_STATES.AERIAL);
    }
  }
  
  /**
   * Reset the current playlist
   * @returns {void}
   */
  resetPlaylist() {
    logger.info(MODULE, 'Resetting playlist');
    
    // Explicitly null out all playlist-related state
    this.currentHotspot = null;
    this.currentPlaylist = null;
    this.inPlaylistMode = false;
    this.playlistIndex = 0;
    this.playlistVideos = [];
  }
  
  /**
   * Change to a specific video state
   * @param {string} newState New video state
   * @returns {boolean} Success indicator
   */
  changeState(newState) {
    // Validate state
    if (!Object.values(VIDEO_STATES).includes(newState)) {
      logger.error(MODULE, `Invalid video state: ${newState}`);
      return false;
    }
    
    // Check if the transition is valid
    const validTransitions = STATE_TRANSITIONS[this.currentState] || [VIDEO_STATES.AERIAL];
    if (!validTransitions.includes(newState) && newState !== VIDEO_STATES.AERIAL) {
      logger.warn(MODULE, `Invalid state transition: ${this.currentState} -> ${newState}`);
      
      // We always allow transitioning back to aerial
      if (newState !== VIDEO_STATES.AERIAL) {
        return false;
      }
    }
    
    logger.info(MODULE, `Changing video state: ${this.currentState} -> ${newState}`);
    
    // Update current state
    this.currentState = newState;
    
    // Notify about state change
    this.onVideoChange(newState);
    
    return true;
  }
  
  /**
   * Get the current state
   * @returns {string} Current video state
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Check if in playlist mode
   * @returns {boolean} Playlist mode status
   */
  isInPlaylistMode() {
    return this.inPlaylistMode;
  }
  
  /**
   * Get current hotspot
   * @returns {Object|null} Current hotspot or null
   */
  getCurrentHotspot() {
    return this.currentHotspot;
  }
  
  /**
   * Start a location transition
   * @param {Object} sourceLocation Current location
   * @param {Object} destinationLocation Target location
   * @param {Object} transitionVideo Transition video object (optional)
   * @returns {boolean} Success indicator
   */
  startLocationTransition(sourceLocation, destinationLocation, transitionVideo = null) {
    // Validate locations
    if (!sourceLocation || !destinationLocation) {
      logger.error(MODULE, 'Cannot start location transition: missing source or destination location');
      this.onError('Missing source or destination location');
      return false;
    }
    
    logger.info(MODULE, `Starting location transition from ${sourceLocation.name} to ${destinationLocation.name}`);
    
    // Store location data
    this.sourceLocation = sourceLocation;
    this.destinationLocation = destinationLocation;
    this.inLocationTransition = true;
    
    // If we're in a playlist, reset it first
    if (this.inPlaylistMode) {
      this.resetPlaylist();
    }
    
    // Set transition state
    this.currentState = VIDEO_STATES.LOCATION_TRANSITION;
    this.onVideoChange(VIDEO_STATES.LOCATION_TRANSITION);
    
    // If transition video is provided, play it
    if (transitionVideo && transitionVideo.accessUrl) {
      logger.info(MODULE, `Playing location transition video: ${transitionVideo.name || 'unknown'}`);
      
      const transitionVideoObject = {
        type: VIDEO_STATES.LOCATION_TRANSITION,
        id: `locationTransition_${sourceLocation._id}_to_${destinationLocation._id}`,
        ...transitionVideo
      };
      
      // Load and play the transition video
      this.onLoadVideo(transitionVideoObject);
      return true;
    } else {
      logger.info(MODULE, 'No transition video available, performing direct location switch');
      
      // Complete the transition immediately
      this.completeLocationTransition();
      return true;
    }
  }
  
  /**
   * Complete a location transition (called after transition video ends or if no video)
   * @returns {boolean} Success indicator
   */
  completeLocationTransition() {
    if (!this.inLocationTransition) {
      logger.warn(MODULE, 'No active location transition to complete');
      return false;
    }
    
    logger.info(MODULE, `Completing location transition to ${this.destinationLocation?.name || 'unknown'}`);
    
    // Store destination location ID for the callback before resetting
    const destinationLocationId = this.destinationLocation?._id;
    
    // Reset transition state
    this.inLocationTransition = false;
    this.sourceLocation = null;
    this.destinationLocation = null;
    
    // Transition back to aerial state
    this.currentState = VIDEO_STATES.AERIAL;
    this.onVideoChange(VIDEO_STATES.AERIAL);
    
    // Send signal to load new location's aerial view
    if (destinationLocationId) {
      this.onLoadVideo({
        type: VIDEO_STATES.AERIAL,
        id: `aerial_${destinationLocationId}`,
        locationId: destinationLocationId,
        accessUrl: null // Signal to find the correct aerial URL for new location
      });
    }
    
    // Return true to indicate successful completion
    return true;
  }
  
  /**
   * Check if in location transition mode
   * @returns {boolean} Location transition mode status
   */
  isInLocationTransition() {
    return this.inLocationTransition;
  }
  
  /**
   * Get source location for transition
   * @returns {Object|null} Source location or null
   */
  getSourceLocation() {
    return this.sourceLocation;
  }
  
  /**
   * Get destination location for transition
   * @returns {Object|null} Destination location or null
   */
  getDestinationLocation() {
    return this.destinationLocation;
  }
}

export default VideoStateManager; 
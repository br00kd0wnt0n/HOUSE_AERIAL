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
  TRANSITION: 'transition'
};

// State machine transitions
const STATE_TRANSITIONS = {
  [VIDEO_STATES.AERIAL]: [VIDEO_STATES.DIVE_IN],
  [VIDEO_STATES.DIVE_IN]: [VIDEO_STATES.FLOOR_LEVEL],
  [VIDEO_STATES.FLOOR_LEVEL]: [VIDEO_STATES.ZOOM_OUT],
  [VIDEO_STATES.ZOOM_OUT]: [VIDEO_STATES.AERIAL],
  [VIDEO_STATES.TRANSITION]: [VIDEO_STATES.AERIAL]
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
    
    // Callbacks
    this.onVideoChange = options.onVideoChange || (() => {});
    this.onLoadVideo = options.onLoadVideo || (() => {});
    this.onError = options.onError || (() => {});
    
    // Debug logging
    logger.info(MODULE, 'VideoStateManager initialized');
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
      this.resetPlaylist();
      this.changeState(VIDEO_STATES.AERIAL);
      return true;
    }
    
    // Get the current video from the playlist
    const video = this.playlistVideos[this.playlistIndex];
    if (!video) {
      logger.error(MODULE, `Invalid playlist index: ${this.playlistIndex}`);
      this.resetPlaylist();
      this.changeState(VIDEO_STATES.AERIAL);
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
  }
  
  /**
   * Handle a video ending
   * @param {string} videoType Type of video that ended
   * @returns {void}
   */
  handleVideoEnded(videoType) {
    logger.debug(MODULE, `Video ended: ${videoType}`);
    
    // If we're in a playlist, play the next video
    if (this.inPlaylistMode) {
      this.playNextInPlaylist();
      return;
    }
    
    // For non-playlist mode, just return to aerial
    if (videoType !== VIDEO_STATES.AERIAL) {
      this.changeState(VIDEO_STATES.AERIAL);
    }
  }
  
  /**
   * Reset the current playlist
   * @returns {void}
   */
  resetPlaylist() {
    logger.info(MODULE, 'Resetting playlist');
    
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
}

export default VideoStateManager; 
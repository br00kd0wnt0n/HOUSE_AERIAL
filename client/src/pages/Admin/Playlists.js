// client/src/pages/Admin/Playlists.js - Playlist management tab

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './AdminPages.css';

const Playlists = () => {
  const { 
    locations,
    selectedLocation,
    setSelectedLocation,
    hotspots,
    playlists,
    assetsByType,
    isLoading,
    isSaving,
    saveStatus,
    updatePlaylist,
    fetchHotspots,
    fetchPlaylists,
    pushChangesToFrontend
  } = useAdmin();
  
  // State for the selected hotspot and playlist
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  
  // Video selection form state
  const [videoSelections, setVideoSelections] = useState({
    diveInVideo: '',
    floorLevelVideo: '',
    zoomOutVideo: ''
  });
  
  // Handle location change
  const handleLocationChange = (e) => {
    const locationId = e.target.value;
    const location = locations.find(loc => loc._id === locationId);
    if (location) {
      setSelectedLocation(location);
      setSelectedHotspot(null);
      setSelectedPlaylist(null);
      resetVideoSelections();
    }
  };
  
  // Reset video selections
  const resetVideoSelections = () => {
    setVideoSelections({
      diveInVideo: '',
      floorLevelVideo: '',
      zoomOutVideo: ''
    });
  };
  
  // Load playlist when hotspot changes
  useEffect(() => {
    if (selectedHotspot) {
      // Find playlist for selected hotspot
      const playlist = playlists.find(p => p.hotspot._id === selectedHotspot._id);
      setSelectedPlaylist(playlist);
      
      if (playlist) {
        // Set initial video selections
        setVideoSelections({
          diveInVideo: playlist.sequence.diveInVideo?._id || '',
          floorLevelVideo: playlist.sequence.floorLevelVideo?._id || '',
          zoomOutVideo: playlist.sequence.zoomOutVideo?._id || ''
        });
      } else {
        resetVideoSelections();
      }
    } else {
      setSelectedPlaylist(null);
      resetVideoSelections();
    }
  }, [selectedHotspot, playlists]);
  
  // Get available videos of a specific type for the current location
  const getAvailableVideos = (type) => {
    return assetsByType[type]?.filter(asset => 
      asset.location && asset.location._id === selectedLocation._id
    ) || [];
  };
  
  // Handle video selection change
  const handleVideoSelectionChange = (e) => {
    const { name, value } = e.target;
    setVideoSelections(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission to update playlist
  const handleUpdatePlaylist = async (e) => {
    e.preventDefault();
    
    if (!selectedPlaylist) return;
    
    // Update playlist data
    const result = await updatePlaylist(selectedPlaylist._id, videoSelections);
    
    if (result) {
      // Refresh playlists
      await fetchPlaylists(selectedLocation._id);
    }
  };
  
  // Filter hotspots to show only PRIMARY type (which need playlists)
  const primaryHotspots = hotspots.filter(hotspot => hotspot.type === 'PRIMARY');
  
  // Get completion status for a playlist
  const getPlaylistStatus = (playlist) => {
    if (!playlist) return 'incomplete';
    
    const { diveInVideo, floorLevelVideo, zoomOutVideo } = playlist.sequence;
    
    if (diveInVideo && floorLevelVideo && zoomOutVideo) {
      return 'complete';
    } else if (diveInVideo || floorLevelVideo || zoomOutVideo) {
      return 'partial';
    } else {
      return 'incomplete';
    }
  };
  
  return (
    <div className="admin-page playlists-page">
      <h1>Playlist Management</h1>
      
      {/* Location selector */}
      <div className="location-selector">
        <label htmlFor="location">Location:</label>
        <select 
          id="location" 
          value={selectedLocation ? selectedLocation._id : ''} 
          onChange={handleLocationChange}
          disabled={isLoading}
        >
          <option value="" disabled>Select a location</option>
          {locations.map(location => (
            <option key={location._id} value={location._id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedLocation ? (
        <div className="playlist-editor">
          {/* Hotspot selection */}
          <div className="hotspot-selection">
            <h2>Select a Hotspot</h2>
            
            {primaryHotspots.length === 0 ? (
              <p className="no-hotspots-message">
                No PRIMARY hotspots available. Please create PRIMARY hotspots in the Hotspots tab.
              </p>
            ) : (
              <div className="hotspot-list">
                {primaryHotspots.map(hotspot => {
                  // Find playlist for this hotspot
                  const playlist = playlists.find(p => p.hotspot._id === hotspot._id);
                  const status = getPlaylistStatus(playlist);
                  
                  return (
                    <div 
                      key={hotspot._id}
                      className={`hotspot-item ${selectedHotspot && selectedHotspot._id === hotspot._id ? 'selected' : ''} ${status}`}
                      onClick={() => setSelectedHotspot(hotspot)}
                    >
                      <div className="hotspot-info">
                        <span className="hotspot-name">{hotspot.name}</span>
                        <span className="playlist-status">
                          {status === 'complete' ? '✓ Complete' : 
                           status === 'partial' ? '⚠ Partial' : 
                           '✕ Incomplete'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Playlist editor */}
          {selectedHotspot && (
            <div className="playlist-form-container">
              <h2>Configure Playlist for "{selectedHotspot.name}"</h2>
              
              <form className="playlist-form" onSubmit={handleUpdatePlaylist}>
                {/* Dive In Video selection */}
                <div className="form-group">
                  <label htmlFor="diveInVideo">Dive-In Video:</label>
                  <select
                    id="diveInVideo"
                    name="diveInVideo"
                    value={videoSelections.diveInVideo}
                    onChange={handleVideoSelectionChange}
                    disabled={isSaving}
                  >
                    <option value="">-- Select Dive-In Video --</option>
                    {getAvailableVideos('DiveIn').map(video => (
                      <option key={video._id} value={video._id}>
                        {video.name}
                      </option>
                    ))}
                  </select>
                  {videoSelections.diveInVideo && (
                    <div className="video-preview">
                      <h4>Preview:</h4>
                      <video width="320" height="180" controls>
                        <source 
                          src={assetsByType.DiveIn.find(v => v._id === videoSelections.diveInVideo)?.s3Key} 
                          type="video/mp4" 
                        />
                        Your browser does not support video playback.
                      </video>
                    </div>
                  )}
                </div>
                
                {/* Floor Level Video selection */}
                <div className="form-group">
                  <label htmlFor="floorLevelVideo">Floor-Level Video:</label>
                  <select
                    id="floorLevelVideo"
                    name="floorLevelVideo"
                    value={videoSelections.floorLevelVideo}
                    onChange={handleVideoSelectionChange}
                    disabled={isSaving}
                  >
                    <option value="">-- Select Floor-Level Video --</option>
                    {getAvailableVideos('FloorLevel').map(video => (
                      <option key={video._id} value={video._id}>
                        {video.name}
                      </option>
                    ))}
                  </select>
                  {videoSelections.floorLevelVideo && (
                    <div className="video-preview">
                      <h4>Preview:</h4>
                      <video width="320" height="180" controls>
                        <source 
                          src={assetsByType.FloorLevel.find(v => v._id === videoSelections.floorLevelVideo)?.s3Key} 
                          type="video/mp4" 
                        />
                        Your browser does not support video playback.
                      </video>
                    </div>
                  )}
                </div>
                
                {/* Zoom Out Video selection */}
                <div className="form-group">
                  <label htmlFor="zoomOutVideo">Zoom-Out Video:</label>
                  <select
                    id="zoomOutVideo"
                    name="zoomOutVideo"
                    value={videoSelections.zoomOutVideo}
                    onChange={handleVideoSelectionChange}
                    disabled={isSaving}
                  >
                    <option value="">-- Select Zoom-Out Video --</option>
                    {getAvailableVideos('ZoomOut').map(video => (
                      <option key={video._id} value={video._id}>
                        {video.name}
                      </option>
                    ))}
                  </select>
                  {videoSelections.zoomOutVideo && (
                    <div className="video-preview">
                      <h4>Preview:</h4>
                      <video width="320" height="180" controls>
                        <source 
                          src={assetsByType.ZoomOut.find(v => v._id === videoSelections.zoomOutVideo)?.s3Key} 
                          type="video/mp4" 
                        />
                        Your browser does not support video playback.
                      </video>
                    </div>
                  )}
                </div>
                
                {/* Submit button */}
                <div className="form-buttons">
                  <button 
                    type="submit"
                    className="save-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Playlist'}
                  </button>
                </div>
                
                {/* Playlist status */}
                <div className="playlist-status-info">
                  <h4>Playlist Status:</h4>
                  <div className={`status-indicator ${getPlaylistStatus(selectedPlaylist)}`}>
                    {getPlaylistStatus(selectedPlaylist) === 'complete' ? (
                      <>
                        <span className="status-icon">✓</span>
                        <span className="status-text">Complete - Ready for playback</span>
                      </>
                    ) : getPlaylistStatus(selectedPlaylist) === 'partial' ? (
                      <>
                        <span className="status-icon">⚠</span>
                        <span className="status-text">Partial - Missing some videos</span>
                      </>
                    ) : (
                      <>
                        <span className="status-icon">✕</span>
                        <span className="status-text">Incomplete - Please assign all videos</span>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="no-location-message">
          <p>Please select a location to manage playlists.</p>
        </div>
      )}
      
      {/* Save status message */}
      {saveStatus.message && (
        <div className={`save-status ${saveStatus.success ? 'success' : 'error'}`}>
          {saveStatus.message}
        </div>
      )}
      
      {/* Push changes button */}
      <div className="push-changes-container">
        <button
          className="push-changes-button"
          onClick={pushChangesToFrontend}
          disabled={isSaving || isLoading}
        >
          Push Changes to Frontend
        </button>
      </div>
    </div>
  );
};

export default Playlists;

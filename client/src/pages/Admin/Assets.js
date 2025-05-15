// client/src/pages/Admin/Assets.js - Asset management tab

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './AdminPages.css';

const Assets = () => {
  const { 
    locations,
    selectedLocation,
    setSelectedLocation,
    assetsByType,
    isLoading,
    isSaving,
    saveStatus,
    uploadAsset,
    deleteAsset,
    fetchAssets,
    fetchInProgress,
    pushChangesToFrontend
  } = useAdmin();
  
  const [activeTab, setActiveTab] = useState('AERIAL');
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'AERIAL',
    file: null,
    fileName: ''
  });
  
  const fileInputRef = useRef(null);
  
  // Add error state
  const [error, setError] = useState(null);
  
  // Filter assets based on selected tab and location
  const getFilteredAssets = useCallback(() => {
    const assetsForType = assetsByType[activeTab] || [];
    console.log(`Filtering assets for type ${activeTab}:`, assetsForType);
    
    // For location-specific assets, filter by selected location
    if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(activeTab)) {
      if (!selectedLocation) {
        console.log('No location selected for location-specific assets');
        return []; // Return empty array if no location selected for location-specific assets
      }
      const filtered = assetsForType.filter(asset => 
        asset.location && asset.location._id === selectedLocation._id
      );
      console.log(`Filtered ${activeTab} assets for location ${selectedLocation._id}:`, filtered);
      return filtered;
    }
    
    // For non-location-specific assets (UI elements, buttons, etc.), show all
    console.log(`Showing all ${activeTab} assets:`, assetsForType);
    return assetsForType;
  }, [activeTab, assetsByType, selectedLocation]);

  // Debug logging
  useEffect(() => {
    console.log('Assets component render:', {
      selectedLocation,
      activeTab,
      assetsByType: assetsByType[activeTab],
      isLoading,
      isSaving,
      filteredAssets: getFilteredAssets()
    });
  }, [selectedLocation, activeTab, assetsByType, isLoading, isSaving, getFilteredAssets]);
  
  // Memoize asset types to prevent recreation on each render
  const assetTypes = useMemo(() => [
    { id: 'AERIAL', label: 'Aerial Videos' },
    { id: 'DiveIn', label: 'Dive-In Videos' },
    { id: 'FloorLevel', label: 'Floor Level Videos' },
    { id: 'ZoomOut', label: 'Zoom-Out Videos' },
    { id: 'Transition', label: 'Transition Videos' },
    { id: 'Button', label: 'Buttons' },
    { id: 'MapPin', label: 'Map Pins' },
    { id: 'UIElement', label: 'UI Elements' }
  ], []);
  
  // Memoize filtered assets to prevent unnecessary recalculations
  const filteredAssets = useMemo(() => getFilteredAssets(), [getFilteredAssets]);
  
  // Memoize handlers to prevent recreation on each render
  const handleLocationChange = useCallback((e) => {
    const locationId = e.target.value;
    const location = locations.find(loc => loc._id === locationId);
    if (location) {
      console.log('Changing location to:', location);
      setSelectedLocation(location);
    }
  }, [locations, setSelectedLocation]);
  
  const handleTabChange = useCallback((type) => {
    console.log('Changing tab to:', type);
    setActiveTab(type);
    setUploadForm(prev => ({ ...prev, type }));
  }, []);
  
  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        fileName: file.name,
        name: file.name.split('.')[0] // Default name from filename
      }));
    }
  }, []);
  
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleUpload = useCallback(async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous errors
    
    if (!uploadForm.file) {
      setError(new Error('Please select a file to upload'));
      return;
    }
    
    // Determine if we need to associate with a location
    let locationId = null;
    if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(uploadForm.type)) {
      if (!selectedLocation) {
        setError(new Error('Please select a location for this asset type'));
        return;
      }
      locationId = selectedLocation._id;
    }
    
    try {
      // Upload the asset
      const result = await uploadAsset(
        uploadForm.file,
        uploadForm.name,
        uploadForm.type,
        locationId
      );
      
      if (result && selectedLocation?._id) {
        // Reset form
        setUploadForm({
          name: '',
          type: activeTab,
          file: null,
          fileName: ''
        });
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Only fetch if we have a selected location
        await fetchAssets(selectedLocation._id);
      }
    } catch (err) {
      setError(err);
    }
  }, [uploadForm, selectedLocation, activeTab, uploadAsset, fetchAssets]);
  
  const handleDeleteAsset = useCallback(async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      const result = await deleteAsset(assetId);
      
      if (result && selectedLocation?._id) {
        // Only fetch if we have a selected location
        await fetchAssets(selectedLocation._id);
      }
    }
  }, [selectedLocation, deleteAsset, fetchAssets]);
  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Memoize computed values
  const isLocationRequired = useMemo(() => 
    ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(activeTab),
    [activeTab]
  );
  
  const isVideoType = useMemo(() => 
    ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(activeTab),
    [activeTab]
  );
  
  const currentAssetType = useMemo(() => 
    assetTypes.find(t => t.id === activeTab),
    [assetTypes, activeTab]
  );
  
  // Show loading state only when actually loading or fetching
  if (isLoading || fetchInProgress) {
    console.log('Assets component is loading');
    return (
      <div className="admin-page loading-container">
        <div className="loading-spinner"></div>
        <p>Loading assets...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Assets component error:', error);
    return (
      <div className="admin-page error-container">
        <h2>Error Loading Assets</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Show empty state if no assets for the selected type/location
  if (!filteredAssets || filteredAssets.length === 0) {
    console.log('No assets found for current selection:', {
      filteredAssets,
      activeTab,
      selectedLocation,
      assetsByType: assetsByType[activeTab]
    });
    return (
      <div className="admin-page assets-page">
        <h1>Asset Management</h1>
        
        {/* Location selector */}
        <div className="location-selector">
          <label htmlFor="location">Location:</label>
          <select 
            id="location"
            value={selectedLocation?._id || ''}
            onChange={handleLocationChange}
            disabled={!isLocationRequired}
          >
            <option value="">Select a location</option>
            {locations.map(location => (
              <option key={location._id} value={location._id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Asset type tabs */}
        <div className="asset-tabs">
          {assetTypes.map(type => (
            <button
              key={type.id}
              className={`asset-tab ${activeTab === type.id ? 'active' : ''}`}
              onClick={() => handleTabChange(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="empty-state">
          <p>No {currentAssetType?.label.toLowerCase()} found</p>
          {isLocationRequired && !selectedLocation && (
            <p className="location-required">Please select a location to view assets</p>
          )}
        </div>

        {/* Upload form */}
        <div className="upload-section">
          <h2>Upload New {currentAssetType?.label}</h2>
          
          <form className="upload-form" onSubmit={handleUpload}>
            <div className="form-group">
              <label htmlFor="file">File:</label>
              <input
                type="file"
                id="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={isVideoType ? 'video/mp4,video/quicktime' : 'image/png,image/jpeg,image/gif'}
                disabled={isSaving}
                required
              />
              {uploadForm.fileName && (
                <span className="file-name">{uploadForm.fileName}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="name">Asset Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={uploadForm.name}
                onChange={handleInputChange}
                disabled={isSaving}
                required
              />
            </div>
            
            {isLocationRequired && (
              <div className="form-group">
                <p className="location-notice">
                  This asset will be associated with: <strong>{selectedLocation?.name || 'No location selected'}</strong>
                </p>
              </div>
            )}
            
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSaving || !uploadForm.file || (isLocationRequired && !selectedLocation)}
            >
              {isSaving ? 'Uploading...' : 'Upload Asset'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main render with assets
  console.log('Rendering assets list:', {
    filteredAssets,
    activeTab,
    selectedLocation,
    assetsByType: assetsByType[activeTab]
  });

  return (
    <div className="admin-page assets-page">
      <h1>Asset Management</h1>
      
      {/* Location selector */}
      <div className="location-selector">
        <label htmlFor="location">Location:</label>
        <select 
          id="location" 
          value={selectedLocation?._id || ''} 
          onChange={handleLocationChange}
          disabled={isLoading}
        >
          <option value="">Select a location</option>
          {locations.map(location => (
            <option key={location._id} value={location._id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Asset type tabs */}
      <div className="asset-tabs">
        {assetTypes.map(type => (
          <button
            key={type.id}
            className={`asset-tab ${activeTab === type.id ? 'active' : ''}`}
            onClick={() => handleTabChange(type.id)}
            disabled={isLoading}
          >
            {type.label}
          </button>
        ))}
      </div>
      
      {/* Upload form */}
      <div className="upload-form-container">
        <h2>Upload New {currentAssetType?.label}</h2>
        
        <form className="upload-form" onSubmit={handleUpload}>
          <div className="form-group">
            <label htmlFor="file">File:</label>
            <input
              type="file"
              id="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={isVideoType ? 'video/mp4,video/quicktime' : 'image/png,image/jpeg,image/gif'}
              disabled={isSaving}
              required
            />
            {uploadForm.fileName && (
              <span className="file-name">{uploadForm.fileName}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Asset Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={uploadForm.name}
              onChange={handleInputChange}
              disabled={isSaving}
              required
            />
          </div>
          
          {isLocationRequired && (
            <div className="form-group">
              <p className="location-notice">
                This asset will be associated with: <strong>{selectedLocation?.name || 'No location selected'}</strong>
              </p>
            </div>
          )}
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSaving || !uploadForm.file || (isLocationRequired && !selectedLocation)}
          >
            {isSaving ? 'Uploading...' : 'Upload Asset'}
          </button>
        </form>
      </div>
      
      {/* Assets list */}
      <div className="assets-list-container">
        <h2>{currentAssetType?.label} List</h2>
        
        <div className="assets-list">
          <table className="assets-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Name</th>
                <th>Size</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => (
                <tr key={asset._id}>
                  <td className="asset-preview">
                    {asset.fileType === 'mp4' ? (
                      <video width="120" height="80" controls>
                        <source src={asset.s3Key} type="video/mp4" />
                        Your browser does not support video playback.
                      </video>
                    ) : (
                      <img src={asset.s3Key} alt={asset.name} width="120" />
                    )}
                  </td>
                  <td>{asset.name}</td>
                  <td>{formatFileSize(asset.size)}</td>
                  <td>{asset.location ? asset.location.name : 'N/A'}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteAsset(asset._id)}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
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

export default React.memo(Assets);

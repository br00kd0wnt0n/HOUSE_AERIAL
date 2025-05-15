// client/src/components/admin/AssetManager.js - Component for managing UI assets

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { uploadPlaceholderAssets, generatePlaceholderAssets } from '../../utils/placeholderAssets';
import api from '../../utils/api';
import '../../styles/AssetManager.css';

const AssetManager = () => {
  const { 
    assetsByType,
    isLoading: contextLoading,
    isSaving,
    saveStatus,
    uploadAsset,
    deleteAsset,
    fetchAssets
  } = useAdmin();

  const [assets, setAssets] = useState({
    buttons: [],
    pins: [],
    ui: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewAssets, setPreviewAssets] = useState(null);

  // Load existing assets
  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Use assetsByType from context instead of making separate API calls
        setAssets({
          buttons: assetsByType.Button || [],
          pins: assetsByType.MapPin || [],
          ui: assetsByType.UIElement || []
        });
      } catch (error) {
        console.error('Error loading assets:', error);
        setError('Failed to load existing assets');
      }
    };

    loadAssets();
  }, [assetsByType]);

  // Generate preview of placeholder assets
  const generatePreview = () => {
    const preview = generatePlaceholderAssets();
    setPreviewAssets(preview);
  };

  // Upload placeholder assets
  const handleUploadPlaceholders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await uploadPlaceholderAssets();
      const successfulUploads = results.filter(result => result !== null);

      if (successfulUploads.length > 0) {
        // Refresh assets using context
        await fetchAssets();
      }

      setPreviewAssets(null);
    } catch (error) {
      console.error('Error uploading placeholder assets:', error);
      setError('Failed to upload placeholder assets');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an asset
  const handleDeleteAsset = async (assetId) => {
    try {
      await deleteAsset(assetId);
      // Assets will be automatically updated through context
    } catch (error) {
      console.error('Error deleting asset:', error);
      setError('Failed to delete asset');
    }
  };

  // Show loading state
  if (contextLoading || isLoading) {
    return (
      <div className="admin-page loading-container">
        <div className="loading-spinner"></div>
        <p>Loading assets...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="admin-page error-container">
        <h2>Error Loading Assets</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render asset preview
  const renderAssetPreview = (type, assets) => (
    <div className="asset-preview-section">
      <h3>{type}</h3>
      <div className="asset-grid">
        {assets.map(asset => (
          <div key={asset._id} className="asset-item">
            <img src={asset.s3Key} alt={asset.name} />
            <div className="asset-info">
              <span>{asset.name}</span>
              <button 
                className="delete-button"
                onClick={() => handleDeleteAsset(asset._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render placeholder preview
  const renderPlaceholderPreview = () => {
    if (!previewAssets) return null;

    return (
      <div className="placeholder-preview">
        <h3>Placeholder Preview</h3>
        <div className="preview-section">
          <h4>Buttons</h4>
          <div className="asset-grid">
            {Object.entries(previewAssets.buttons).map(([name, dataUrl]) => (
              <div key={name} className="asset-item">
                <img src={dataUrl} alt={`button_${name}`} />
                <div className="asset-info">
                  <span>button_{name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="preview-section">
          <h4>Pins</h4>
          <div className="asset-grid">
            {Object.entries(previewAssets.pins).map(([type, dataUrl]) => (
              <div key={type} className="asset-item">
                <img src={dataUrl} alt={`pin_${type}`} />
                <div className="asset-info">
                  <span>pin_{type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="preview-section">
          <h4>UI Elements</h4>
          <div className="asset-grid">
            {Object.entries(previewAssets.ui).map(([name, dataUrl]) => (
              <div key={name} className="asset-item">
                <img src={dataUrl} alt={`ui_${name}`} />
                <div className="asset-info">
                  <span>ui_{name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="asset-manager">
      <h2>UI Asset Manager</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className="preview-button"
          onClick={generatePreview}
          disabled={isLoading}
        >
          Preview Placeholders
        </button>
        
        {previewAssets && (
          <button 
            className="upload-button"
            onClick={handleUploadPlaceholders}
            disabled={isLoading}
          >
            {isLoading ? 'Uploading...' : 'Upload Placeholders'}
          </button>
        )}
      </div>

      {previewAssets && renderPlaceholderPreview()}

      <div className="existing-assets">
        <h3>Existing Assets</h3>
        {renderAssetPreview('Buttons', assets.buttons)}
        {renderAssetPreview('Pins', assets.pins)}
        {renderAssetPreview('UI Elements', assets.ui)}
      </div>
    </div>
  );
};

export default AssetManager; 
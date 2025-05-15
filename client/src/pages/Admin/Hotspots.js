// client/src/pages/Admin/Hotspots.js - Hotspot management tab

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './AdminPages.css';

const Hotspots = () => {
  const { 
    locations,
    selectedLocation,
    setSelectedLocation,
    hotspots,
    selectedHotspot,
    setSelectedHotspot,
    drawingMode,
    setDrawingMode,
    isLoading,
    isSaving,
    saveStatus,
    createHotspot,
    updateHotspot,
    deleteHotspot,
    fetchHotspots,
    pushChangesToFrontend
  } = useAdmin();
  
  // Canvas for drawing hotspots
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  
  // Hotspot drawing state
  const [points, setPoints] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [aerialImage, setAerialImage] = useState(null);
  
  // Hotspot form state
  const [hotspotForm, setHotspotForm] = useState({
    name: '',
    type: 'PRIMARY',
    infoPanel: {
      title: '',
      description: ''
    }
  });
  
  // Load aerial image for the selected location
  useEffect(() => {
    const loadAerialImage = async () => {
      if (!selectedLocation) return;
      
      try {
        // This would normally fetch the aerial video for the location
        // For now, use a placeholder image
        setAerialImage('/assets/placeholder/aerial-map.jpg');
        setImageLoaded(false);
      } catch (error) {
        console.error('Error loading aerial image:', error);
        setAerialImage(null);
      }
    };
    
    loadAerialImage();
  }, [selectedLocation]);
  
  // Handle location change
  const handleLocationChange = (e) => {
    const locationId = e.target.value;
    const location = locations.find(loc => loc._id === locationId);
    if (location) {
      setSelectedLocation(location);
      setSelectedHotspot(null);
      setPoints([]);
      setDrawingMode(false);
    }
  };
  
  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    
    // Reset the canvas when image loads
    if (canvasRef.current && canvasContainerRef.current) {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  // Start drawing mode
  const startDrawing = () => {
    setSelectedHotspot(null);
    setPoints([]);
    setHotspotForm({
      name: '',
      type: 'PRIMARY',
      infoPanel: {
        title: '',
        description: ''
      }
    });
    setDrawingMode(true);
  };
  
  // Handle canvas click (add point)
  const handleCanvasClick = (e) => {
    if (!drawingMode || !canvasRef.current || !canvasContainerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate relative position (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Add point
    setPoints(prevPoints => [...prevPoints, { x, y }]);
    
    // Draw point on canvas
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x * canvas.width, y * canvas.height, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw line from previous point
    if (points.length > 0) {
      const prevPoint = points[points.length - 1];
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(prevPoint.x * canvas.width, prevPoint.y * canvas.height);
      ctx.lineTo(x * canvas.width, y * canvas.height);
      ctx.stroke();
    }
  };
  
  // Finish drawing
  const finishDrawing = () => {
    if (points.length < 3) {
      alert('Please draw at least 3 points to create a hotspot.');
      return;
    }
    
    // Draw closing line on canvas
    if (canvasRef.current && points.length > 2) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Connect last point to first point
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
      ctx.lineTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
      ctx.stroke();
    }
    
    setDrawingMode(false);
  };
  
  // Cancel drawing
  const cancelDrawing = () => {
    setPoints([]);
    setDrawingMode(false);
    
    // Clear canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Redraw existing hotspots
    drawExistingHotspots();
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('infoPanel.')) {
      // Handle nested infoPanel properties
      const infoPanelField = name.split('.')[1];
      setHotspotForm(prev => ({
        ...prev,
        infoPanel: {
          ...prev.infoPanel,
          [infoPanelField]: value
        }
      }));
    } else {
      // Handle top-level properties
      setHotspotForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Memoize drawExistingHotspots
  const drawExistingHotspots = useCallback(() => {
    if (!canvasRef.current || !canvasContainerRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each hotspot
    hotspots.forEach(hotspot => {
      const isSelected = selectedHotspot && selectedHotspot._id === hotspot._id;
      
      // Draw points
      ctx.fillStyle = isSelected ? '#fff' : '#ff0000';
      hotspot.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw lines
      ctx.strokeStyle = isSelected ? '#fff' : '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      hotspot.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
        } else {
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }
      });
      ctx.stroke();
    });
  }, [hotspots, selectedHotspot, imageLoaded]);
  
  // Update canvas when hotspots change
  useEffect(() => {
    if (imageLoaded) {
      drawExistingHotspots();
    }
  }, [hotspots, imageLoaded, drawExistingHotspots]);
  
  // Select a hotspot
  const selectHotspot = (hotspot) => {
    setSelectedHotspot(hotspot);
    setDrawingMode(false);
    setPoints([]);
    
    // Update form with hotspot data
    setHotspotForm({
      name: hotspot.name,
      type: hotspot.type,
      infoPanel: {
        title: hotspot.infoPanel?.title || '',
        description: hotspot.infoPanel?.description || ''
      }
    });
    
    // Redraw hotspots to highlight selected one
    drawExistingHotspots();
  };
  
  // Create a new hotspot
  const handleCreateHotspot = async (e) => {
    e.preventDefault();
    
    if (points.length < 3) {
      alert('Please draw a valid hotspot with at least 3 points.');
      return;
    }
    
    if (!hotspotForm.name) {
      alert('Please enter a name for the hotspot.');
      return;
    }
    
    // Create hotspot data
    const hotspotData = {
      name: hotspotForm.name,
      type: hotspotForm.type,
      coordinates: points,
      infoPanel: hotspotForm.type === 'SECONDARY' ? hotspotForm.infoPanel : undefined
    };
    
    // Create hotspot
    const result = await createHotspot(hotspotData);
    
    if (result) {
      // Reset form and drawing
      setPoints([]);
      setHotspotForm({
        name: '',
        type: 'PRIMARY',
        infoPanel: {
          title: '',
          description: ''
        }
      });
      
      // Refresh hotspots and redraw
      await fetchHotspots(selectedLocation._id);
      drawExistingHotspots();
    }
  };
  
  // Update existing hotspot
  const handleUpdateHotspot = async (e) => {
    e.preventDefault();
    
    if (!selectedHotspot) return;
    
    // Update hotspot data
    const hotspotData = {
      name: hotspotForm.name,
      type: hotspotForm.type,
      infoPanel: hotspotForm.type === 'SECONDARY' ? hotspotForm.infoPanel : undefined
    };
    
    // Update hotspot
    const result = await updateHotspot(selectedHotspot._id, hotspotData);
    
    if (result) {
      // Refresh hotspots and redraw
      await fetchHotspots(selectedLocation._id);
      drawExistingHotspots();
    }
  };
  
  // Delete hotspot
  const handleDeleteHotspot = async () => {
    if (!selectedHotspot) return;
    
    if (window.confirm(`Are you sure you want to delete the hotspot "${selectedHotspot.name}"?`)) {
      const result = await deleteHotspot(selectedHotspot._id);
      
      if (result) {
        // Reset selection
        setSelectedHotspot(null);
        setHotspotForm({
          name: '',
          type: 'PRIMARY',
          infoPanel: {
            title: '',
            description: ''
          }
        });
        
        // Refresh hotspots and redraw
        await fetchHotspots(selectedLocation._id);
        drawExistingHotspots();
      }
    }
  };
  
  return (
    <div className="admin-page hotspots-page">
      <h1>Hotspot Management</h1>
      
      {/* Location selector */}
      <div className="location-selector">
        <label htmlFor="location">Location:</label>
        <select 
          id="location" 
          value={selectedLocation ? selectedLocation._id : ''} 
          onChange={handleLocationChange}
          disabled={isLoading || drawingMode}
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
        <div className="hotspot-editor">
          {/* Canvas for drawing hotspots */}
          <div className="canvas-container" ref={canvasContainerRef}>
            {aerialImage && (
              <img 
                src={aerialImage} 
                alt="Aerial Map" 
                className="aerial-image"
                onLoad={handleImageLoad}
              />
            )}
            <canvas 
              ref={canvasRef} 
              className="hotspot-canvas"
              onClick={handleCanvasClick}
            />
          </div>
          
          {/* Hotspot controls */}
          <div className="hotspot-controls">
            {drawingMode ? (
              <div className="drawing-controls">
                <h3>Drawing Hotspot</h3>
                <p>Click on the image to add points. Add at least 3 points to create a valid hotspot.</p>
                <p>Points added: {points.length}</p>
                <div className="button-group">
                  <button 
                    className="finish-button"
                    onClick={finishDrawing}
                    disabled={points.length < 3}
                  >
                    Finish Drawing
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={cancelDrawing}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="hotspot-buttons">
                <button 
                  className="create-button"
                  onClick={startDrawing}
                  disabled={isLoading || isSaving}
                >
                  Create New Hotspot
                </button>
                <div className="hotspot-list">
                  <h3>Existing Hotspots</h3>
                  {hotspots.length === 0 ? (
                    <p>No hotspots created yet.</p>
                  ) : (
                    <ul>
                      {hotspots.map(hotspot => (
                        <li 
                          key={hotspot._id}
                          className={`hotspot-item ${selectedHotspot && selectedHotspot._id === hotspot._id ? 'selected' : ''} ${hotspot.type.toLowerCase()}`}
                          onClick={() => selectHotspot(hotspot)}
                        >
                          <div className="hotspot-type-indicator"></div>
                          <span className="hotspot-name">{hotspot.name}</span>
                          <span className="hotspot-type">{hotspot.type}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            
            {/* Hotspot form (for create or edit) */}
            {(drawingMode && points.length >= 3) || selectedHotspot ? (
              <form 
                className="hotspot-form"
                onSubmit={selectedHotspot ? handleUpdateHotspot : handleCreateHotspot}
              >
                <h3>{selectedHotspot ? 'Edit Hotspot' : 'New Hotspot'}</h3>
                
                <div className="form-group">
                  <label htmlFor="name">Hotspot Name:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={hotspotForm.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="type">Hotspot Type:</label>
                  <select
                    id="type"
                    name="type"
                    value={hotspotForm.type}
                    onChange={handleInputChange}
                  >
                    <option value="PRIMARY">PRIMARY</option>
                    <option value="SECONDARY">SECONDARY</option>
                  </select>
                </div>
                
                {/* Info panel fields (only for SECONDARY hotspots) */}
                {hotspotForm.type === 'SECONDARY' && (
                  <div className="info-panel-fields">
                    <h4>Information Panel</h4>
                    
                    <div className="form-group">
                      <label htmlFor="infoPanel.title">Title:</label>
                      <input
                        type="text"
                        id="infoPanel.title"
                        name="infoPanel.title"
                        value={hotspotForm.infoPanel.title}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="infoPanel.description">Description:</label>
                      <textarea
                        id="infoPanel.description"
                        name="infoPanel.description"
                        value={hotspotForm.infoPanel.description}
                        onChange={handleInputChange}
                        rows={4}
                      />
                    </div>
                  </div>
                )}
                
                <div className="form-buttons">
                  <button 
                    type="submit"
                    className="save-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : selectedHotspot ? 'Update Hotspot' : 'Create Hotspot'}
                  </button>
                  
                  {selectedHotspot && (
                    <button
                      type="button"
                      className="delete-button"
                      onClick={handleDeleteHotspot}
                      disabled={isSaving}
                    >
                      Delete Hotspot
                    </button>
                  )}
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="no-location-message">
          <p>Please select a location to manage hotspots.</p>
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
          disabled={isSaving || isLoading || drawingMode}
        >
          Push Changes to Frontend
        </button>
      </div>
    </div>
  );
};

export default Hotspots;

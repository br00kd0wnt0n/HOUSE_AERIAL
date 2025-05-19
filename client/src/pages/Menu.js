// client/src/pages/Menu.js - Location selection menu

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api, { baseBackendUrl } from '../utils/api';
import '../styles/Menu.css';

const Menu = () => {
  const navigate = useNavigate();
  const { locations, isLoading: contextLoading } = useVideo();
  const [buttonAssets, setButtonAssets] = useState({});
  const [hoveredButton, setHoveredButton] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Handle location selection
  const handleLocationSelect = (locationId) => {
    navigate(`/experience/${locationId}`);
  };
  
  // Fetch button assets from API
  useEffect(() => {
    const fetchButtonAssets = async () => {
      try {
        setIsLoading(true);
        const response = await api.getAssetsByType('Button');
        
        if (response.data) {
          // Organize buttons by location and state (ON/OFF)
          const buttons = {};
          
          response.data.forEach(asset => {
            if (!asset.location || !asset.location.name) return;
            
            const locationName = asset.location.name;
            const locationId = asset.location._id;
            
            if (!buttons[locationId]) {
              buttons[locationId] = {
                name: locationName,
                normal: null, // OFF button
                hover: null   // ON button
              };
            }
            
            // Determine button state from name
            if (asset.name.endsWith('_Button_ON')) {
              buttons[locationId].hover = asset.accessUrl;
            } else if (asset.name.endsWith('_Button_OFF')) {
              buttons[locationId].normal = asset.accessUrl;
            }
          });
          
          setButtonAssets(buttons);
          console.log('Fetched button assets:', buttons);
        }
      } catch (err) {
        console.error('Error fetching button assets:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchButtonAssets();
  }, []);
  
  if (contextLoading || isLoading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error Loading Assets</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="menu-container">
      <div className="menu-header">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png" alt="Netflix" className="netflix-logo" />
        <h1>Welcome to Netflix House</h1>
      </div>
      
      <div className="menu-content">
        <h2>Select a Location</h2>
        
        <div className="location-buttons">
          {locations.map(location => (
            <button
              key={location._id}
              className="location-button"
              onClick={() => handleLocationSelect(location._id)}
              onMouseEnter={() => setHoveredButton(location._id)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              {buttonAssets[location._id] && (
                buttonAssets[location._id].normal || buttonAssets[location._id].hover
              ) ? (
                <img 
                  src={
                    hoveredButton === location._id && buttonAssets[location._id].hover
                      ? `${baseBackendUrl}${buttonAssets[location._id].hover}`
                      : buttonAssets[location._id].normal
                        ? `${baseBackendUrl}${buttonAssets[location._id].normal}`
                        : `${baseBackendUrl}${buttonAssets[location._id].hover}`
                  } 
                  alt={location.name} 
                  className="location-button-image" 
                />
              ) : (
                <div className="location-button-text">
                  {location.name}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="menu-footer">
        <p>Experience the magic of Netflix in real life</p>
      </div>
    </div>
  );
};

export default Menu;

// client/src/pages/Menu.js - Location selection menu

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/Menu.css';

const Menu = () => {
  const navigate = useNavigate();
  const { locations, isLoading } = useVideo();
  const [buttonAssets, setButtonAssets] = useState({});
  
  // Handle location selection
  const handleLocationSelect = (locationId) => {
    navigate(`/experience/${locationId}`);
  };
  
  // Load button assets if available
  useEffect(() => {
    // This would normally fetch button assets from the API
    // For now, just use placeholder images
    setButtonAssets({
      'King of Prussia': '/assets/placeholder/kop-button.png',
      'Dallas': '/assets/placeholder/dallas-button.png'
    });
  }, []);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="menu-container">
      <div className="menu-header">
        <img src="/assets/placeholder/netflix-logo.png" alt="Netflix" className="netflix-logo" />
        <h1>Welcome to Netflix House</h1>
      </div>
      
      <div className="menu-content">
        <h2>Select a Location</h2>
        
        <div className="location-buttons">
          {locations.map(location => (
            <div key={location._id} className="location-button-container">
              <button
                className="location-button"
                onClick={() => handleLocationSelect(location._id)}
              >
                {buttonAssets[location.name] ? (
                  <img 
                    src={buttonAssets[location.name]} 
                    alt={location.name} 
                    className="location-button-image" 
                  />
                ) : (
                  <div className="location-button-text">
                    {location.name}
                  </div>
                )}
              </button>
              <div className="location-name">{location.name}</div>
            </div>
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

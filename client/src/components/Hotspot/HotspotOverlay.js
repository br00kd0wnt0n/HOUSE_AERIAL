import React from 'react';
import { useVideo } from '../../context/VideoContext';
import './HotspotOverlay.css';

const HotspotOverlay = ({ hotspots }) => {
  const { handleHotspotClick } = useVideo();
  
  if (!hotspots || hotspots.length === 0) {
    console.log('No hotspots available to display');
    return null;
  }
  
  console.log('Rendering hotspots:', hotspots);
  
  return (
    <div className="hotspot-overlay">
      {hotspots.map(hotspot => (
        <button
          key={hotspot._id}
          className={`hotspot ${hotspot.type.toLowerCase()}`}
          style={{
            left: `${hotspot.centerPoint.x * 100}%`,
            top: `${hotspot.centerPoint.y * 100}%`
          }}
          onClick={() => handleHotspotClick(hotspot)}
        >
          <span className="hotspot-indicator"></span>
          <span className="hotspot-label">{hotspot.name}</span>
        </button>
      ))}
    </div>
  );
};

export default HotspotOverlay;
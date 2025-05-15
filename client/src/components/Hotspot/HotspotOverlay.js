import React from 'react';
import './HotspotOverlay.css';

const HotspotOverlay = ({ hotspots, onHotspotClick }) => {
  return (
    <div className="hotspot-overlay">
      {hotspots.map(hotspot => (
        <button
          key={hotspot._id}
          className="hotspot"
          style={{
            left: `${hotspot.position.x}%`,
            top: `${hotspot.position.y}%`
          }}
          onClick={() => onHotspotClick(hotspot)}
        />
      ))}
    </div>
  );
};

export default HotspotOverlay;
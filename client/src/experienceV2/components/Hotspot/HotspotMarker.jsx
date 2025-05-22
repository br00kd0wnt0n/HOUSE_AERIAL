import React from 'react';
import { cn } from '../../../lib/utils';
import './HotspotMarker.css';

/**
 * Component for rendering marker-style hotspots (pins or indicators)
 */
const HotspotMarker = ({
  hotspots,
  getHotspotPosition,
  onHotspotClick,
  debugMode
}) => {
  // Handle both click and touch events for better mobile experience
  const handleInteraction = (e, hotspot) => {
    e.preventDefault();
    e.stopPropagation();
    onHotspotClick(hotspot);
  };

  return (
    <>
      {hotspots.map(hotspot => {
        // Get the adjusted position for this hotspot
        const position = getHotspotPosition(hotspot);
        
        return (
          <div 
            key={`hotspot-marker-${hotspot._id}`}
            className={cn("hotspot-wrapper", { "debug-visible": debugMode })}
            style={{
              left: position.left,
              top: position.top
            }}
            onClick={(e) => handleInteraction(e, hotspot)}
            onTouchStart={(e) => handleInteraction(e, hotspot)}
          >
            {/* Debug indicator for hotspot position */}
            {debugMode && (
              <div className="debug-hotspot-marker">
                <span className="debug-hotspot-name">{hotspot.name}</span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default HotspotMarker; 
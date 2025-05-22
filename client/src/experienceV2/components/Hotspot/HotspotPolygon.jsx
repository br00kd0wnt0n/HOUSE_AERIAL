import React, { useRef } from 'react';
import { cn } from '../../../lib/utils';
import './HotspotPolygon.css';

/**
 * Component for rendering polygon hotspots using SVG
 */
const HotspotPolygon = ({
  hotspots,
  svgViewBox,
  displayArea,
  createSvgPoints,
  onHotspotClick,
  debugMode
}) => {
  // Create a ref for the SVG element
  const svgRef = useRef(null);
  
  // Get the polygon class based on hotspot type
  const getHotspotPolygonClass = (hotspot) => {
    const baseClass = 'hotspot-polygon';
    
    // Add type-specific class
    if (hotspot.type === 'PRIMARY') {
      return `${baseClass} primary-polygon`;
    } else if (hotspot.type === 'SECONDARY') {
      return `${baseClass} secondary-polygon`;
    }
    
    return baseClass;
  };

  // Filter out invalid hotspots (those without enough coordinates)
  const validHotspots = hotspots.filter(hotspot => 
    hotspot.coordinates && hotspot.coordinates.length >= 3
  );

  // Handle both click and touch events for better mobile experience
  const handleInteraction = (e, hotspot) => {
    e.preventDefault();
    e.stopPropagation();
    onHotspotClick(hotspot);
  };

  return (
    <svg 
      className={cn("hotspot-svg", { "debug-mode": debugMode })}
      viewBox={svgViewBox} 
      preserveAspectRatio="none"
      ref={svgRef}
      style={{
        // Set the size and position based on calculated display area
        position: 'absolute',
        top: `${displayArea.offsetY}px`,
        left: `${displayArea.offsetX}px`,
        width: `${displayArea.width}px`,
        height: `${displayArea.height}px`,
        pointerEvents: 'none', // Allow click through to videoRef element
        zIndex: 10 // Above video but below UI
      }}
    >
      {/* Render polygons for each valid hotspot */}
      {validHotspots.map(hotspot => (
        <polygon 
          key={`hotspot-polygon-${hotspot._id}`}
          className={getHotspotPolygonClass(hotspot)}
          points={createSvgPoints(hotspot.coordinates)}
          onClick={(e) => handleInteraction(e, hotspot)}
          onTouchStart={(e) => handleInteraction(e, hotspot)}
        />
      ))}
    </svg>
  );
};

export default HotspotPolygon; 
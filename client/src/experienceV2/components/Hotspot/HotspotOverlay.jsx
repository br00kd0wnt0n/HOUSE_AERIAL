import React, { useEffect } from 'react';
import { useDimensionCalculator } from '../../hooks/useDimensionCalculator';
import { useHotspotDebug } from '../../hooks/useHotspotDebug';
import HotspotPolygon from './HotspotPolygon';
import HotspotMarker from './HotspotMarker';
import DebugPanel from './DebugPanel';
import logger from '../../utils/logger';

// Always import base styles
import './HotspotVariables.css';
import './HotspotOverlay.css';

/**
 * HotspotOverlay.jsx - Component for rendering hotspots in the V2 experience
 * Uses a fixed coordinate system to match hotspot positions from the admin panel
 */
const HotspotOverlay = ({ hotspots, onHotspotClick, videoRef, debugMode: externalDebugMode }) => {
  // Module name for logging
  const MODULE = 'HotspotOverlay';
  
  // Use custom hooks for dimensions and debug functionality
  const { 
    svgViewBox, 
    videoDimensions, 
    displayArea, 
    dimensionsSet,
    getHotspotPosition, 
    createSvgPoints,
    formatNumber
  } = useDimensionCalculator({ videoRef });
  
  const { debugMode } = useHotspotDebug({ externalDebugMode });

  // Load debug styles on component mount if needed
  useEffect(() => {
    // Import debug styles when component mounts if debug mode is active
    if (debugMode) {
      try {
        // Import debug styles synchronously if possible to avoid FOUC (flash of unstyled content)
        require('./DebugStyles.css');
        
        if (process.env.NODE_ENV !== 'production') {
          logger.debug(MODULE, 'Debug styles loaded');
        }
      } catch (error) {
        // Fallback to dynamic import if synchronous import fails
        import('./DebugStyles.css')
          .then(() => {
            if (process.env.NODE_ENV !== 'production') {
              logger.debug(MODULE, 'Debug styles loaded dynamically');
            }
          })
          .catch(error => {
            logger.error(MODULE, 'Failed to load debug styles:', error);
          });
      }
    }
  }, [debugMode]);

  // Don't render anything if no hotspots or video not ready
  if (!hotspots || hotspots.length === 0) {
    logger.debug(MODULE, `Not rendering hotspots: ${!hotspots ? 'no hotspots array' : 'empty hotspots array'}`);
    return null;
  }
  
  // Show warning if dimensions aren't set but we have hotspots
  if ((hotspots?.length > 0) && (!displayArea.width || !displayArea.height) && !dimensionsSet) {
    logger.warn(MODULE, 'Display area dimensions not set, but attempting to render hotspots anyway');
  }
  
  // Log hotspots when in debug mode - but only in development
  if (debugMode && process.env.NODE_ENV !== 'production') {
    console.log('Hotspots data:', hotspots);
    logger.debug(MODULE, `Rendering ${hotspots.length} hotspots with debug mode ON`);
  }
  
  return (
    <div className="hotspot-overlay" tabIndex={0}>
      {/* SVG layer for polygon hotspots */}
      <HotspotPolygon
        hotspots={hotspots}
        svgViewBox={svgViewBox}
        displayArea={displayArea}
        createSvgPoints={createSvgPoints}
        onHotspotClick={onHotspotClick}
        debugMode={debugMode}
      />
      
      {/* Map pins and hotspots */}
      <HotspotMarker
        hotspots={hotspots}
        getHotspotPosition={getHotspotPosition}
        onHotspotClick={onHotspotClick}
        debugMode={debugMode}
      />
      
      {/* Enhanced Debug panel positioned at bottom right */}
      {debugMode && (
        <DebugPanel
          hotspots={hotspots}
          videoDimensions={videoDimensions}
          displayArea={displayArea}
          formatNumber={formatNumber}
          svgViewBox={svgViewBox}
        />
      )}
    </div>
  );
};

export default HotspotOverlay; 
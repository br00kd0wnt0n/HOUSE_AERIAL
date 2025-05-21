import React, { useEffect, useState } from 'react';
import logger from '../../utils/logger';

const MODULE = 'DebugPanel';

/**
 * Component for displaying debug information about hotspots and video
 * Only rendered when debug mode is active
 * Note: The debug styles are dynamically imported in HotspotOverlay.jsx
 * when debug mode is active
 */
const DebugPanel = ({
  hotspots,
  videoDimensions,
  displayArea,
  formatNumber,
  svgViewBox
}) => {
  // State to track caching info
  const [cacheInfo, setCacheInfo] = useState({
    serviceWorkerActive: false,
    cachedResources: 0,
    cacheNames: []
  });
  
  // Function to fetch caching information
  useEffect(() => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      // Check for active service worker
      navigator.serviceWorker.getRegistration().then(registration => {
        const isActive = !!registration && !!registration.active;
        setCacheInfo(prev => ({ ...prev, serviceWorkerActive: isActive }));
        
        if (isActive) {
          logger.debug(MODULE, 'Service worker is active');
        }
      }).catch(err => {
        logger.error(MODULE, 'Error checking service worker status:', err);
      });
      
      // Get cache names
      caches.keys().then(cacheNames => {
        setCacheInfo(prev => ({ ...prev, cacheNames }));
        
        // For each cache, count entries
        let totalCachedResources = 0;
        const promises = cacheNames.map(name => 
          caches.open(name).then(cache => 
            cache.keys().then(keys => {
              totalCachedResources += keys.length;
              return keys.length;
            })
          )
        );
        
        Promise.all(promises).then(() => {
          setCacheInfo(prev => ({ ...prev, cachedResources: totalCachedResources }));
        });
      }).catch(err => {
        logger.error(MODULE, 'Error retrieving cache information:', err);
      });
    }
  }, []);
  
  // Count hotspots by type
  const getHotspotCounts = () => {
    const counts = {
      total: hotspots?.length || 0,
      primary: 0,
      secondary: 0,
      other: 0,
      validPolygons: 0
    };

    if (hotspots && hotspots.length > 0) {
      hotspots.forEach(hotspot => {
        if (hotspot.type === 'PRIMARY') counts.primary++;
        else if (hotspot.type === 'SECONDARY') counts.secondary++;
        else counts.other++;

        if (hotspot.coordinates && Array.isArray(hotspot.coordinates) && hotspot.coordinates.length >= 3) {
          counts.validPolygons++;
        }
      });
    }

    return counts;
  };
  
  // Get hotspot counts for debug info
  const hotspotCounts = getHotspotCounts();
  
  return (
    <div className="debug-panel">
      <h3>Debug Info</h3>
      
      {/* Warning if dimensions aren't set */}
      {!displayArea.width && (
        <div className="warning">
          <strong>⚠️ Warning:</strong> Display area dimensions not set!
        </div>
      )}
      
      {/* Hotspot info section */}
      <div className="section">
        <strong>Hotspots:</strong>
        <ul>
          <li>Total: {hotspotCounts.total}</li>
          <li>Primary: {hotspotCounts.primary}</li>
          <li>Secondary: {hotspotCounts.secondary}</li>
          <li>Other: {hotspotCounts.other}</li>
          <li>Valid Polygons: {hotspotCounts.validPolygons}</li>
        </ul>
      </div>
      
      {/* Video info section */}
      <div className="section">
        <strong>Video Dimensions:</strong>
        <ul>
          <li>Display: {formatNumber(videoDimensions.width)}×{formatNumber(videoDimensions.height)}</li>
          <li>Natural: {formatNumber(videoDimensions.naturalWidth)}×{formatNumber(videoDimensions.naturalHeight)}</li>
          <li>Aspect: {formatNumber(videoDimensions.aspectRatio)} (display), {formatNumber(videoDimensions.naturalAspect)} (natural)</li>
        </ul>
      </div>
      
      {/* Display area info */}
      <div className="section">
        <strong>Display Area:</strong>
        <ul>
          <li>Size: {formatNumber(displayArea.width)}×{formatNumber(displayArea.height)}</li>
          <li>Offset: ({formatNumber(displayArea.offsetX)}, {formatNumber(displayArea.offsetY)})</li>
          <li>Container: {formatNumber(displayArea.containerWidth)}×{formatNumber(displayArea.containerHeight)}</li>
          <li>Fallback: {displayArea.isFallback ? 'Yes' : 'No'}</li>
        </ul>
      </div>
      
      {/* SVG info */}
      <div className="section">
        <strong>SVG Info:</strong>
        <ul>
          <li>ViewBox: {svgViewBox}</li>
        </ul>
      </div>
      
      {/* Cache info */}
      <div className="section">
        <strong>Caching Info:</strong>
        <ul>
          <li>Service Worker: {cacheInfo.serviceWorkerActive ? 'Active' : 'Inactive'}</li>
          <li>Cache Storage: {cacheInfo.cachedResources} items</li>
          <li>Cache Names: {cacheInfo.cacheNames.length > 0 ? 
            cacheInfo.cacheNames.join(', ') : 'None found'}</li>
        </ul>
      </div>
      
      <div className="keyboard-hint">
        Press Ctrl+Shift+D to toggle debug mode
      </div>
    </div>
  );
};

export default DebugPanel; 
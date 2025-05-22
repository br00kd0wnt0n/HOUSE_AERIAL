import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  svgViewBox,
  currentVideo,
  currentLocationId,
  locations,
  currentLocation
}) => {
  const navigate = useNavigate();
  
  // State to track caching info
  const [cacheInfo, setCacheInfo] = useState({
    serviceWorkerActive: false,
    cachedResources: 0,
    cacheNames: []
  });
  
  // Handle return to main menu
  const handleReturnToMainMenu = useCallback((e) => {
    // Stop propagation to prevent click from being handled by parent elements
    e.stopPropagation();
    
    logger.info(MODULE, 'Returning to main menu via debug button');
    navigate('/');
  }, [navigate]);
  
  // Function to fetch caching information
  useEffect(() => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      const checkSwStatus = () => {
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
      };
      
      // Initial check
      checkSwStatus();
      
      // Set up interval to check periodically
      const intervalId = setInterval(checkSwStatus, 5000);
      
      // Cleanup function
      return () => {
        clearInterval(intervalId);
      };
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
  
  // Get location info
  const getLocationInfo = () => {
    if (!locations || locations.length === 0) {
      return { total: 0, current: null };
    }
    
    // If we have a direct currentLocation object, use that
    if (currentLocation) {
      return {
        total: locations.length,
        current: currentLocation
      };
    }
    
    // Otherwise look it up from the locations array
    const foundLocation = locations.find(loc => loc._id === currentLocationId);
    
    return {
      total: locations.length,
      current: foundLocation
    };
  };
  
  const locationInfo = getLocationInfo();
  
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
          <li>Current: {currentVideo || 'unknown'}</li>
        </ul>
      </div>
      
      {/* Location info section */}
      <div className="section">
        <strong>Locations:</strong>
        <ul>
          <li>Total: {locationInfo.total}</li>
          <li>Current: {locationInfo.current ? locationInfo.current.name : 'Unknown'}</li>
          <li>Current ID: {currentLocationId || 'Not set'}</li>
        </ul>
        {locationInfo.current && locationInfo.current.description && (
          <div className="location-description">
            <strong>Description:</strong>
            <p>{locationInfo.current.description}</p>
          </div>
        )}
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
      
      {/* Debug Actions */}
      <div className="section actions" onClick={(e) => e.stopPropagation()}>
        <strong>Actions:</strong>
        <div className="debug-buttons" onClick={(e) => e.stopPropagation()}>
          <button 
            className="debug-button primary"
            onClick={handleReturnToMainMenu}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Return to Main Menu
          </button>
        </div>
      </div>
      
      <div className="keyboard-hint">
        Press Ctrl+Shift+D to toggle debug mode
      </div>
    </div>
  );
};

export default DebugPanel; 
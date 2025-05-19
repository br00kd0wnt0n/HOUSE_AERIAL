import { useState, useCallback, useEffect, useRef } from 'react';

// Netflix theme colors
const COLORS = {
  PRIMARY: '#E50914', // Netflix red
  SECONDARY: '#6D28D9', // A purple that complements Netflix theme
  SELECTED: '#ffffff',
  HOVER: '#FFA500' // Orange for hover state
};

// Helper function to draw a polygon
const drawPolygon = (ctx, points, fillColor, strokeColor, shouldClosePath = true) => {
  if (!points || points.length === 0) return;

  const canvas = ctx.canvas;
  
  // Verify canvas has valid dimensions
  if (canvas.width === 0 || canvas.height === 0) {
    console.warn("Invalid canvas dimensions, skipping polygon drawing");
    return;
  }
  
  // Always draw the points regardless of how many
  points.forEach((point, index) => {
    ctx.beginPath();
    // Make first point slightly larger
    const radius = index === 0 ? 6 : 5;
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    
    // Skip if coordinates are invalid
    if (isNaN(x) || isNaN(y)) {
      console.warn(`Invalid coordinate at point ${index}: (${point.x}, ${point.y})`);
      return;
    }
    
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    
    // Add point number for clarity
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(index + 1, x + 8, y + 4);
    ctx.fillStyle = strokeColor;
  });
  
  // Draw lines between points if we have at least 2 points
  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
    
    for (let i = 1; i < points.length; i++) {
      const x = points[i].x * canvas.width;
      const y = points[i].y * canvas.height;
      
      // Skip if coordinates are invalid
      if (isNaN(x) || isNaN(y)) continue;
      
      ctx.lineTo(x, y);
    }
    
    // Only close the path automatically if shouldClosePath is true and we have enough points
    if (shouldClosePath && points.length >= 3) {
      // Check if we need to explicitly close the polygon
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      
      // Only draw the closing line if the first and last points are not the same
      if (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y) {
        // Draw explicit line back to the first point
        ctx.lineTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
        console.log("Drawing explicit closing line in drawPolygon");
      }
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Only fill the polygon if we have at least 3 points and shouldClosePath is true
  if (shouldClosePath && points.length >= 3) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
    
    for (let i = 1; i < points.length; i++) {
      const x = points[i].x * canvas.width;
      const y = points[i].y * canvas.height;
      
      // Skip if coordinates are invalid
      if (isNaN(x) || isNaN(y)) continue;
      
      ctx.lineTo(x, y);
    }
    
    // Always ensure the path is closed for filling
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
};

const useHotspotDrawing = (canvasRef, hotspots, selectedHotspot, hotspotForm, selectHotspot, drawingMode, setDrawingMode, points, setPoints, showDraftPolygon = false, externalHoveredHotspot = undefined, externalSetHoveredHotspot = undefined) => {
  // Use external hover state if provided, otherwise use local state
  const [internalHoveredHotspot, setInternalHoveredHotspot] = useState(null);
  const hoveredHotspot = externalHoveredHotspot !== undefined ? externalHoveredHotspot : internalHoveredHotspot;
  const setHoveredHotspot = externalSetHoveredHotspot || setInternalHoveredHotspot;
  
  const [editingPoints, setEditingPoints] = useState(false);
  // Add a flag to prevent recursive redraws
  const isRedrawingRef = useRef(false);
  // Add a timestamp ref for tracking when redrawing flag was set
  const redrawingTimestampRef = useRef(0);
  // Add a ref for throttling hover events
  const hoverThrottleRef = useRef({
    lastHover: 0,
    lastHotspot: null,
    pendingUpdate: false,
    timeSinceHover: 0 // Add a timestamp to track when the hover state last changed
  });

  // Utility function to check if a point is inside a polygon
  const isPointInPolygon = useCallback((point, polygon) => {
    if (!polygon || polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }, []);

  // Draw existing hotspots
  const drawExistingHotspots = useCallback((force = false, isHoverUpdate = false) => {
    // Early return check
    if (!canvasRef.current || (isRedrawingRef.current && !force)) return;
    
    // Set flag to prevent recursive redraws
    isRedrawingRef.current = true;
    redrawingTimestampRef.current = Date.now();
    
    const canvas = canvasRef.current;
    
    // Skip if canvas has invalid dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn("Invalid canvas dimensions, skipping hotspot drawing");
      isRedrawingRef.current = false;
      return;
    }
    
    try {
      const ctx = canvas.getContext('2d');
      
      // Clear canvas - always start with a fresh canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isHoverUpdate) {
        console.log(`Drawing hotspots on canvas: ${canvas.width}x${canvas.height}, forced: ${force}`);
      }
      
      // End here if there are no hotspots to draw
      if (!hotspots || hotspots.length === 0) {
        // Draw current polygon if we're in drawing mode or if we should show draft polygon
        if ((drawingMode || showDraftPolygon) && points.length > 0) {
          // Ensure draft polygon uses the correct color based on hotspotForm.type
          const fillColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          const strokeColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          drawPolygon(ctx, points, fillColor, strokeColor);
          
          // Log the type for debugging
          if (!isHoverUpdate) {
            console.log(`Drawing draft polygon with type: ${hotspotForm.type}, color: ${fillColor}`);
          }
        }
        
        // Create a "draw complete" flag to allow pin drawing but prevent loops
        const drawComplete = { value: true, timestamp: Date.now() };
        // Store the timestamp on the canvas element to track the last draw
        canvas._lastDrawTime = drawComplete.timestamp;
        
        // For hover updates, we don't want to redraw map pins
        if (!isHoverUpdate) {
          // Dispatch event directly - no requestAnimationFrame to avoid loop
          canvas.dispatchEvent(new CustomEvent('drawMapPin', { 
            detail: { 
              timestamp: drawComplete.timestamp, 
              source: 'drawExistingHotspots-empty',
              complete: true,
              force: force,
              isHoverUpdate: isHoverUpdate
            }
          }));
        }
        
        return;
      }
      
      // Draw each hotspot
      if (hotspots && Array.isArray(hotspots)) {
        hotspots.forEach((hotspot, index) => {
          const isSelected = selectedHotspot && selectedHotspot._id === hotspot._id;
          const isHovered = hoveredHotspot && hoveredHotspot._id === hotspot._id;
          
          // Check if coordinates exist
          if (!hotspot.coordinates || !Array.isArray(hotspot.coordinates) || hotspot.coordinates.length === 0) {
            return; // Skip this hotspot if no coordinates
          }
          
          // Select color based on state and type
          const fillColor = isSelected ? COLORS.SELECTED : 
                          isHovered ? COLORS.HOVER : 
                          hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          
          const strokeColor = isSelected ? COLORS.SELECTED : 
                            isHovered ? COLORS.HOVER : 
                            hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          
          // Start a new path for this hotspot
          ctx.beginPath();
          
          // Start from the first point
          if (hotspot.coordinates.length > 0) {
            const x = hotspot.coordinates[0].x * canvas.width;
            const y = hotspot.coordinates[0].y * canvas.height;
            
            // Skip if coordinates are invalid
            if (!isNaN(x) && !isNaN(y)) {
              ctx.moveTo(x, y);
            } else {
              console.warn(`Invalid coordinate at hotspot ${index}, point 0: (${hotspot.coordinates[0].x}, ${hotspot.coordinates[0].y})`);
              return; // Skip this hotspot if the first point is invalid
            }
          }
          
          // Add each point to the path
          let hasValidPoints = true;
          for (let i = 1; i < hotspot.coordinates.length; i++) {
            const x = hotspot.coordinates[i].x * canvas.width;
            const y = hotspot.coordinates[i].y * canvas.height;
            
            // Skip if coordinates are invalid
            if (isNaN(x) || isNaN(y)) {
              console.warn(`Invalid coordinate at hotspot ${index}, point ${i}: (${hotspot.coordinates[i].x}, ${hotspot.coordinates[i].y})`);
              hasValidPoints = false;
              break;
            }
            
            ctx.lineTo(x, y);
          }
          
          // Only continue if we have valid points
          if (hasValidPoints) {
            // Close the path
            ctx.closePath();
            
            // Draw filled polygon with semi-transparency
            ctx.save();
            ctx.fillStyle = fillColor;
            ctx.globalAlpha = isSelected ? 0.4 : isHovered ? 0.5 : 0.3;
            ctx.fill();
            ctx.restore();
            
            // Draw the border with full opacity
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isSelected || isHovered ? 3 : 2;
            ctx.globalAlpha = 1.0;
            ctx.stroke();
            ctx.restore();
            
            // Draw points only if selected or hovered
            if (isSelected || isHovered) {
              ctx.save();
              ctx.fillStyle = strokeColor;
              ctx.globalAlpha = 1.0;
              
              hotspot.coordinates.forEach(point => {
                const x = point.x * canvas.width;
                const y = point.y * canvas.height;
                
                // Skip if coordinates are invalid
                if (isNaN(x) || isNaN(y)) return;
                
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
              });
              ctx.restore();
            }
          }
        });
      }
      
      // Draw current polygon if we're in drawing mode or if we should show draft polygon - with higher z-index
      if ((drawingMode || showDraftPolygon) && points.length > 0) {
        ctx.save();
        ctx.globalAlpha = 1.0; // Full opacity for active drawing
        
        // Ensure draft polygon uses the correct color based on hotspotForm.type
        const fillColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
        const strokeColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
        
        // When in drawing mode, only auto-close the path if we have 3+ points
        const shouldClose = points.length >= 3;
        drawPolygon(ctx, points, fillColor, strokeColor, shouldClose);
        
        // Log the type for debugging
        if (!isHoverUpdate) {
          console.log(`Drawing active polygon with type: ${hotspotForm.type}, color: ${fillColor}, shouldClose: ${shouldClose}`);
        }
        
        ctx.restore();
      }
      
      // Create a timestamp and store it to prevent re-rendering loops
      const drawTimestamp = Date.now();
      canvas._lastDrawTime = drawTimestamp;
      
      // Only dispatch the drawMapPin event if this is not a hover-only update
      if (!isHoverUpdate) {
        // Dispatch event directly - no requestAnimationFrame to avoid loop
        canvas.dispatchEvent(new CustomEvent('drawMapPin', { 
          detail: { 
            timestamp: drawTimestamp, 
            source: 'drawExistingHotspots-complete', 
            count: hotspots?.length || 0,
            complete: true,
            force: force,
            isHoverUpdate: isHoverUpdate
          }  
        }));
      }
    } catch (error) {
      console.error("Error during hotspot drawing:", error);
    } finally {
      // IMPORTANT: Always reset the flag, even if there was an error
      isRedrawingRef.current = false;
    }
  }, [hotspots, selectedHotspot, drawingMode, points, hoveredHotspot, canvasRef, showDraftPolygon, hotspotForm]);

  // Setup to redraw when the canvas is resized
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    // Initialize last draw time if needed
    if (!canvas._lastDrawTime) {
      canvas._lastDrawTime = 0;
    }
    
    // Function to handle the custom drawMapPin event
    const handleMapPinDraw = (event) => {
      // Check if we're already in the middle of redrawing to prevent infinite loops
      if (isRedrawingRef.current) return;
      
      // Check if this is a duplicate or old event (within 50ms)
      const now = Date.now();
      const eventTime = event.detail?.timestamp || now;
      const timeSinceLastDraw = now - canvas._lastDrawTime;
      
      // Skip if this is an old event or we just did a draw recently (debounce)
      // unless it's a forced redraw (when returning to the page)
      if (!event.detail?.force && (eventTime < canvas._lastDrawTime || timeSinceLastDraw < 50)) {
        console.log(`Skipping map pin draw event to prevent loop: age=${now - eventTime}ms, timeSinceLastDraw=${timeSinceLastDraw}ms`);
        return;
      }
      
      // Log with timestamp to help debug event flow
      console.log(`Map pin draw event received at ${eventTime}, source: ${event.detail?.source || 'unknown'}, redrawing hotspots`);
      
      // Only do a full redraw if this is not already a "complete" event
      // or if it's a forced redraw
      if (event.detail?.force || !event.detail?.complete) {
        // Add a minimal delay to ensure the canvas is ready but prevent visible flicker
        setTimeout(() => {
          drawExistingHotspots(event.detail?.force);
        }, 10); // Shorter delay for better performance
      }
    };
    
    // Listen for the map pin draw event
    canvas.addEventListener('drawMapPin', handleMapPinDraw);
    
    // Handle forced map pin redraw event (when returning to the page)
    const handleForceMapPin = (event) => {
      console.log("Force redraw event received in useHotspotDrawing");
      if (isRedrawingRef.current) return;
      
      setTimeout(() => {
        drawExistingHotspots(true);
      }, 20);
    };
    
    canvas.addEventListener('forceMapPinDraw', handleForceMapPin);
    
    // Add a window resize handler to ensure proper drawing
    const handleResize = () => {
      console.log("Window resize detected in useHotspotDrawing");
      
      // Use debouncing for resize events to prevent too many redraws
      if (canvas._resizeTimer) {
        clearTimeout(canvas._resizeTimer);
      }
      
      canvas._resizeTimer = setTimeout(() => {
        drawExistingHotspots(true);
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle visibility change (switching tabs or coming back to the page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible, redrawing hotspots");
        
        // Use a delay to ensure everything is ready
        setTimeout(() => {
          if (canvasRef.current) {
            drawExistingHotspots(true);
          }
        }, 200);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial forced draw after component mount
    setTimeout(() => {
      if (canvasRef.current && hotspots && hotspots.length > 0) {
        console.log("Initial forced hotspot draw after mount");
        drawExistingHotspots(true);
      }
    }, 200);
    
    return () => {
      canvas.removeEventListener('drawMapPin', handleMapPinDraw);
      canvas.removeEventListener('forceMapPinDraw', handleForceMapPin);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (canvas._resizeTimer) {
        clearTimeout(canvas._resizeTimer);
      }
    };
  }, [canvasRef, drawExistingHotspots, hotspots]);

  // Add a watchdog effect to reset the flag if it gets stuck
  useEffect(() => {
    const watchdogTimer = setInterval(() => {
      if (isRedrawingRef.current) {
        const timeSinceSet = Date.now() - redrawingTimestampRef.current;
        if (timeSinceSet > 3000) { // 3 seconds is way too long for any redraw
          console.warn(`isRedrawingRef has been stuck for ${timeSinceSet}ms, resetting it`);
          isRedrawingRef.current = false;
        }
      }
    }, 1000);
    
    return () => clearInterval(watchdogTimer);
  }, []);
  
  // Add a hover watchdog effect to ensure hover states don't get stuck
  useEffect(() => {
    const hoverWatchdogTimer = setInterval(() => {
      // Reset pendingUpdate if it's been set for too long
      if (hoverThrottleRef.current.pendingUpdate) {
        const now = Date.now();
        const timeSinceLastHover = now - hoverThrottleRef.current.lastHover;
        
        if (timeSinceLastHover > 500) { // 500ms is too long for a pending hover update
          console.warn(`Hover pendingUpdate has been stuck for ${timeSinceLastHover}ms, resetting it`);
          hoverThrottleRef.current.pendingUpdate = false;
        }
      }
    }, 500);
    
    return () => clearInterval(hoverWatchdogTimer);
  }, []);

  // Add handler for mouse leave events to reset hover state
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Capture canvas ref value for cleanup
    const canvas = canvasRef.current;
    
    const handleMouseLeave = () => {
      // Reset hover state when mouse leaves the canvas
      if (hoveredHotspot) {
        setHoveredHotspot(null);
        
        // Reset cursor style
        if (canvas && canvas.style) {
          canvas.style.cursor = drawingMode ? 'crosshair' : 'default';
        }
        
        // Force a redraw to clear hover effects
        drawExistingHotspots(false, true);
      }
      
      // Reset all hover-related flags
      hoverThrottleRef.current.pendingUpdate = false;
      hoverThrottleRef.current.lastHotspot = null;
    };
    
    // Add mouse leave event listener to the canvas
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      // Use captured canvas value in cleanup
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, hoveredHotspot, setHoveredHotspot, drawingMode, drawExistingHotspots]);

  // Update canvas hover handler for better performance
  const handleCanvasHover = useCallback((e) => {
    // Skip hover detection in drawing mode
    if (drawingMode || !canvasRef.current) return;
    
    // Implement throttling to avoid excessive redraws on hover
    const now = Date.now();
    const throttleInterval = 25; // ms between hover updates
    
    if (now - hoverThrottleRef.current.lastHover < throttleInterval) {
      // If we're inside the throttle interval, store the intent but don't process yet
      if (!hoverThrottleRef.current.pendingUpdate) {
        hoverThrottleRef.current.pendingUpdate = true;
        setTimeout(() => {
          if (hoverThrottleRef.current.pendingUpdate) {
            // Process the most recent hover position
            hoverThrottleRef.current.pendingUpdate = false;
            hoverThrottleRef.current.lastHover = Date.now();
            // Re-trigger the hover handler with the latest event
            handleCanvasHover(e);
          }
        }, throttleInterval);
      }
      return;
    }
    
    // Update last hover time
    hoverThrottleRef.current.lastHover = now;
    hoverThrottleRef.current.pendingUpdate = false;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get the video element to ensure we're always working relative to the video dimensions
    let videoRect = rect;
    const videoElement = canvas.parentElement.querySelector('video');
    if (videoElement) {
      videoRect = videoElement.getBoundingClientRect();
      
      // If mouse is outside the video area, ignore it
      if (
        e.clientX < videoRect.left || 
        e.clientX > videoRect.right || 
        e.clientY < videoRect.top || 
        e.clientY > videoRect.bottom
      ) {
        return;
      }
    }
    
    // Calculate relative position within the video (0-1)
    const mousePoint = {
      x: (e.clientX - videoRect.left) / videoRect.width,
      y: (e.clientY - videoRect.top) / videoRect.height
    };
    
    // Check if cursor is over any hotspot
    let foundHotspot = null;
    if (hotspots && Array.isArray(hotspots)) {
      // Check in reverse order so the most recently created hotspot is checked first
      for (let i = hotspots.length - 1; i >= 0; i--) {
        const hotspot = hotspots[i];
        if (hotspot.coordinates && hotspot.coordinates.length >= 3) {
          if (isPointInPolygon(mousePoint, hotspot.coordinates)) {
            foundHotspot = hotspot;
            break;
          }
        }
      }
    }
    
    // If hovering over the same hotspot, don't trigger redraw
    if (foundHotspot && hoveredHotspot && foundHotspot._id === hoveredHotspot._id) {
      return;
    }
    
    // If moving from no hotspot to no hotspot, don't trigger redraw
    if (!foundHotspot && !hoveredHotspot) {
      return;
    }
    
    // Update hovered hotspot if changed
    if (foundHotspot !== hoveredHotspot) {
      setHoveredHotspot(foundHotspot);
      
      // Change cursor style
      if (canvas.style) {
        canvas.style.cursor = foundHotspot ? 'pointer' : drawingMode ? 'crosshair' : 'default';
      }
      
      // Store the current hovered hotspot for comparison
      hoverThrottleRef.current.lastHotspot = foundHotspot;
      
      // Redraw with hover effect but don't trigger map pin redraw
      drawExistingHotspots(false, true);
    }
  }, [drawingMode, canvasRef, hotspots, hoveredHotspot, isPointInPolygon, drawExistingHotspots, setHoveredHotspot]);

  // Handle clicks on existing hotspots
  const handleHotspotClick = useCallback((e) => {
    // Only handle clicks when not in drawing mode
    if (drawingMode || !canvasRef.current || !selectHotspot) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get the video element to ensure we're always working relative to the video dimensions
    let videoRect = rect;
    const videoElement = canvas.parentElement.querySelector('video');
    if (videoElement) {
      videoRect = videoElement.getBoundingClientRect();
      
      // If click is outside the video area, ignore it
      if (
        e.clientX < videoRect.left || 
        e.clientX > videoRect.right || 
        e.clientY < videoRect.top || 
        e.clientY > videoRect.bottom
      ) {
        console.log('Click outside video area, ignoring');
        return false;
      }
    }
    
    // Calculate relative position within the video (0-1)
    const clickPoint = {
      x: (e.clientX - videoRect.left) / videoRect.width,
      y: (e.clientY - videoRect.top) / videoRect.height
    };
    
    console.log('Hotspot click at relative coords:', clickPoint);
    
    // Check if user clicked on a hotspot
    if (hotspots && Array.isArray(hotspots)) {
      // Check hotspots in reverse order (top to bottom)
      for (let i = hotspots.length - 1; i >= 0; i--) {
        const hotspot = hotspots[i];
        if (hotspot.coordinates && hotspot.coordinates.length >= 3) {
          if (isPointInPolygon(clickPoint, hotspot.coordinates)) {
            // Call the select function from props
            selectHotspot(hotspot);
            return true; // Indicate we handled the click
          }
        }
      }
    }
    
    return false; // Click wasn't on a hotspot
  }, [drawingMode, canvasRef, hotspots, isPointInPolygon, selectHotspot]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    setPoints([]);
    setDrawingMode(false);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    // Redraw existing hotspots
    drawExistingHotspots();
  }, [setPoints, setDrawingMode, canvasRef, drawExistingHotspots]);

  // Function to remove the last added point
  const undoLastPoint = useCallback(() => {
    if (points.length === 0) return;
    
    // Remove the last point
    setPoints(prevPoints => {
      const newPoints = prevPoints.slice(0, -1);
      console.log(`Undoing last point, now have ${newPoints.length} points`);
      
      // Use a more robust approach to ensure state has updated before redrawing
      setTimeout(() => {
        if (canvasRef.current) {
          // First completely clear the main canvas to remove any ghost shapes
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Also clear the map pins canvas if it exists
          if (canvas.parentElement) {
            const mapPinsCanvas = canvas.parentElement.querySelector('canvas:nth-child(2)');
            if (mapPinsCanvas) {
              const mapPinsCtx = mapPinsCanvas.getContext('2d');
              mapPinsCtx.clearRect(0, 0, mapPinsCanvas.width, mapPinsCanvas.height);
            }
          }
          
          // We need to manually update the local points here to ensure proper redraw
          // since the React state update might not be reflected yet
          ctx.save();
          
          // First draw existing hotspots with lower opacity
          if (hotspots && Array.isArray(hotspots)) {
            hotspots.forEach(hotspot => {
              if (!selectedHotspot || selectedHotspot._id !== hotspot._id) {
                // Skip if no coordinates or invalid
                if (!hotspot.coordinates || !Array.isArray(hotspot.coordinates) || hotspot.coordinates.length < 3) {
                  return;
                }
                
                // Draw with reduced opacity
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
                ctx.strokeStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
                
                // Draw filled shape
                ctx.beginPath();
                ctx.moveTo(hotspot.coordinates[0].x * canvas.width, hotspot.coordinates[0].y * canvas.height);
                
                for (let i = 1; i < hotspot.coordinates.length; i++) {
                  ctx.lineTo(hotspot.coordinates[i].x * canvas.width, hotspot.coordinates[i].y * canvas.height);
                }
                
                // Close the shape
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              }
            });
          }
          
          // Reset opacity for drawing current points
          ctx.globalAlpha = 1.0;
          
          // Only draw the updated points if there are any, and don't close the path
          if (newPoints.length > 0) {
            // Use the existing colors but explicitly set shouldClosePath to false
            const fillColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
            const strokeColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
            
            // Never automatically close the path when undoing points
            const shouldClose = false;
            drawPolygon(ctx, newPoints, fillColor, strokeColor, shouldClose);
          }
          
          ctx.restore();
        }
      }, 50); // Small delay to ensure React state has updated
      
      return newPoints;
    });
  }, [points.length, setPoints, canvasRef, hotspots, selectedHotspot, hotspotForm]);

  // Handle canvas click for adding points
  const handleCanvasClick = useCallback((e) => {
    // First check if we should handle hotspot selection instead
    if (!drawingMode) {
      return handleHotspotClick(e);
    }
    
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get the video element to ensure we're always working relative to the video dimensions
    let videoRect = rect;
    const videoElement = canvas.parentElement.querySelector('video');
    if (videoElement) {
      videoRect = videoElement.getBoundingClientRect();
      
      // If click is outside the video area, ignore it
      if (
        e.clientX < videoRect.left || 
        e.clientX > videoRect.right || 
        e.clientY < videoRect.top || 
        e.clientY > videoRect.bottom
      ) {
        console.log('Click outside video area, ignoring');
        return false;
      }
    }
    
    // Calculate relative position within the video (0-1)
    const x = (e.clientX - videoRect.left) / videoRect.width;
    const y = (e.clientY - videoRect.top) / videoRect.height;
    
    console.log(`Canvas click at relative coords: (${x.toFixed(4)}, ${y.toFixed(4)})`);
    
    // Check if clicking near the first point to close the loop
    if (points.length >= 2) {
      const firstPoint = points[0];
      // Calculate distance to first point (using 0.02 as threshold, which is 2% of canvas width/height)
      const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
      
      if (distance < 0.02) {
        // Close the loop - calling function will be provided through finishDrawingCallback
        return true; // Signal to finish drawing
      }
    }
    
    // Add point immediately and draw it
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);
    
    // Draw the point immediately instead of waiting for state update
    if (canvasRef.current) {
      const ctx = canvas.getContext('2d');
      
      // Clear canvas COMPLETELY to prevent ghost artifacts
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw existing hotspots faded
      if (hotspots && Array.isArray(hotspots)) {
        hotspots.forEach(hotspot => {
          if (!selectedHotspot || selectedHotspot._id !== hotspot._id) {
            // Skip if no coordinates or invalid
            if (!hotspot.coordinates || !Array.isArray(hotspot.coordinates) || hotspot.coordinates.length < 3) {
              return;
            }
            
            // Draw with reduced opacity
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
            ctx.strokeStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
            
            // Draw filled shape
            ctx.beginPath();
            ctx.moveTo(hotspot.coordinates[0].x * canvas.width, hotspot.coordinates[0].y * canvas.height);
            
            for (let i = 1; i < hotspot.coordinates.length; i++) {
              ctx.lineTo(hotspot.coordinates[i].x * canvas.width, hotspot.coordinates[i].y * canvas.height);
            }
            
            // Close the shape
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        });
      }
      
      // Reset opacity for drawing current points
      ctx.globalAlpha = 1.0;
      
      // Use the drawPolygon helper for consistent rendering
      const fillColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
      const strokeColor = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
      
      // Don't auto-close the path during drawing
      const shouldClose = newPoints.length >= 3;
      drawPolygon(ctx, newPoints, fillColor, strokeColor, shouldClose);
      
      // If more than 2 points, show a hint to close the loop by highlighting the first point
      if (newPoints.length >= 2) {
        const firstPoint = newPoints[0];
        // Draw a subtle highlight around the first point
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(firstPoint.x * canvas.width, firstPoint.y * canvas.height, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
      
      // Log what's being drawn for debugging
      console.log(`Drawing ${newPoints.length} points, filled: ${newPoints.length >= 3}, type: ${hotspotForm.type}`);
      
      // Trigger map pin drawing event to ensure proper coordination
      canvas.dispatchEvent(new CustomEvent('drawMapPin', { 
        detail: { 
          timestamp: Date.now(), 
          source: 'handleCanvasClick',
          complete: true
        }
      }));
    }
    
    return false; // Signal to continue drawing
  }, [drawingMode, canvasRef, points, hotspots, selectedHotspot, hotspotForm, handleHotspotClick, setPoints]);

  // Draw closing line and finalize shape
  const finishDrawing = useCallback(() => {
    if (points.length < 3 || !canvasRef.current) return;
    
    // Add the first point to the end of the points array to close the loop
    // Only if the first and last points are different
    if (points.length >= 3 && 
        (points[0].x !== points[points.length - 1].x || 
         points[0].y !== points[points.length - 1].y)) {
      
      console.log("Adding first point to close the polygon loop");
      setPoints(currentPoints => [...currentPoints, { ...currentPoints[0] }]);
    }
    
    // Draw closing line on canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // First, completely clear both canvases to prevent ghost artifacts
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Also clear the map pins canvas if it exists
    if (canvas.parentElement) {
      const mapPinsCanvas = canvas.parentElement.querySelector('canvas:nth-child(2)');
      if (mapPinsCanvas) {
        const mapPinsCtx = mapPinsCanvas.getContext('2d');
        mapPinsCtx.clearRect(0, 0, mapPinsCanvas.width, mapPinsCanvas.height);
      }
    }
    
    // Force a clean state by explicitly triggering a clearOnly map pins event
    canvas.dispatchEvent(new CustomEvent('forceMapPinDraw', {
      detail: {
        timestamp: Date.now(),
        source: 'finishDrawing-pre-clear',
        clearOnly: true,
        force: true
      }
    }));
    
    // Redraw everything including other hotspots
    drawExistingHotspots(true);
  }, [points, canvasRef, drawExistingHotspots, setPoints]);

  return {
    points,
    setPoints,
    drawingMode,
    setDrawingMode,
    editingPoints,
    setEditingPoints,
    hoveredHotspot,
    setHoveredHotspot,
    drawExistingHotspots,
    cancelDrawing,
    undoLastPoint,
    handleCanvasClick,
    handleCanvasHover,
    finishDrawing
  };
};

export default useHotspotDrawing; 
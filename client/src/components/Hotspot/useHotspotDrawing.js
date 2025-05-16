import { useState, useCallback } from 'react';

// Netflix theme colors
const COLORS = {
  PRIMARY: '#E50914', // Netflix red
  SECONDARY: '#6D28D9', // A purple that complements Netflix theme
  SELECTED: '#ffffff',
  HOVER: '#FFA500' // Orange for hover state
};

const useHotspotDrawing = (canvasRef, hotspots, selectedHotspot, hotspotForm, selectHotspot, drawingMode, setDrawingMode, points, setPoints) => {
  const [editingPoints, setEditingPoints] = useState(false);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

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
  const drawExistingHotspots = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each hotspot
    if (hotspots && Array.isArray(hotspots)) {
      hotspots.forEach(hotspot => {
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
        
        // Draw filled polygon with semi-transparency
        ctx.globalAlpha = isSelected ? 0.4 : isHovered ? 0.5 : 0.3;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        
        // Start from the first point
        if (hotspot.coordinates.length > 0) {
          ctx.moveTo(hotspot.coordinates[0].x * canvas.width, hotspot.coordinates[0].y * canvas.height);
        }
        
        // Add each point to the path
        for (let i = 1; i < hotspot.coordinates.length; i++) {
          ctx.lineTo(hotspot.coordinates[i].x * canvas.width, hotspot.coordinates[i].y * canvas.height);
        }
        
        // Close the path
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Draw the border
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isSelected || isHovered ? 3 : 2;
        ctx.stroke();
        
        // Draw points only if selected or hovered
        if (isSelected || isHovered) {
          ctx.fillStyle = strokeColor;
          hotspot.coordinates.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
    }
  }, [hotspots, selectedHotspot, canvasRef, hoveredHotspot]);

  // Handle canvas mousemove for hover detection
  const handleCanvasHover = useCallback((e) => {
    // Skip hover detection in drawing mode
    if (drawingMode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate relative position (0-1)
    const mousePoint = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
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
    
    // Update hovered hotspot if changed
    if (foundHotspot !== hoveredHotspot) {
      setHoveredHotspot(foundHotspot);
      
      // Change cursor style
      if (canvas.style) {
        canvas.style.cursor = foundHotspot ? 'pointer' : drawingMode ? 'crosshair' : 'default';
      }
      
      // Redraw with hover effect
      drawExistingHotspots();
    }
  }, [drawingMode, canvasRef, hotspots, hoveredHotspot, isPointInPolygon, drawExistingHotspots]);

  // Handle clicks on existing hotspots
  const handleHotspotClick = useCallback((e) => {
    // Only handle clicks when not in drawing mode
    if (drawingMode || !canvasRef.current || !selectHotspot) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate relative position (0-1)
    const clickPoint = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
    
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
      
      // Wait until state is updated before redrawing
      setTimeout(() => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw existing hotspots faded
          if (hotspots && Array.isArray(hotspots)) {
            hotspots.forEach(hotspot => {
              if (!selectedHotspot || selectedHotspot._id !== hotspot._id) {
                // Draw with reduced opacity
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
                ctx.strokeStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
                
                // Draw hotspot coordinates if they exist
                if (hotspot.coordinates && hotspot.coordinates.length > 0) {
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
                
                ctx.globalAlpha = 1.0; // Reset opacity
              }
            });
          }
          
          // Set style for current shape
          ctx.fillStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          ctx.strokeStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          ctx.lineWidth = 2;
          
          // If no points after removing, nothing to draw
          if (newPoints.length === 0) return;
          
          // Draw all points with numbers
          newPoints.forEach((point, index) => {
            ctx.beginPath();
            // Make the first point slightly larger to help users identify it for closing the loop
            const radius = index === 0 ? 6 : 5;
            ctx.arc(point.x * canvas.width, point.y * canvas.height, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add point number for clarity
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.fillText(index + 1, point.x * canvas.width + 8, point.y * canvas.height + 4);
            ctx.fillStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
          });
          
          // Draw lines connecting points
          if (newPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(newPoints[0].x * canvas.width, newPoints[0].y * canvas.height);
            
            for (let i = 1; i < newPoints.length; i++) {
              ctx.lineTo(newPoints[i].x * canvas.width, newPoints[i].y * canvas.height);
            }
            
            // Don't close the path automatically - only stroke the lines we drew
            ctx.stroke();
          }
        }
      }, 0);
      
      return newPoints;
    });
    
  }, [hotspots, selectedHotspot, hotspotForm, canvasRef, points.length, setPoints]);

  // Handle canvas click for adding points
  const handleCanvasClick = useCallback((e) => {
    // First check if we should handle hotspot selection instead
    if (!drawingMode) {
      return handleHotspotClick(e);
    }
    
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate relative position (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
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
      
      // Clear canvas and redraw from scratch for cleaner rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw existing hotspots faded
      if (hotspots && Array.isArray(hotspots)) {
        hotspots.forEach(hotspot => {
          if (!selectedHotspot || selectedHotspot._id !== hotspot._id) {
            // Draw with reduced opacity
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
            ctx.strokeStyle = hotspot.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
            
            // Draw hotspot coordinates if they exist
            if (hotspot.coordinates && hotspot.coordinates.length > 0) {
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
            
            ctx.globalAlpha = 1.0; // Reset opacity
          }
        });
      }
      
      // Set style for current shape
      ctx.fillStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
      ctx.strokeStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
      ctx.lineWidth = 2;
      
      // Draw all points with numbers
      newPoints.forEach((point, index) => {
        ctx.beginPath();
        // Make the first point slightly larger to help users identify it for closing the loop
        const radius = index === 0 ? 6 : 5;
        ctx.arc(point.x * canvas.width, point.y * canvas.height, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add point number for clarity
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(index + 1, point.x * canvas.width + 8, point.y * canvas.height + 4);
        ctx.fillStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
      });
      
      // Draw lines connecting points
      if (newPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(newPoints[0].x * canvas.width, newPoints[0].y * canvas.height);
        
        for (let i = 1; i < newPoints.length; i++) {
          ctx.lineTo(newPoints[i].x * canvas.width, newPoints[i].y * canvas.height);
        }
        
        ctx.stroke();
      }
      
      // If we have 3+ points, add semi-transparent fill
      if (newPoints.length >= 3) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
        ctx.beginPath();
        ctx.moveTo(newPoints[0].x * canvas.width, newPoints[0].y * canvas.height);
        
        for (let i = 1; i < newPoints.length; i++) {
          ctx.lineTo(newPoints[i].x * canvas.width, newPoints[i].y * canvas.height);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
      
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
    }
    
    return false; // Signal to continue drawing
  }, [drawingMode, canvasRef, points, hotspots, selectedHotspot, hotspotForm, handleHotspotClick, setPoints]);

  // Draw closing line and finalize shape
  const finishDrawing = useCallback(() => {
    if (points.length < 3 || !canvasRef.current) return;
    
    // Draw closing line on canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Connect last point to first point
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    ctx.strokeStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
    ctx.lineTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
    ctx.stroke();
    
    // Also add the fill for visual feedback
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = hotspotForm.type === 'PRIMARY' ? COLORS.PRIMARY : COLORS.SECONDARY;
    ctx.beginPath();
    ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }, [points, canvasRef, hotspotForm]);

  return {
    points,
    setPoints,
    drawingMode,
    setDrawingMode,
    editingPoints,
    setEditingPoints,
    drawExistingHotspots,
    cancelDrawing,
    undoLastPoint,
    handleCanvasClick,
    handleCanvasHover,
    finishDrawing
  };
};

export default useHotspotDrawing; 
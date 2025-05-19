import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { baseBackendUrl } from '../../utils/api';

const HotspotCanvas = ({
  videoRef,
  canvasRef,
  canvasContainerRef,
  aerialAsset,
  isLoadingAerial,
  useVideoFallback,
  videoLoaded,
  setVideoLoaded,
  handleVideoLoad,
  handleVideoError,
  videoKey,
  handleCanvasClick,
  handleCanvasHover,
  drawingMode,
  creationStep,
  getVideoUrl,
  selectedMapPin,
  points,
  hotspots
}) => {
  // Store video dimensions
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  // Add a flag to prevent recursive map pin redraws
  const isDrawingMapPinRef = useRef(false);
  // Add a timestamp ref for tracking when map pin drawing flag was set
  const mapPinDrawingTimestampRef = useRef(0);
  // Add a ref to track loaded map pin images
  const mapPinImagesRef = useRef({});
  // Add a reference for the map pins canvas
  const mapPinsCanvasRef = useRef(null);

  // Calculate center point of the hotspot for map pin display
  const centerPoint = useMemo(() => {
    // If no points are available, return null
    if (!points || points.length === 0) return null;
    
    // Calculate center point even if there are fewer than 3 points
    const sumX = points.reduce((acc, point) => acc + point.x, 0);
    const sumY = points.reduce((acc, point) => acc + point.y, 0);
    
    const center = {
      x: sumX / points.length,
      y: sumY / points.length
    };
    
    console.log("Calculated center point:", center, "from", points.length, "points");
    
    return center;
  }, [points]);

  // Force redraw of map pin when returning to the page with a valid step and map pin
  useEffect(() => {
    // Don't check creationStep - allow pins to be displayed in view mode too
    if (canvasRef.current && selectedMapPin && centerPoint) {
      console.log("Triggering map pin redraw due to selectedMapPin change", {
        pin: selectedMapPin.name,
        id: selectedMapPin._id,
        accessUrl: selectedMapPin.accessUrl
      });
      
      // Clear any cached map pin image to ensure we load the new one
      if (selectedMapPin._id && mapPinImagesRef.current[selectedMapPin._id]) {
        console.log("Clearing cached map pin image to force reload");
        delete mapPinImagesRef.current[selectedMapPin._id];
      }
      
      // Debounce this operation to prevent rapid consecutive redraws
      if (canvasRef.current._selectedPinTimeout) {
        clearTimeout(canvasRef.current._selectedPinTimeout);
      }
      
      // Use a single, debounced event instead of multiple timeouts
      canvasRef.current._selectedPinTimeout = setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.dispatchEvent(new CustomEvent('forceMapPinDraw', { 
            detail: { 
              timestamp: Date.now(),
              source: 'mapPinChange',
              force: true
            }
          }));
        }
      }, 200);
    }
  }, [selectedMapPin, canvasRef, centerPoint]);
  
  // Ensure canvas dimensions match the video dimensions
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !videoLoaded) return;
    
    const updateCanvasDimensions = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      if (!video || !canvas || !container) return;
      
      // Get the actual rendered dimensions of the video
      const videoRect = video.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Get natural video dimensions
      const naturalWidth = video.videoWidth || 0;
      const naturalHeight = video.videoHeight || 0;
      
      // Calculate aspect ratios
      const videoAspect = naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 16/9;
      const containerAspect = containerRect.width / containerRect.height;
      
      // Calculate display area based on object-fit: contain
      let displayWidth, displayHeight;
      
      if (containerAspect > videoAspect) {
        // Container is wider than video - constrained by height
        displayHeight = containerRect.height;
        displayWidth = displayHeight * videoAspect;
      } else {
        // Container is narrower than video - constrained by width
        displayWidth = containerRect.width;
        displayHeight = displayWidth / videoAspect;
      }
      
      // Only update if dimensions actually changed
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;
      const newWidth = videoRect.width;
      const newHeight = videoRect.height;
      
      if (Math.abs(oldWidth - newWidth) > 1 || Math.abs(oldHeight - newHeight) > 1) {
        // Set canvas dimensions to match video
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Also update map pins canvas dimensions
        if (mapPinsCanvasRef.current) {
          mapPinsCanvasRef.current.width = newWidth;
          mapPinsCanvasRef.current.height = newHeight;
        }
        
        // Store dimensions for future reference
        setVideoDimensions({ width: newWidth, height: newHeight });
        
        console.log(`Canvas resized from ${oldWidth}x${oldHeight} to ${newWidth}x${newHeight}`);
        
        // Force a complete redraw when dimensions change
        // Use timeout to ensure state updates have happened
        setTimeout(() => {
          // Dispatch a custom event to notify the canvas needs to be redrawn
          canvas.dispatchEvent(new CustomEvent('drawMapPin', { 
            detail: { timestamp: Date.now(), source: 'resize', dimensions: `${newWidth}x${newHeight}` }
          }));
        }, 50);
      }
    };
    
    // Update canvas dimensions immediately
    updateCanvasDimensions();
    
    // Use ResizeObserver for more reliable dimension updates
    const resizeObserver = new ResizeObserver((entries) => {
      console.log("Video size changed, updating canvas dimensions");
      // Wrap in requestAnimationFrame for better performance
      requestAnimationFrame(updateCanvasDimensions);
    });
    
    // Observe both the video element and its container for size changes
    if (videoRef.current) {
      resizeObserver.observe(videoRef.current);
    }
    
    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }
    
    // Also listen for window resize events as a fallback
    const handleResize = () => {
      console.log("Window resize detected, updating canvas dimensions");
      requestAnimationFrame(updateCanvasDimensions);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [videoLoaded, videoRef, canvasRef, canvasContainerRef, videoKey]);
  
  // Draw a visible center point marker for debugging
  useEffect(() => {
    if (!centerPoint || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ensure canvas has valid dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn("Invalid canvas dimensions, skipping center point drawing");
      return;
    }
    
    // Get pixel coordinates
    const x = centerPoint.x * canvas.width;
    const y = centerPoint.y * canvas.height;
    
    // Draw a prominent marker at the center point for debugging
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Add crosshairs
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 15);
    ctx.stroke();
    
    console.log(`Drew center marker at (${x.toFixed(2)}, ${y.toFixed(2)}) from relative coords (${centerPoint.x.toFixed(4)}, ${centerPoint.y.toFixed(4)}), canvas: ${canvas.width}x${canvas.height}`);
    
  }, [centerPoint, canvasRef, creationStep, videoDimensions]);

  // Create a fallback image for map pins that fail to load
  const createFallbackMapPinImage = () => {
    // Create a canvas to generate a simple pin image
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 60;
    
    const ctx = canvas.getContext('2d');
    
    // Create a drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw pin shape
    ctx.fillStyle = '#E50914'; // Netflix red
    
    // Draw pin head (circle)
    ctx.beginPath();
    ctx.arc(20, 18, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pin body (triangle)
    ctx.beginPath();
    ctx.moveTo(12, 18);
    ctx.lineTo(20, 55);
    ctx.lineTo(28, 18);
    ctx.fill();
    
    // Clear shadow for the highlight
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Add subtle highlight to give it dimension
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(16, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Return as data URL
    return canvas.toDataURL('image/png');
  };

  // Create the fallback image and store it for reuse
  const fallbackMapPinImage = useRef(null);

  // Function to draw all map pins for all hotspots
  const drawAllMapPins = useCallback((forceRedraw = false) => {
    // Skip drawing map pins entirely when in drawing mode
    if (drawingMode && !forceRedraw) {
      console.log("Skipping map pin drawing - currently in drawing mode");
      
      // Still clear the map pins canvas to prevent any ghost pins
      if (mapPinsCanvasRef.current) {
        const mapPinsCanvas = mapPinsCanvasRef.current;
        const ctx = mapPinsCanvas.getContext('2d');
        ctx.clearRect(0, 0, mapPinsCanvas.width, mapPinsCanvas.height);
      }
      return;
    }
    
    if (!canvasRef.current || !mapPinsCanvasRef.current) {
      console.log("Cannot draw map pins - no canvas");
      return;
    }
    
    const canvas = canvasRef.current;
    const mapPinsCanvas = mapPinsCanvasRef.current;
    const ctx = mapPinsCanvas.getContext('2d');
    
    // Check for too frequent redraws and prevent unless forced
    const now = Date.now();
    if (!forceRedraw && canvas._lastMapPinDrawTime && now - canvas._lastMapPinDrawTime < 100) {
      console.log(`Skipping map pin draw - too recent (${now - canvas._lastMapPinDrawTime}ms ago)`);
      return;
    }
    
    // Update last draw time to prevent rapid redraws
    canvas._lastMapPinDrawTime = now;
    
    // Ensure canvas has valid dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn("Invalid canvas dimensions, skipping map pin drawing");
      return;
    }
    
    // Copy dimensions from main canvas to map pins canvas
    if (mapPinsCanvas.width !== canvas.width || mapPinsCanvas.height !== canvas.height) {
      mapPinsCanvas.width = canvas.width;
      mapPinsCanvas.height = canvas.height;
    }
    
    // Clear only the map pins canvas
    ctx.clearRect(0, 0, mapPinsCanvas.width, mapPinsCanvas.height);
    
    console.log(`[drawAllMapPins] Canvas dimensions: ${mapPinsCanvas.width}x${mapPinsCanvas.height}, forceRedraw: ${forceRedraw}`);
    
    // Helper function to draw the map pin image on canvas
    const drawMapPinImage = (ctx, img, centerX, centerY, canvas) => {
      try {
        // Calculate image dimensions while preserving aspect ratio
        const MAX_HEIGHT = Math.max(80, canvas.height * 0.16); // Scale with canvas height
        const MAX_WIDTH = Math.max(60, canvas.width * 0.067); // Scale with canvas width
        
        let width = img.width;
        let height = img.height;
        
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
        
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        
        // Make sure width and height are valid
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
          console.error("Invalid dimensions for map pin image:", width, height);
          return;
        }
        
        // Make sure centerX and centerY are valid
        if (isNaN(centerX) || isNaN(centerY)) {
          console.error("Invalid coordinates for map pin image:", centerX, centerY);
          return;
        }
        
        console.log(`Drawing map pin image at (${centerX.toFixed(2)}, ${centerY.toFixed(2)}) with dimensions ${width.toFixed(2)}x${height.toFixed(2)}, canvas: ${canvas.width}x${canvas.height}`);
        
        // Save current canvas state before drawing
        ctx.save();
        
        // Draw the pin with full opacity
        ctx.globalAlpha = 1.0;
        
        // Draw the pin centered at the center point
        ctx.drawImage(
          img,
          centerX - width / 2, 
          centerY - height, // Position bottom center of pin at center point
          width,
          height
        );
        
        // Draw a small circle at the exact center point for better visibility
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Restore canvas state after drawing
        ctx.restore();
        
        console.log("Map pin image drawn successfully");
      } catch (error) {
        console.error("Error drawing map pin image:", error);
      }
    };
    
    // Define local drawMapPin function to avoid dependency issues
    const localDrawMapPin = (ctx, mapPin, centerX, centerY, canvas, forceRedraw = false) => {
      if (!mapPin) {
        console.warn("Cannot draw map pin - mapPin is null or undefined");
        return;
      }
      
      // Skip if already drawing to prevent recursive calls
      if (isDrawingMapPinRef.current && !forceRedraw) return;
      
      // Set flag with timestamp
      isDrawingMapPinRef.current = true;
      mapPinDrawingTimestampRef.current = Date.now();
      
      try {
        // Check for map pin with error status (from our error handling)
        if (mapPin.error) {
          console.warn(`Map pin has error status: ${mapPin.message}`);
          
          // Create fallback image if it doesn't exist
          if (!fallbackMapPinImage.current) {
            fallbackMapPinImage.current = createFallbackMapPinImage();
          }
          
          // Create a new image with the fallback
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            console.log("Using fallback map pin image due to error status");
            drawMapPinImage(ctx, fallbackImg, centerX, centerY, canvas);
            
            // Add subtle error indicator (small red dot at bottom of pin)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Cache the fallback image
            if (mapPin._id) {
              mapPinImagesRef.current[mapPin._id] = fallbackImg;
            }
            
            isDrawingMapPinRef.current = false;
          };
          fallbackImg.src = fallbackMapPinImage.current;
          return;
        }
        
        // Check if the map pin is just an ID string (handling MongoDB ID objects)
        if (typeof mapPin === 'string' || (typeof mapPin === 'object' && !mapPin.accessUrl)) {
          const mapPinId = typeof mapPin === 'string' ? mapPin : (mapPin._id || mapPin);
          console.warn(`Cannot draw map pin - missing accessUrl: ${mapPinId}`);
          
          // Create fallback image if it doesn't exist
          if (!fallbackMapPinImage.current) {
            fallbackMapPinImage.current = createFallbackMapPinImage();
          }
          
          // Create a new image with the fallback
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            console.log("Using fallback map pin image for ID-only map pin");
            drawMapPinImage(ctx, fallbackImg, centerX, centerY, canvas);
            
            // Add subtle error indicator (small red dot at bottom of pin)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Cache the fallback image with the ID
            if (mapPinId) {
              mapPinImagesRef.current[mapPinId] = fallbackImg;
            }
            
            isDrawingMapPinRef.current = false;
          };
          fallbackImg.src = fallbackMapPinImage.current;
          return;
        }
        
        if (!mapPin.accessUrl) {
          console.warn("Cannot draw map pin - missing accessUrl:", mapPin);
          
          // Create fallback image if it doesn't exist
          if (!fallbackMapPinImage.current) {
            fallbackMapPinImage.current = createFallbackMapPinImage();
          }
          
          // Create a new image with the fallback
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            console.log("Using fallback map pin image due to missing accessUrl");
            drawMapPinImage(ctx, fallbackImg, centerX, centerY, canvas);
            
            // Add subtle error indicator (small red dot at bottom of pin)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Cache the fallback image
            if (mapPin._id) {
              mapPinImagesRef.current[mapPin._id] = fallbackImg;
            }
            
            isDrawingMapPinRef.current = false;
          };
          fallbackImg.src = fallbackMapPinImage.current;
          return;
        }
        
        if (!ctx || !canvas) {
          console.warn("Cannot draw map pin - missing ctx or canvas");
          isDrawingMapPinRef.current = false;
          return;
        }
        
        console.log("Drawing map pin with data:", {
          id: mapPin._id,
          name: mapPin.name,
          accessUrl: mapPin.accessUrl,
          coords: `(${centerX.toFixed(2)}, ${centerY.toFixed(2)})`,
          canvasSize: `${canvas.width}x${canvas.height}`
        });
        
        // Check if we already have this image loaded in our cache
        let img = mapPinImagesRef.current[mapPin._id];
        
        if (!img) {
          // Create a new image element to load the pin
          img = new Image();
          
          img.onload = () => {
            console.log("Map pin image loaded successfully:", mapPin.name, mapPin.accessUrl, `${img.width}x${img.height}`);
            
            // Cache the loaded image for reuse
            mapPinImagesRef.current[mapPin._id] = img;
            
            // Draw the pin now that the image is loaded
            drawMapPinImage(ctx, img, centerX, centerY, canvas);
            
            // Reset flag after drawing is complete
            isDrawingMapPinRef.current = false;
          };
          
          img.onerror = (error) => {
            console.error("Failed to load map pin image:", mapPin.accessUrl, error);
            
            // Create fallback image if it doesn't exist
            if (!fallbackMapPinImage.current) {
              fallbackMapPinImage.current = createFallbackMapPinImage();
            }
            
            // Create a new image with the fallback
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              console.log("Using fallback map pin image");
              drawMapPinImage(ctx, fallbackImg, centerX, centerY, canvas);
              // Cache the fallback image
              mapPinImagesRef.current[mapPin._id] = fallbackImg;
            };
            fallbackImg.src = fallbackMapPinImage.current;
            
            isDrawingMapPinRef.current = false;
          };
          
          // Make sure the URL is absolute - add the backend URL if needed
          let imageUrl = mapPin.accessUrl;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            // Add backend URL prefix if it doesn't exist
            if (imageUrl.startsWith('/')) {
              // If it starts with /, add the base URL
              imageUrl = `${baseBackendUrl}${imageUrl}`;
            } else {
              // If it doesn't start with /, add the base URL with /
              imageUrl = `${baseBackendUrl}/${imageUrl}`;
            }
          }
          
          // Start loading the image
          console.log("Loading map pin image from URL:", imageUrl);
          img.crossOrigin = "anonymous"; // Try adding crossOrigin for CORS issues
          img.src = imageUrl;
        } else {
          console.log("Using cached map pin image:", mapPin.name);
          // Use the already loaded image
          drawMapPinImage(ctx, img, centerX, centerY, canvas);
          isDrawingMapPinRef.current = false;
        }
      } catch (error) {
        console.error("Error drawing map pin:", error);
      } finally {
        // Always reset the flag, even if there was an error
        isDrawingMapPinRef.current = false;
      }
    };
    
    // Draw hotspot map pins if we have any hotspots
    if (hotspots && hotspots.length > 0) {
      console.log(`Drawing map pins for ${hotspots.length} hotspots:`, 
        hotspots.map(h => ({
          id: h._id,
          name: h.name,
          hasMapPin: !!h.mapPin,
          mapPinIsObject: h.mapPin && typeof h.mapPin === 'object',
          hasAccessUrl: h.mapPin && h.mapPin.accessUrl ? true : false,
          hasCenter: !!h.centerPoint
        }))
      );
      
      // Draw map pins for each hotspot that has one
      hotspots.forEach(hotspot => {
        if (hotspot.mapPin && hotspot.centerPoint) {
          console.log(`Attempting to draw map pin for hotspot ${hotspot.name}:`, {
            mapPin: hotspot.mapPin,
            centerPoint: hotspot.centerPoint
          });
          
          const centerX = hotspot.centerPoint.x * canvas.width;
          const centerY = hotspot.centerPoint.y * canvas.height;
          
          // Draw this hotspot's map pin
          localDrawMapPin(ctx, hotspot.mapPin, centerX, centerY, canvas, forceRedraw);
        }
      });
    } else {
      console.log("No hotspots to draw map pins for");
    }
    
    // If we have a selected map pin and centerPoint, draw it last (on top)
    // This happens regardless of whether we have hotspots
    if (selectedMapPin && centerPoint) {
      console.log(`[drawAllMapPins] Drawing selected map pin with centerPoint: ${JSON.stringify(centerPoint)}`);
      
      const centerX = centerPoint.x * canvas.width;
      const centerY = centerPoint.y * canvas.height;
      
      console.log(`[drawAllMapPins] Selected map pin pixel coordinates: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
      console.log(`[drawAllMapPins] Selected map pin data: `, {
        id: selectedMapPin._id,
        name: selectedMapPin.name,
        accessUrl: selectedMapPin.accessUrl
      });
      
      // Draw selected map pin
      localDrawMapPin(ctx, selectedMapPin, centerX, centerY, canvas, forceRedraw);
    } else {
      if (!selectedMapPin) {
        console.log(`[drawAllMapPins] No selectedMapPin to draw`);
      }
      if (!centerPoint) {
        console.log(`[drawAllMapPins] No centerPoint for selected map pin`);
      }
    }
  }, [hotspots, canvasRef, selectedMapPin, centerPoint, drawingMode]);

  // Add a new useEffect to specifically handle drawing all hotspot map pins
  useEffect(() => {
    // Don't proceed if we don't have the canvas
    if (!canvasRef.current) {
      console.log("Cannot set up map pin drawing - canvas not available");
      return;
    }

    console.log(`Setting up map pin drawing handlers`);
    
    // Check if any hotspots have map pins
    if (hotspots && hotspots.length > 0) {
      const hotspotsWithMapPins = hotspots.filter(h => {
        // Check if the hotspot has both a map pin and centerPoint
        if (h.mapPin && h.centerPoint) {
          // Log what we find to help with debugging
          console.log(`Hotspot "${h.name}" has map pin:`, {
            mapPinType: typeof h.mapPin,
            hasAccessUrl: typeof h.mapPin === 'object' && !!h.mapPin.accessUrl,
            hasError: typeof h.mapPin === 'object' && !!h.mapPin.error,
            centerPoint: h.centerPoint
          });
          return true;
        }
        return false;
      });
      
      if (hotspotsWithMapPins.length > 0) {
        console.log(`Found ${hotspotsWithMapPins.length} hotspots with map pins`);
      } else {
        console.log("No hotspots with map pins to draw");
      }
    } else {
      console.log("No hotspots available");
    }
    
    // Continue setup even if there are no hotspots with pins, as we might have a selected map pin
    
    // Function to trigger map pin drawing
    const triggerMapPinDraw = () => {
      if (canvasRef.current) {
        console.log("Triggering map pin draw");
        canvasRef.current.dispatchEvent(new CustomEvent('forceMapPinDraw', { 
          detail: { 
            timestamp: Date.now(),
            source: 'hotspotDataChange',
            force: true
          }
        }));
      }
    };
    
    // Give a moment for canvas to be ready and data to stabilize
    const initialDrawTimer = setTimeout(triggerMapPinDraw, 500);
    
    // Set up another trigger a bit later to handle any async loaded data
    const followUpDrawTimer = setTimeout(triggerMapPinDraw, 2000);
    
    // Clean up timers on unmount
    return () => {
      clearTimeout(initialDrawTimer);
      clearTimeout(followUpDrawTimer);
    };
  }, [hotspots, canvasRef]);

  // Add a watchdog for isDrawingMapPinRef
  useEffect(() => {
    const watchdogTimer = setInterval(() => {
      if (isDrawingMapPinRef.current) {
        const timeSinceSet = Date.now() - mapPinDrawingTimestampRef.current;
        if (timeSinceSet > 3000) { // 3 seconds is too long for map pin drawing
          console.warn(`isDrawingMapPinRef has been stuck for ${timeSinceSet}ms, resetting it`);
          isDrawingMapPinRef.current = false;
        }
      }
    }, 1000);
    
    return () => clearInterval(watchdogTimer);
  }, []);

  // Display map pin on canvas when selected
  useEffect(() => {
    // Check if we have a valid canvas
    if (!canvasRef.current) {
      console.log("Not displaying map pin - canvas not available");
      return;
    }
    
    // We'll proceed even without selected map pin or center point
    // because we'll draw all hotspots' map pins
    console.log("Setting up map pin event handlers");
    
    const canvas = canvasRef.current;
    
    // Track the last time we drew the map pin to prevent loops
    if (!canvas._lastMapPinDrawTime) {
      canvas._lastMapPinDrawTime = 0;
    }
    
    // Create handler for map pin draw event
    const handleMapPinDraw = (event) => {
      // Skip processing if already performing a redraw
      if (isDrawingMapPinRef.current) {
        console.log("Already drawing map pins, skipping duplicate event");
        return;
      }
      
      // Extract event detail
      const eventDetail = event.detail || {};
      const source = eventDetail.source || 'unknown';
      const force = eventDetail.force || false;
      const clearOnly = eventDetail.clearOnly || false;
      
      console.log(`Map pin draw event received from ${source}, force: ${force}, clearOnly: ${clearOnly}`);
      
      // If clearOnly flag is set, just clear the map pins canvas without redrawing
      if (clearOnly && mapPinsCanvasRef.current) {
        const mapPinsCanvas = mapPinsCanvasRef.current;
        const ctx = mapPinsCanvas.getContext('2d');
        ctx.clearRect(0, 0, mapPinsCanvas.width, mapPinsCanvas.height);
        console.log("Cleared map pins canvas only as requested");
        return;
      }
      
      // Call the draw function
      drawAllMapPins(force);
    };
    
    // Special handler for forced redraws (navigating back to the page)
    const handleForceRedraw = (event) => {
      console.log("Force map pin redraw event received");
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => drawAllMapPins(true));
    };
    
    // Add event listeners
    canvas.addEventListener('drawMapPin', handleMapPinDraw);
    canvas.addEventListener('forceMapPinDraw', handleForceRedraw);
    
    // Also listen for window resize to ensure pin is redrawn
    const handleResize = () => {
      console.log("Window resize detected, redrawing map pin");
      
      // Use debouncing for resize events
      if (canvas._pinResizeTimer) {
        clearTimeout(canvas._pinResizeTimer);
      }
      
      canvas._pinResizeTimer = setTimeout(() => {
        requestAnimationFrame(() => drawAllMapPins(true));
      }, 150); // Increased debounce time
    };
    
    window.addEventListener('resize', handleResize);
    
    // Listen for visibility change to handle tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible, ensuring map pin is drawn");
        // Debounce this operation
        if (canvas._visibilityTimer) {
          clearTimeout(canvas._visibilityTimer);
        }
        
        canvas._visibilityTimer = setTimeout(() => {
          requestAnimationFrame(() => drawAllMapPins(true));
        }, 200);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up event listeners when unmounting
    return () => {
      canvas.removeEventListener('drawMapPin', handleMapPinDraw);
      canvas.removeEventListener('forceMapPinDraw', handleForceRedraw);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (canvas._pinResizeTimer) {
        clearTimeout(canvas._pinResizeTimer);
      }
      if (canvas._visibilityTimer) {
        clearTimeout(canvas._visibilityTimer);
      }
    };
    
  }, [canvasRef, drawAllMapPins]);

  // Set up canvas even if video doesn't load
  useEffect(() => {
    // Set a timeout to ensure canvas is initialized even if video fails to load
    const timeoutId = setTimeout(() => {
      if (!videoLoaded && canvasRef.current && canvasContainerRef.current) {
        console.log("Canvas initialization timeout triggered - video may not have loaded");
        const canvas = canvasRef.current;
        const container = canvasContainerRef.current;
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        setVideoLoaded(true);
      }
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timeoutId);
  }, [videoLoaded, canvasRef, canvasContainerRef, setVideoLoaded]);

  // Add a check for saved hotspot data on mount
  useEffect(() => {
    // Only try to restore if we're not already showing a map pin
    // Don't check creationStep - allow pins to be displayed in view mode too
    if (canvasRef.current && !isDrawingMapPinRef.current && selectedMapPin) {
      try {
        // Check if there's saved hotspot data in localStorage
        const savedPinData = localStorage.getItem('hotspotMapPinData');
        
        if (savedPinData) {
          const pinData = JSON.parse(savedPinData);
          console.log("Found saved map pin data, triggering redraw", pinData.mapPin?.name);
          
          // Give components time to fully mount
          setTimeout(() => {
            if (canvasRef.current) {
              // Trigger a forced redraw
              canvasRef.current.dispatchEvent(new CustomEvent('forceMapPinDraw', { 
                detail: { 
                  timestamp: Date.now(),
                  source: 'pageMount',
                  force: true
                }
              }));
            }
          }, 300);
        }
      } catch (err) {
        console.error("Error checking for saved map pin data:", err);
      }
    }
  }, [canvasRef, selectedMapPin, isDrawingMapPinRef]);

  // Add this use effect for document load/ready events
  useEffect(() => {
    // Function to handle when the document is fully loaded
    const handleDocumentLoad = () => {
      console.log("Document fully loaded, checking for map pin display");
      // Don't check creationStep - allow pins to be displayed in view mode too
      if (canvasRef.current && selectedMapPin && centerPoint) {
        // Make sure we redraw the map pin
        setTimeout(() => {
          canvasRef.current.dispatchEvent(new CustomEvent('forceMapPinDraw', {
            detail: {
              timestamp: Date.now(),
              source: 'documentLoad',
              force: true
            }
          }));
        }, 500);
      }
    };

    // Check if document is already loaded
    if (document.readyState === 'complete') {
      handleDocumentLoad();
    } else {
      // Add event listener for when document load completes
      window.addEventListener('load', handleDocumentLoad);
      
      // Clean up
      return () => {
        window.removeEventListener('load', handleDocumentLoad);
      };
    }
  }, [canvasRef, selectedMapPin, centerPoint]);

  // Add a new effect to clear the map pin image cache when hotspots change
  useEffect(() => {
    // Don't clear cache on every change - this causes repeated reloads
    // Only clear the cache if we detect a specific need
    const needsCacheClearing = hotspots?.some(hotspot => {
      // Check if this hotspot has a newly assigned map pin not in our cache
      return hotspot.mapPin && 
             typeof hotspot.mapPin === 'object' && 
             hotspot.mapPin._id && 
             !mapPinImagesRef.current[hotspot.mapPin._id];
    });
    
    if (needsCacheClearing) {
      console.log("Detected new map pins, clearing specific entries from cache");
      // Only clear entries not matching current hotspots to prevent flicker
      const validPinIds = new Set(hotspots
        .filter(h => h.mapPin && typeof h.mapPin === 'object')
        .map(h => h.mapPin._id));
        
      // Keep pins that are still in use, remove others
      Object.keys(mapPinImagesRef.current).forEach(pinId => {
        if (!validPinIds.has(pinId)) {
          delete mapPinImagesRef.current[pinId];
        }
      });
    }
    
    if (!hotspots || hotspots.length === 0) {
      // Clear selected map pin from canvas if corresponding hotspot is deleted
      if (!canvasRef.current) return;
      
      // Check if the selectedMapPin's hotspot still exists (only if we have a selected map pin)
      if (selectedMapPin) {
        // Improved check for map pin existence
        const mapPinExists = hotspots && hotspots.some(h => 
          h.mapPin && 
          (typeof h.mapPin === 'object' ? 
            h.mapPin._id === selectedMapPin._id : 
            String(h.mapPin) === String(selectedMapPin._id))
        );
        
        if (!mapPinExists) {
          // Debounce this operation to prevent multiple clears
          if (canvasRef.current._clearingTimeout) {
            clearTimeout(canvasRef.current._clearingTimeout);
          }
          
          canvasRef.current._clearingTimeout = setTimeout(() => {
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              console.log("Forcing complete canvas redraw after deletion");
              // Use a less aggressive redraw trigger
              canvas._pendingRedraw = true;
              requestAnimationFrame(() => {
                if (canvas._pendingRedraw) {
                  canvas._pendingRedraw = false;
                  canvas.dispatchEvent(new CustomEvent('forceMapPinDraw', {
                    detail: {
                      timestamp: Date.now(),
                      source: 'hotspotDeleted',
                      force: true
                    }
                  }));
                }
              });
            }
          }, 150);
        }
      } else {
        // If no hotspots and no selected map pin, ensure canvas is cleared
        if (canvasRef.current._clearingTimeout) {
          clearTimeout(canvasRef.current._clearingTimeout);
        }
        
        canvasRef.current._clearingTimeout = setTimeout(() => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log("Cleared canvas - no hotspots and no selected map pin");
          }
        }, 150);
      }
      
      return;
    }
    
    // If we have a canvas and hotspots, trigger a redraw - but debounce it
    if (canvasRef.current) {
      if (canvasRef.current._redrawTimeout) {
        clearTimeout(canvasRef.current._redrawTimeout);
      }
      
      canvasRef.current._redrawTimeout = setTimeout(() => {
        if (canvasRef.current) {
          console.log("Triggering redraw due to hotspot changes");
          // Set a pending flag to use with requestAnimationFrame instead of immediate dispatch
          canvasRef.current._pendingRedraw = true;
          requestAnimationFrame(() => {
            if (canvasRef.current && canvasRef.current._pendingRedraw) {
              canvasRef.current._pendingRedraw = false;
              canvasRef.current.dispatchEvent(new CustomEvent('forceMapPinDraw', { 
                detail: { 
                  timestamp: Date.now(),
                  source: 'hotspotsChanged',
                  force: true
                }
              }));
            }
          });
        }
      }, 250); // Increased debounce time
    }
  }, [hotspots, canvasRef, selectedMapPin]);

  return (
    <div 
      className="relative w-full rounded-md overflow-hidden bg-netflix-dark flex items-center justify-center" 
      ref={canvasContainerRef}
      style={{ height: '600px' }}
    >
      {/* Remove admin debug overlay */}
      
      {isLoadingAerial && (
        <div className="absolute inset-0 flex items-center justify-center bg-netflix-black/50 z-10">
          <div className="text-netflix-red text-lg">Loading aerial view...</div>
        </div>
      )}
      
      <div className="absolute inset-0 flex items-center justify-center">
        {aerialAsset && !useVideoFallback ? (
          <video 
            key={videoKey}
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            loop
            muted
            autoPlay
            playsInline
            controls={false}
          >
            <source src={getVideoUrl(aerialAsset.accessUrl)} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-netflix-black">
            {!isLoadingAerial && (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="p-4 rounded-md max-w-md">
                  <h3 className="text-netflix-red text-xl font-bold mb-2">No Aerial Video Available</h3>
                  <p className="text-white mb-4">Please upload an aerial video for this location in the Asset Management section.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        style={{ 
          cursor: drawingMode ? 'crosshair' : 'default',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          position: 'absolute'
        }}
      />
      
      {/* Separate canvas layer for map pins */}
      <canvas 
        ref={mapPinsCanvasRef} 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          position: 'absolute'
        }}
      />
      
      {/* Workflow progress indicator */}
      {creationStep > 0 && (
        <div className="absolute top-4 left-4 right-4 bg-netflix-black/80 p-2 rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 1 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>1</div>
            <div className={`w-16 h-1 ${creationStep >= 2 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 2 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>2</div>
            <div className={`w-16 h-1 ${creationStep >= 3 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 3 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>3</div>
            <div className={`w-16 h-1 ${creationStep >= 4 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 4 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>4</div>
          </div>
          <div className="text-sm font-medium ml-4">
            {creationStep === 1 && 'Step 1: Enter Information'}
            {creationStep === 2 && 'Step 2: Draw Hotspot Shape'}
            {creationStep === 3 && 'Step 3: Select Map Pin'}
            {creationStep === 4 && 'Step 4: Review and Save'}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotspotCanvas;
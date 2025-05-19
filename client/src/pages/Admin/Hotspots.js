// client/src/pages/Admin/Hotspots.js - Hotspot management tab

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAdmin } from '../../context/AdminContext';
import api, { baseBackendUrl } from '../../utils/api';
import { useToast } from '../../components/ui/use-toast';
import { DeleteConfirmation } from '../../components/ui/DeleteConfirmation';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';

// Import new components
import HotspotCanvas from '../../components/Hotspot/HotspotCanvas';
import HotspotList from '../../components/Hotspot/HotspotList';
import HotspotEditor from '../../components/Hotspot/HotspotEditor';
import HotspotCreation from '../../components/Hotspot/HotspotCreation';
import useHotspotDrawing from '../../components/Hotspot/useHotspotDrawing';

// Import baseBackendUrl from api.js

const Hotspots = () => {
  const { 
    locations,
    selectedLocation,
    setSelectedLocation,
    hotspots,
    selectedHotspot,
    setSelectedHotspot,
    isLoading,
    isSaving,
    setSaving,
    createHotspot,
    updateHotspot,
    deleteHotspot,
    fetchHotspots
  } = useAdmin();
  
  // Toast hook for notifications
  const { toast } = useToast();
  
  // Canvas for drawing hotspots
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const videoRef = useRef(null);
  
  // Hotspot drawing state
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [aerialAsset, setAerialAsset] = useState(null);
  const [isLoadingAerial, setIsLoadingAerial] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  
  // Hotspot form state
  const [hotspotForm, setHotspotForm] = useState({
    name: '',
    type: 'PRIMARY',
    infoPanel: {
      title: '',
      description: ''
    }
  });

  // Add state for selected map pin
  const [selectedMapPin, setSelectedMapPin] = useState(null);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    hotspotId: null,
    hotspotName: ''
  });
  
  // New state variables for improved workflow
  const [creationStep, setCreationStep] = useState(0); // 0=idle, 1=info, 2=drawing, 3=map-pin, 4=review
  const [draftHotspot, setDraftHotspot] = useState(null);
  const [videoKey, setVideoKey] = useState(0);
  
  // Add a flag to prevent multiple draft restorations
  const [draftRestored, setDraftRestored] = useState(false);

  // Define points state here to use before hook initialization
  const [points, setPoints] = useState([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  
  // Add state to store the most recently edited coordinates to prevent reverting
  const [lastEditedCoordinates, setLastEditedCoordinates] = useState(null);
  
  // Add state for map pin updating
  const [isUpdatingMapPin, setIsUpdatingMapPin] = useState(false);

  // Add local state for processed hotspots with fully loaded map pins
  const [processedHotspots, setProcessedHotspots] = useState([]);

  // Ref to track which location ID we've already loaded
  const loadedLocationRef = useRef(null);

  // Ref to track which location we've loaded aerial video for
  const loadedAerialLocationRef = useRef(null);

  // Add a ref to track when we're programmatically updating a map pin
  const isUpdatingMapPinRef = useRef(false);

  // Add hoveredHotspot state for hover synchronization between list and canvas
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  // Add selectedUIElement state
  const [selectedUIElement, setSelectedUIElement] = useState(null);

  // Add secondaryMode state
  const [secondaryMode, setSecondaryMode] = useState('classic');
  
  // Add flag to track when a shape has just been saved to preserve edited coordinates
  const [shapeSaveInProgress, setShapeSaveInProgress] = useState(false);

  // Keep processedHotspots in sync with hotspots when they change
  useEffect(() => {
    if (hotspots && hotspots.length > 0) {
      console.log("Hotspots array changed, updating processedHotspots");
      setProcessedHotspots([...hotspots]);
    }
  }, [hotspots]);

  // Select a hotspot
  const selectHotspot = useCallback(async (hotspot) => {
    // If hotspot is already selected, prevent recursion
    if (selectedHotspot && hotspot._id === selectedHotspot._id) {
      // Only continue if we need to load map pin data
      if (!(hotspot.mapPin && 
           (typeof hotspot.mapPin === 'string' || 
           (typeof hotspot.mapPin === 'object' && !hotspot.mapPin.accessUrl)))) {
        console.log("Hotspot already selected and no map pin processing needed - skipping");
        return;
      }
    }
    
    console.log("Selecting hotspot:", hotspot.name);
    setSelectedHotspot(hotspot);
    setDrawingMode(false);
    
    // Update form with hotspot data
    setHotspotForm({
      name: hotspot.name,
      type: hotspot.type,
      infoPanel: {
        title: hotspot.infoPanel?.title || '',
        description: hotspot.infoPanel?.description || ''
      }
    });
    
    // Check if mapPin is just an ID and fetch the full object if needed
    if (hotspot.mapPin) {
      // If mapPin is just an ID (string or ObjectId) or doesn't have accessUrl
      if (typeof hotspot.mapPin === 'string' || 
          (typeof hotspot.mapPin === 'object' && !hotspot.mapPin.accessUrl)) {
        try {
          // Determine the ID string
          const mapPinId = typeof hotspot.mapPin === 'string' ? 
            hotspot.mapPin : 
            (hotspot.mapPin.$oid || hotspot.mapPin._id || hotspot.mapPin);
          
          console.log("Fetching full map pin data for ID:", mapPinId);
          
          // Fetch the full map pin object
          const response = await api.getAssetById(mapPinId);
          if (response.data) {
            console.log("Fetched full map pin data:", response.data.name);
            setSelectedMapPin(response.data);
          } else {
            console.warn("Could not fetch map pin data");
            setSelectedMapPin(null);
          }
        } catch (error) {
          console.error("Error fetching map pin:", error);
          setSelectedMapPin(null);
          
          toast({
            title: "Error loading map pin",
            description: "The map pin could not be loaded. The hotspot will be displayed without a pin.",
            variant: "destructive"
          });
        }
      } else {
        // mapPin is already a full object
        console.log("Using existing map pin data:", hotspot.mapPin.name);
        setSelectedMapPin(hotspot.mapPin);
      }
    } else {
      setSelectedMapPin(null);
    }
    
    // Set the UI element if it exists
    if (hotspot.uiElement) {
      // Handle case where uiElement is just an ID or doesn't have accessUrl
      if (typeof hotspot.uiElement === 'string' || 
          (typeof hotspot.uiElement === 'object' && !hotspot.uiElement.accessUrl)) {
        try {
          // Determine the ID string
          const uiElementId = typeof hotspot.uiElement === 'string' ? 
            hotspot.uiElement : 
            (hotspot.uiElement.$oid || hotspot.uiElement._id || hotspot.uiElement);
          
          console.log("Fetching full UI element data for ID:", uiElementId);
          
          // Fetch the full UI element object
          const response = await api.getAssetById(uiElementId);
          if (response.data) {
            console.log("Fetched full UI element data:", response.data.name);
            setSelectedUIElement(response.data);
          } else {
            console.warn("Could not fetch UI element data");
            setSelectedUIElement(null);
          }
        } catch (error) {
          console.error("Error fetching UI element:", error);
          setSelectedUIElement(null);
        }
      } else {
        // uiElement is already a full object
        console.log("Using existing UI element data:", hotspot.uiElement.name);
        setSelectedUIElement(hotspot.uiElement);
      }
    } else {
      setSelectedUIElement(null);
    }
    
    // Load the polygon coordinates for drawing
    if (hotspot.coordinates && Array.isArray(hotspot.coordinates)) {
      console.log("Setting points from selected hotspot coordinates:", hotspot.coordinates.length, "points");
      setPoints(hotspot.coordinates);
    }
  }, [selectedHotspot, setSelectedHotspot, setDrawingMode, setHotspotForm, setSelectedMapPin, setSelectedUIElement, setPoints, toast]);

  // Declare a function reference that will be assigned the actual implementation later
  const drawExistingHotspotsRef = useRef(null);

  // Force a redraw after setting points
  useEffect(() => {
    // Only proceed if we have the necessary elements
    if (!selectedHotspot || !drawExistingHotspotsRef.current) return;
    
    // Keep track of the selected hotspot ID to avoid redundant redraws
    const hotspotId = selectedHotspot._id;
    
    // Check for valid coordinates
    if (selectedHotspot?.coordinates && Array.isArray(selectedHotspot.coordinates)) {
      console.log(`Redrawing for hotspot ${hotspotId} with ${selectedHotspot.coordinates.length} points`);
      
      // Force a redraw of the points and map pin
      setTimeout(() => {
        // Only proceed if still mounted and reference is valid
        if (drawExistingHotspotsRef.current) {
          drawExistingHotspotsRef.current(true);
        }
      }, 100);
    }
    
    // No need to call drawExistingHotspotsRef.current() again here
    // The above setTimeout already handles the redraw
    
  }, [selectedHotspot?.coordinates, selectedHotspot?._id, drawExistingHotspotsRef, selectedHotspot]);

  // Draw existing hotspots
  const {
    drawExistingHotspots,
    undoLastPoint,
    handleCanvasClick,
    handleCanvasHover,
    finishDrawing,
    clearCanvases
  } = useHotspotDrawing(
    canvasRef, 
    hotspots, 
    selectedHotspot, 
    hotspotForm, 
    selectHotspot, 
    drawingMode, 
    setDrawingMode, 
    points, 
    setPoints,
    false, // showDraftPolygon
    hoveredHotspot, // Pass the hoveredHotspot state
    setHoveredHotspot // Pass the setter
  );

  // Store the drawExistingHotspots function in our ref so we can use it before it's defined
  useEffect(() => {
    drawExistingHotspotsRef.current = drawExistingHotspots;
  }, [drawExistingHotspots]);
  
  // Load hotspots when component mounts or becomes visible
  useEffect(() => {
    // Only fetch if we have a selected location
    if (selectedLocation?._id) {
      // Skip if we've already loaded this location
      if (loadedLocationRef.current === selectedLocation._id) {
        console.log("Skipping duplicate hotspot fetch for location:", selectedLocation.name);
        return;
      }
      
      console.log("Hotspots component initialized/activated - fetching hotspots for:", selectedLocation.name);
      
      // Add a flag to prevent multiple calls
      let isMounted = true;
      
      // Fetch hotspots and process map pins
      const loadHotspotsWithMapPins = async () => {
        try {
          // Only continue if still mounted
          if (!isMounted) return;
          
          const hotspotData = await fetchHotspots(selectedLocation._id);
          
          // Store that we've loaded this location
          loadedLocationRef.current = selectedLocation._id;
          
          // If component was unmounted during the async call, don't continue
          if (!isMounted) return;
          
          // Process all hotspots to ensure map pins are fully loaded
          if (hotspotData && hotspotData.length > 0) {
            console.log(`Processing ${hotspotData.length} hotspots to load map pin data`);
            
            // Process map pins for all hotspots
            const fullyLoadedHotspots = await processHotspotMapPins(hotspotData);
            
            console.log("Setting processed hotspots with fully loaded map pins:", fullyLoadedHotspots);
            setProcessedHotspots(fullyLoadedHotspots);
            
            // Force a redraw to show all loaded map pins
            if (drawExistingHotspotsRef.current) {
              setTimeout(() => {
                drawExistingHotspotsRef.current(true);
              }, 100);
            }
            
            // If we have a selected hotspot, make sure it has the latest data
            if (selectedHotspot) {
              // Find the updated hotspot in the new data
              const updatedHotspot = fullyLoadedHotspots.find(h => h._id === selectedHotspot._id);
              if (updatedHotspot) {
                console.log("Re-selecting hotspot to load map pin data");
                selectHotspot(updatedHotspot);
              }
            }
          }
        } catch (error) {
          console.error("Error loading hotspots with map pins:", error);
          toast({
            title: "Error loading hotspots",
            description: error.message,
            variant: "destructive"
          });
        }
      };
      
      loadHotspotsWithMapPins();
      
      // Cleanup function to prevent state updates after unmount
      return () => {
        isMounted = false;
      };
    }
  }, [selectedLocation, fetchHotspots, selectHotspot, selectedHotspot, drawExistingHotspotsRef, toast]);
  
  // Load aerial video for the selected location
  useEffect(() => {
    const loadAerialVideo = async () => {
      if (!selectedLocation) return;
      
      // Skip if we've already loaded this location's aerial video
      if (loadedAerialLocationRef.current === selectedLocation._id) {
        console.log("Skipping duplicate aerial video load for location:", selectedLocation.name);
        return;
      }
      
      setIsLoadingAerial(true);
      setUseVideoFallback(false);
      setVideoLoaded(false); // Reset video loaded state
      
      // Reset video element if it exists
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      
      try {
        // Fetch aerial asset for the selected location
        const response = await api.getAssetsByType('AERIAL', selectedLocation._id);
        
        if (response.data && response.data.length > 0) {
          const asset = response.data[0];
          console.log("Aerial asset found:", asset);
          console.log("Access URL:", asset.accessUrl);
          
          setAerialAsset(asset);
        } else {
          console.log("No aerial assets found for location:", selectedLocation._id);
          // Fallback to placeholder if no aerial asset found
          toast({
            title: "No aerial asset found",
            description: `Please upload an aerial video for ${selectedLocation.name} in the Asset Management section.`,
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                className="bg-netflix-red hover:bg-netflix-darkred text-white border-0" 
                onClick={() => window.location.href = '/admin/assets'}
              >
                Go to Assets
              </Button>
            ),
            duration: 5000
          });
          setAerialAsset(null);
          setUseVideoFallback(true);
        }
        
        // Mark this location as loaded
        loadedAerialLocationRef.current = selectedLocation._id;
      } catch (error) {
        console.error('Error loading aerial asset:', error);
        toast({
          title: "Error loading aerial asset",
          description: error.message,
          variant: "destructive"
        });
        setAerialAsset(null);
        setUseVideoFallback(true);
      } finally {
        setIsLoadingAerial(false);
      }
    };
    
    // Add a flag to track if component is mounted
    let isMounted = true;
    
    // Use a ref to track previous location to avoid unnecessary fetches
    const fetchData = async () => {
      if (isMounted) {
        await loadAerialVideo();
      }
    };
    
    fetchData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
    
    // Only run when selectedLocation._id changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation?._id]);
  
  // Ensure URL is properly formatted with cache busting
  const getVideoUrl = (src) => {
    if (!src) return '';
    
    // Add cache busting parameter to prevent browser caching
    const cacheBuster = `timestamp=${Date.now()}`;
    
    // If URL is already fully qualified, use it
    if (src.startsWith('http')) {
      const url = src.includes('?') ? `${src}&${cacheBuster}` : `${src}?${cacheBuster}`;
      console.log("Using full URL:", url);
      return url;
    }
    
    // Ensure API URLs have proper backend URL
    if (src.startsWith('/api/')) {
      const url = `${baseBackendUrl}${src}${src.includes('?') ? '&' : '?'}${cacheBuster}`;
      console.log("Formatted API URL:", url);
      return url;
    } else {
      const url = `${baseBackendUrl}/api${src}${src.includes('?') ? '&' : '?'}${cacheBuster}`;
      console.log("Added backend URL:", url);
      return url;
    }
  };
  
  // Use a unique key for video element to force re-render on location change
  // Update videoKey state when location changes
  useEffect(() => {
    if (selectedLocation) {
      setVideoKey(prev => prev + 1); // Increment to force video re-render on location change
    }
  }, [selectedLocation]);
  
  // Handle location change
  const handleLocationChange = useCallback((value) => {
    const location = locations.find(loc => loc._id === value);
    if (location) {
      // Reset our location tracking refs when intentionally changing locations
      loadedLocationRef.current = null;
      loadedAerialLocationRef.current = null;
      
      // Clear all state related to map pins and hotspots
      setSelectedLocation(location);
      setSelectedHotspot(null);
      setSelectedMapPin(null);
      setPoints([]);
      setDrawingMode(false);
      setProcessedHotspots([]);  // Clear processed hotspots that might contain map pins
      
      // Force video reload by changing the key
      setVideoKey(prevKey => prevKey + 1);
      
      // Clear localStorage data to prevent location-specific data persistence
      localStorage.removeItem('hotspotMapPinData');
      
      // Force clear the canvas immediately
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      // We don't need to manually fetch hotspots here - the useEffect will handle it
      // since we reset loadedLocationRef
    }
  }, [locations, setSelectedLocation, setSelectedHotspot, setPoints, setDrawingMode, setSelectedMapPin, setProcessedHotspots, canvasRef, setVideoKey]);
  
  // Reset draftRestored flag when location changes
  useEffect(() => {
    setDraftRestored(false);
    setPoints([]);
  }, [selectedLocation?._id, setPoints]);
  
  // Save draft whenever relevant state changes with debounce  
  useEffect(() => {
    // Only save if we're in creation mode and not just restored
    if (creationStep > 0 && selectedLocation && draftRestored) {
      const saveTimer = setTimeout(() => {
        const draftData = {
          locationId: selectedLocation._id,
          hotspot: draftHotspot,
          points,
          form: hotspotForm,
          step: creationStep,
          lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('hotspotDraft', JSON.stringify(draftData));
      }, 500); // 500ms debounce
      
      return () => clearTimeout(saveTimer);
    } else if (creationStep === 0) {
      // Clear draft when we exit creation mode
      localStorage.removeItem('hotspotDraft');
    }
  }, [creationStep, draftHotspot, points, hotspotForm, selectedLocation, draftRestored]);

  // Make sure we reset draft restored flag when exiting creation mode
  useEffect(() => {
    if (creationStep === 0) {
      setDraftRestored(false);
    }
  }, [creationStep]);
  
  // Handle video load
  const handleVideoLoad = () => {
    console.log("Video loaded successfully");
    setVideoLoaded(true);
    
    // Reset the canvas when video loads
    if (canvasRef.current && canvasContainerRef.current) {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  // Handle video error
  const handleVideoError = (error) => {
    console.error("Error loading video:", error);
    toast({
      title: "Video Loading Error",
      description: "Failed to load aerial video. Using placeholder instead.",
      variant: "destructive"
    });
    setUseVideoFallback(true);
    
    // Initialize canvas despite error
    if (canvasRef.current && canvasContainerRef.current) {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      setVideoLoaded(true);
    }
  };
  
  // Start creating a new hotspot
  const startHotspotCreation = () => {
    setSelectedHotspot(null);
    setPoints([]);
    setDraftHotspot(null);
    setHotspotForm({
      name: '',
      type: 'PRIMARY',
      infoPanel: {
        title: '',
        description: ''
      }
    });
    setCreationStep(1); // Start at info step
  };
  
  // Proceed from info entry to drawing mode
  const proceedToDrawing = () => {
    if (!hotspotForm.name.trim()) {
      // Focus on the name input
      document.getElementById('name')?.focus();
      toast({
        title: "Missing information",
        description: "Please enter a name for the hotspot",
        variant: "destructive"
      });
      return;
    }
    
    // Additional validations for SECONDARY type
    if (hotspotForm.type === 'SECONDARY' && !hotspotForm.infoPanel.title.trim()) {
      document.getElementById('infoPanel.title')?.focus();
      toast({
        title: "Missing information",
        description: "SECONDARY hotspots require an info panel title",
        variant: "destructive"
      });
      return;
    }
    
    // Store form data in draft
    setDraftHotspot({
      ...hotspotForm,
      coordinates: []
    });
    
    setCreationStep(2); // Move to drawing step
    setDrawingMode(true);
  };
  
  // Finish drawing and move to map pin selection step - wrapped in useCallback
  const finishDrawingAndReview = useCallback(() => {
    if (points.length < 3) {
      toast({
        title: "Invalid hotspot",
        description: "Please draw at least 3 points to create a hotspot",
        variant: "destructive"
      });
      return;
    }
    
    // Use the finishDrawing function from the hook
    finishDrawing();
    
    // Before proceeding, ensure the polygon is closed by checking if the first and last points are the same
    // If not, add the first point again to close the loop
    if (points.length >= 3 && 
        (points[0].x !== points[points.length - 1].x || 
         points[0].y !== points[points.length - 1].y)) {
      
      console.log("Ensuring polygon is closed by adding first point again");
      const updatedPoints = [...points, { ...points[0] }];
      setPoints(updatedPoints);
      
      // Update draft with coordinates including the closing point
      setDraftHotspot(prev => ({
        ...prev,
        coordinates: updatedPoints
      }));
    } else {
      // Update draft with existing coordinates
      setDraftHotspot(prev => ({
        ...prev,
        coordinates: points
      }));
    }
    
    // Short delay to ensure the UI updates before moving to the next step
    setTimeout(() => {
      // Determine the next step based on hotspot type and secondary mode
      if (hotspotForm.type === 'PRIMARY') {
        // PRIMARY hotspots go directly to map pin selection
        setCreationStep(4);
        console.log("Moving to map pin selection step for PRIMARY hotspot");
      } else if (hotspotForm.type === 'SECONDARY') {
        // Check if the secondary hotspot is using UI Element mode
        if (secondaryMode === 'ui-element') {
          // SECONDARY with UI Element mode goes to UI Element selection first
          setCreationStep(3);
          console.log("Moving to UI Element selection step for SECONDARY ui-element hotspot");
        } else {
          // SECONDARY with classic mode goes directly to map pin selection
          setCreationStep(4);
          console.log("Moving to map pin selection step for SECONDARY classic hotspot");
        }
      } else {
        // Default fallback
        setCreationStep(4);
        console.log("Moving to map pin selection step (default)");
      }
    }, 50);
    
  }, [points, finishDrawing, toast, setDraftHotspot, setCreationStep, setPoints, hotspotForm.type, secondaryMode]);

  // Handle completing map pin selection
  const onMapPinSelectionComplete = (mapPin) => {
    console.log("Map pin selection completed with:", mapPin);
    
    if (!mapPin) {
      // Clear selected map pin if none selected
      setSelectedMapPin(null);
      setCreationStep(5);
      return;
    }
    
    // Ensure map pin has proper URL format
    if (mapPin && mapPin.accessUrl) {
      // Make sure accessUrl is properly formatted
      if (!mapPin.accessUrl.startsWith('http') && !mapPin.accessUrl.startsWith('/api')) {
        console.log("Fixing mapPin URL format:", mapPin.accessUrl);
        mapPin.accessUrl = mapPin.accessUrl.startsWith('/') ? 
          `${baseBackendUrl}${mapPin.accessUrl}` : 
          `${baseBackendUrl}/api/assets/file/MapPin/${mapPin.accessUrl}`;
      }
      
      console.log("Map pin with formatted URL:", {
        name: mapPin.name,
        accessUrl: mapPin.accessUrl
      });
      
      // Pre-load the image to ensure it's ready for drawing
      const img = new Image();
      img.onload = () => {
        console.log("Successfully pre-loaded map pin image:", mapPin.name);
      };
      img.onerror = (err) => {
        console.error("Failed to pre-load map pin image:", err);
      };
      img.src = mapPin.accessUrl;
    }
    
    // Update draft with the selected map pin
    handleSetSelectedMapPin(mapPin);
    
    // Trigger a redraw to ensure map pin is displayed
    if (drawExistingHotspotsRef.current) {
      setTimeout(() => {
        console.log("Forcing redraw after map pin selection");
        drawExistingHotspotsRef.current(true);
      }, 100);
    }
    
    // Move to review step
    setCreationStep(5);
  };
  
  // Create a new hotspot
  const saveNewHotspot = async () => {
    if (!draftHotspot || !selectedLocation) return;
    
    try {
      // Set saving status
      setSaving(true);
      
      // Log debug info
      console.log("Creating new hotspot with:", {
        name: hotspotForm.name,
        type: hotspotForm.type,
        coordinates: points,
        selectedMapPin: selectedMapPin ? {
          id: selectedMapPin._id,
          name: selectedMapPin.name
        } : null,
        selectedUIElement: selectedUIElement ? {
          id: selectedUIElement._id,
          name: selectedUIElement.name
        } : null
      });
      
      // Make sure we have a valid center point
      let centerPoint = null;
      if (points.length > 0) {
        const sumX = points.reduce((acc, point) => acc + point.x, 0);
        const sumY = points.reduce((acc, point) => acc + point.y, 0);
        
        centerPoint = {
          x: sumX / points.length,
          y: sumY / points.length
        };
      }
      
      // Prepare hotspot data
      const hotspotData = {
        name: hotspotForm.name,
        type: hotspotForm.type,
        coordinates: points,
        centerPoint: centerPoint,
        location: selectedLocation._id,
        // Correctly pass the map pin ID, not the full object
        mapPin: selectedMapPin ? selectedMapPin._id : null,
        // Add UI element ID if it exists
        uiElement: selectedUIElement ? selectedUIElement._id : null
      };
      
      // Add info panel for SECONDARY hotspots with classic mode
      if (hotspotForm.type === 'SECONDARY' && hotspotForm.infoPanel) {
        hotspotData.infoPanel = hotspotForm.infoPanel;
      }
      
      console.log("Submitting hotspot data:", hotspotData);
      
      // Create the hotspot
      const result = await createHotspot(hotspotData);
      
      if (result) {
        console.log("Hotspot created successfully:", result);
        
        // Clear draft from localStorage
        localStorage.removeItem('hotspotDraft');
        
        // Reset creation state
        resetCreationState();
        
        // Refresh the hotspot list
        fetchHotspots(selectedLocation._id);
        
        // Show success message
        toast({
          title: "Success",
          description: `Hotspot "${hotspotForm.name}" has been created successfully`,
          variant: "success"
        });
      }
    } catch (error) {
      console.error("Error creating hotspot:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create hotspot",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Save and restore map pin selection and creation step
  useEffect(() => {
    // Only attempt to restore state if we have a selectedLocation and are in creation mode
    if (selectedLocation?._id && draftHotspot && creationStep > 0) {
      // Save pin and step to localStorage whenever they change
      const pinData = {
        locationId: selectedLocation._id,
        mapPin: selectedMapPin,
        creationStep: creationStep,
        timestamp: Date.now()
      };
      localStorage.setItem('hotspotMapPinData', JSON.stringify(pinData));
      console.log("Saved map pin data to localStorage:", { pin: selectedMapPin?.name, step: creationStep });
    }
  }, [selectedLocation, draftHotspot, selectedMapPin, creationStep]);

  // Restore map pin and creation step when the component mounts or location changes
  useEffect(() => {
    if (selectedLocation?._id && draftHotspot && !selectedMapPin && creationStep >= 3) {
      try {
        const savedPinData = localStorage.getItem('hotspotMapPinData');
        if (savedPinData) {
          const pinData = JSON.parse(savedPinData);
          
          // Only restore if it's for the same location
          if (pinData.locationId === selectedLocation._id) {
            console.log("Restoring map pin from localStorage:", pinData.mapPin?.name);
            
            // Restore the saved map pin
            if (pinData.mapPin && !selectedMapPin) {
              setSelectedMapPin(pinData.mapPin);
            }
          }
        }
      } catch (err) {
        console.error("Error restoring map pin data:", err);
      }
    }
  }, [selectedLocation, draftHotspot, selectedMapPin, creationStep]);

  // Modify the setSelectedMapPin function to prevent loops
  const handleSetSelectedMapPin = (mapPin) => {
    // Set the updateRef to true to indicate we're updating
    isUpdatingMapPinRef.current = true;
    
    // If mapPin is null, just clear the selection
    if (!mapPin) {
      setSelectedMapPin(null);
      
      // Clear the update flag after a delay
      setTimeout(() => {
        isUpdatingMapPinRef.current = false;
      }, 300);
      return;
    }
    
    // Ensure mapPin has properly formatted accessUrl
    if (mapPin.accessUrl) {
      // Make sure accessUrl is properly formatted
      if (!mapPin.accessUrl.startsWith('http') && !mapPin.accessUrl.startsWith('/api')) {
        console.log("Fixing mapPin URL format:", mapPin.accessUrl);
        mapPin.accessUrl = mapPin.accessUrl.startsWith('/') ? 
          `${baseBackendUrl}${mapPin.accessUrl}` : 
          `${baseBackendUrl}/api/assets/file/MapPin/${mapPin.accessUrl}`;
      }
      
      console.log("Map pin prepared with URL:", mapPin.accessUrl);
      
      // Pre-load the image to ensure it's ready for drawing
      const img = new Image();
      img.onload = () => {
        console.log("Successfully pre-loaded map pin image in handleSetSelectedMapPin:", mapPin.name);
      };
      img.onerror = (err) => {
        console.error("Failed to pre-load map pin image:", err);
        // Still continue with setting the map pin even if pre-loading fails
      };
      img.src = mapPin.accessUrl;
    } else {
      console.warn("Map pin missing accessUrl:", mapPin);
    }
    
    // Create a clone of the mapPin to avoid reference issues
    const mapPinClone = {...mapPin};
    
    // Update the state
    setSelectedMapPin(mapPinClone);
    
    // Only save to localStorage if we're in creation mode or editing a hotspot
    if (selectedLocation?._id && (creationStep > 0 || selectedHotspot)) {
      const pinData = {
        locationId: selectedLocation._id,
        mapPin: mapPinClone,
        step: creationStep,
        timestamp: Date.now(),
        editing: !!selectedHotspot,
        isUpdating: true
      };
      localStorage.setItem('hotspotMapPinData', JSON.stringify(pinData));
      console.log("Saved map pin data to localStorage:", { pin: mapPinClone?.name, step: creationStep, editing: !!selectedHotspot });
    }
    
    // Trigger a redraw to ensure map pin is displayed
    if (drawExistingHotspotsRef.current) {
      setTimeout(() => {
        drawExistingHotspotsRef.current(true);
      }, 50);
    }
    
    // Clear the update flag after a delay
    setTimeout(() => {
      isUpdatingMapPinRef.current = false;
    }, 300);
  };

  // Reset creation state including map pin data
  const resetCreationState = useCallback(() => {
    setPoints([]);
    setHotspotForm({
      name: '',
      type: 'PRIMARY',
      infoPanel: {
        title: '',
        description: ''
      }
    });
    setSelectedMapPin(null);
    setDraftHotspot(null);
    setCreationStep(0);
    setDrawingMode(false);
    
    // Remove draft and map pin data from localStorage
    localStorage.removeItem('hotspotDraft');
    localStorage.removeItem('hotspotMapPinData');
    
    // Force a complete canvas redraw
    if (canvasRef.current) {
      // First clear the canvas entirely
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      console.log("Canvas cleared during resetCreationState");
      
      // Then trigger a forced redraw with a short delay to ensure state is updated
      setTimeout(() => {
        if (drawExistingHotspotsRef.current) {
          console.log("Forcing complete redraw after reset");
          drawExistingHotspotsRef.current(true);
          
          // Also trigger any custom redraw events the canvas might be listening for
          canvas.dispatchEvent(new CustomEvent('forceMapPinDraw', {
            detail: {
              timestamp: Date.now(),
              source: 'resetCreationState',
              force: true
            }
          }));
        }
      }, 100);
    }
  }, [setPoints, setHotspotForm, setSelectedMapPin, setDraftHotspot, setCreationStep, setDrawingMode, drawExistingHotspotsRef, canvasRef]);
  
  // Save edited points of an existing hotspot - wrapped in useCallback
  const finishEditingPoints = useCallback(async () => {
    if (!selectedHotspot || points.length < 3) return;
    
    try {
      // Set flag to indicate we're in the middle of saving a shape
      setShapeSaveInProgress(true);
      
      // Calculate the center point for proper map pin positioning
      let centerPoint = {
        x: 0,
        y: 0
      };
      
      if (points.length > 0) {
        const sumX = points.reduce((acc, point) => acc + point.x, 0);
        const sumY = points.reduce((acc, point) => acc + point.y, 0);
        
        centerPoint = {
          x: sumX / points.length,
          y: sumY / points.length
        };
        
        console.log("Calculated centerPoint for edited shape:", centerPoint);
      }
      
      // Save the most recently edited coordinates to prevent them from being lost
      setLastEditedCoordinates([...points]);
      
      // Update hotspot with new coordinates and center point
      const result = await updateHotspot(selectedHotspot._id, {
        ...hotspotForm,
        coordinates: points,
        centerPoint: centerPoint,
        mapPin: selectedHotspot.mapPin ? (typeof selectedHotspot.mapPin === 'object' ? selectedHotspot.mapPin._id : selectedHotspot.mapPin) : null
      });
      
      if (result) {
        // Clear editing state but keep lastEditedCoordinates for the subsequent Save Changes operation
        setIsEditingPoints(false);
        setDrawingMode(false);
        
        // Completely clear both canvases to ensure no ghosting
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Also clear map pins canvas
          if (canvas.parentElement) {
            const mapPinsCanvas = canvas.parentElement.querySelector('canvas:nth-child(2)');
            if (mapPinsCanvas) {
              const mapPinsCtx = mapPinsCanvas.getContext('2d');
              mapPinsCtx.clearRect(0, 0, mapPinsCanvas.width, mapPinsCanvas.height);
            }
          }
        }
        
        // Refresh hotspots data
        await fetchHotspots(selectedLocation._id);
        
        // Restore the map pin if it existed
        if (selectedHotspot.mapPin) {
          // Use the result data which should include the full hotspot with map pin
          // If the result doesn't have the map pin data, fetch it
          if (result.mapPin) {
            if (typeof result.mapPin === 'object' && result.mapPin.accessUrl) {
              setSelectedMapPin(result.mapPin);
            } else {
              // If it's just an ID, fetch the full map pin data
              try {
                const mapPinId = typeof result.mapPin === 'string' ? 
                  result.mapPin : (result.mapPin._id || result.mapPin);
                const response = await api.getAssetById(mapPinId);
                if (response.data) {
                  setSelectedMapPin(response.data);
                }
              } catch (err) {
                console.error("Error restoring map pin after edit:", err);
              }
            }
          }
        }
        
        // Force a redraw after a short delay to ensure state is updated
        setTimeout(() => {
          if (drawExistingHotspotsRef.current) {
            drawExistingHotspotsRef.current(true);
          }
        }, 100);
        
        toast({
          title: "Success",
          description: "Hotspot shape updated successfully",
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update hotspot shape",
        variant: "destructive"
      });
    } finally {
      // Clear shape save flag after completion
      setShapeSaveInProgress(false);
    }
  }, [selectedHotspot, points, updateHotspot, hotspotForm, setIsEditingPoints, setDrawingMode, fetchHotspots, selectedLocation, drawExistingHotspotsRef, toast, canvasRef]);

  // Custom handler for canvas clicks that handles both adding points and closing the loop
  const handleCanvasClickWrapper = (e) => {
    // handleCanvasClick returns true when clicking on the first point to close the loop
    const shouldCloseLoop = handleCanvasClick(e);
    
    // If we should close the loop, call the appropriate function based on mode
    if (shouldCloseLoop) {
      if (creationStep === 2) {
        finishDrawingAndReview();
      } else if (isEditingPoints) {
        finishEditingPoints();
      }
    }
  };
  
  // Function called by the Finish Drawing button 
  const onFinishDrawingClick = () => {
    if (creationStep === 2) {
      finishDrawingAndReview();
    } else if (isEditingPoints) {
      finishEditingPoints();
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('infoPanel.')) {
      // Handle nested infoPanel properties
      const infoPanelField = name.split('.')[1];
      setHotspotForm(prev => ({
        ...prev,
        infoPanel: {
          ...prev.infoPanel,
          [infoPanelField]: value
        }
      }));
    } else {
      // Handle top-level properties
      setHotspotForm(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle select changes for non-native select components
  const handleSelectChange = (name, value) => {
    setHotspotForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Ref to track whether hotspot redraw is in progress
  const isProcessingRedrawRef = useRef(false);

  // Update canvas when hotspots change - use a debounce approach
  useEffect(() => {
    if (!videoLoaded || !drawExistingHotspotsRef.current) return;
    
    // Add debounce to prevent too many redraws
    const timeoutId = setTimeout(() => {
      if (!isProcessingRedrawRef.current) {
        isProcessingRedrawRef.current = true;
        console.log("Drawing hotspots after data update:", hotspots.length);
        drawExistingHotspotsRef.current();
        
        // Reset processing flag after a short delay
        setTimeout(() => {
          isProcessingRedrawRef.current = false;
        }, 100);
      }
    }, 300); // 300ms debounce
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [hotspots, videoLoaded, drawExistingHotspotsRef]);
  
  // Open delete confirmation
  const handleDeleteClick = () => {
    if (!selectedHotspot) return;
    
    setDeleteConfirmation({
      isOpen: true,
      hotspotId: selectedHotspot._id,
      hotspotName: selectedHotspot.name
    });
  };
  
  // Delete hotspot
  const performDelete = async () => {
    try {
      const result = await deleteHotspot(deleteConfirmation.hotspotId);
      
      if (result) {
        // Reset selection
        setSelectedHotspot(null);
        setHotspotForm({
          name: '',
          type: 'PRIMARY',
          infoPanel: {
            title: '',
            description: ''
          }
        });
        
        // Also clear the selected map pin and points
        setSelectedMapPin(null);
        setPoints([]);
        
        // Refresh hotspots and redraw
        await fetchHotspots(selectedLocation._id);
        if (drawExistingHotspotsRef.current) {
          drawExistingHotspotsRef.current(true);
        }
        
        toast({
          title: "Success",
          description: `Hotspot "${deleteConfirmation.hotspotName}" has been deleted successfully`,
          variant: "success"
        });
        
        // Close the confirmation dialog
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete hotspot",
        variant: "destructive"
      });
      
      // Close the confirmation dialog
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Show warning when leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (creationStep > 0 || isEditingPoints) {
        // Show browser's unsaved changes warning
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [creationStep, isEditingPoints]);
  
  // Clear selectedMapPin if its hotspot no longer exists
  useEffect(() => {
    if (!selectedMapPin || !hotspots || hotspots.length === 0) return;
    
    // Skip this check if we're in the process of editing a hotspot
    // or if we're in the map pin selection phase of hotspot creation
    // or if we're programmatically updating a map pin
    if (selectedHotspot || creationStep > 0 || isUpdatingMapPinRef.current) {
      console.log("Skipping map pin validation check - we're actively editing or updating");
      return;
    }
    
    // Add a small debounce to prevent rapid clearing/setting cycles
    const timerId = setTimeout(() => {
      // Check if the selectedMapPin belongs to any existing hotspot
      const pinBelongsToHotspot = hotspots.some(h => 
        h.mapPin && 
        (typeof h.mapPin === 'object' ? 
          String(h.mapPin._id) === String(selectedMapPin._id) : 
          String(h.mapPin) === String(selectedMapPin._id))
      );
      
      if (!pinBelongsToHotspot) {
        console.log("Clearing selectedMapPin as its hotspot was deleted");
        
        // Clear the localStorage data to prevent autorestoration
        localStorage.removeItem('hotspotMapPinData');
        
        // Set pin to null
        setSelectedMapPin(null);
        
        // Force a redraw to remove the pin from the canvas
        if (drawExistingHotspotsRef.current) {
          setTimeout(() => {
            drawExistingHotspotsRef.current(true);
          }, 100);
        }
      }
    }, 200);  // 200ms debounce
    
    // Clean up timer on unmount or dependency change
    return () => clearTimeout(timerId);
  }, [hotspots, selectedMapPin, setSelectedMapPin, drawExistingHotspotsRef, selectedHotspot, creationStep]);
  
  // Create a wrapper for handling hover events from the list
  const handleHotspotHover = useCallback((hotspot) => {
    setHoveredHotspot(hotspot);
    // Force a redraw with hover update but don't trigger map pin redraw
    if (drawExistingHotspotsRef.current) {
      setTimeout(() => {
        drawExistingHotspotsRef.current(false, true);
      }, 0);
    }
  }, [setHoveredHotspot, drawExistingHotspotsRef]);
  
  // Update an existing hotspot
  const handleUpdateHotspot = async (e) => {
    if (e) e.preventDefault();
    
    if (!selectedHotspot) return;
    
    setSaving(true);
    
    try {
      // Get the center point from existing points or calculate a new one if points changed
      let centerPoint = selectedHotspot.centerPoint;
      let coordinatesToUse;
      
      // Determine which coordinates to use:
      // 1. If we have lastEditedCoordinates from a recent shape edit, use those
      // 2. Otherwise, use the correct coordinates based on editing state
      if (lastEditedCoordinates && lastEditedCoordinates.length >= 3) {
        console.log("Using lastEditedCoordinates for update:", lastEditedCoordinates.length, "points");
        coordinatesToUse = lastEditedCoordinates;
        
        // Recalculate center point based on these coordinates
        const sumX = coordinatesToUse.reduce((acc, point) => acc + point.x, 0);
        const sumY = coordinatesToUse.reduce((acc, point) => acc + point.y, 0);
        
        centerPoint = {
          x: sumX / coordinatesToUse.length,
          y: sumY / coordinatesToUse.length
        };
      } else if (isEditingPoints && points.length >= 3) {
        // If still in editing mode and we have valid points, use current points
        console.log("Using current points for update:", points.length, "points");
        coordinatesToUse = points;
        
        // Recalculate center point
        const sumX = coordinatesToUse.reduce((acc, point) => acc + point.x, 0);
        const sumY = coordinatesToUse.reduce((acc, point) => acc + point.y, 0);
        
        centerPoint = {
          x: sumX / coordinatesToUse.length,
          y: sumY / coordinatesToUse.length
        };
      } else {
        // Fall back to selected hotspot coordinates
        console.log("Using selectedHotspot.coordinates for update");
        coordinatesToUse = selectedHotspot.coordinates;
      }
      
      console.log("Updating hotspot with current state:", {
        name: hotspotForm.name,
        type: hotspotForm.type,
        mapPin: selectedMapPin ? { id: selectedMapPin._id, name: selectedMapPin.name } : null,
        uiElement: selectedUIElement ? { id: selectedUIElement._id, name: selectedUIElement.name } : null,
        coordinatesCount: coordinatesToUse?.length || 0
      });
      
      // Construct update data
      const updateData = {
        ...hotspotForm,
        coordinates: coordinatesToUse,
        centerPoint,
        mapPin: selectedMapPin ? selectedMapPin._id : null
      };
      
      // Add UI element reference for SECONDARY hotspots with UI element mode
      if (hotspotForm.type === 'SECONDARY' && selectedUIElement) {
        console.log(`Adding UI element to update data: ${selectedUIElement.name} (${selectedUIElement._id})`);
        updateData.uiElement = selectedUIElement._id;
      } else {
        // Explicitly set to null to remove any existing UI element
        console.log("No UI element selected, explicitly setting to null");
        updateData.uiElement = null;
      }
      
      console.log("Sending update request with data:", updateData);
      
      const result = await updateHotspot(selectedHotspot._id, updateData);
      
      if (result) {
        console.log("Hotspot updated successfully:", result);
        
        // Update UI state
        setSelectedHotspot(null);
        setIsEditingPoints(false);
        setDrawingMode(false);
        setPoints([]);
        setLastEditedCoordinates(null); // Clear the lastEditedCoordinates
        resetCreationState();
        
        // Refresh hotspots
        await fetchHotspots(selectedLocation._id);
        
        // Show success message
        toast({
          title: "Success",
          description: `Hotspot "${hotspotForm.name}" has been updated successfully`,
          variant: "success"
        });
      }
    } catch (error) {
      console.error("Error updating hotspot:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update hotspot",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Start editing points of an existing hotspot
  const startEditingPoints = () => {
    if (!selectedHotspot) return;
    
    // Load existing coordinates to the editing state
    if (selectedHotspot.coordinates && Array.isArray(selectedHotspot.coordinates)) {
      // First clear both canvases completely to prevent ghosting using our thorough clearing function
      clearCanvases();
      
      // Clear any previously selected map pin from view while editing
      setSelectedMapPin(null);
      
      // Then set the new state and mode
      setPoints(selectedHotspot.coordinates);
      setIsEditingPoints(true);
      setDrawingMode(true);
      
      // Force a redraw with a short delay to ensure state updates have been applied
      setTimeout(() => {
        if (drawExistingHotspotsRef.current) {
          console.log("Forcing redraw after entering edit mode");
          drawExistingHotspotsRef.current(true);
        }
        
        // Dispatch custom event to force-clear the map pins
        if (canvasRef.current) {
          canvasRef.current.dispatchEvent(new CustomEvent('forceMapPinDraw', {
            detail: {
              timestamp: Date.now(),
              source: 'startEditingPoints',
              clearOnly: true,
              force: true
            }
          }));
        }
      }, 50);
    } else {
      // Handle the case where coordinates don't exist
      toast({
        title: "No coordinates found",
        description: "This hotspot doesn't have any coordinates to edit.",
        variant: "destructive"
      });
    }
  };
  
  // Add keyboard shortcuts for hotspot editing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (drawingMode) {
        // Escape key to cancel drawing
        if (e.key === 'Escape') {
          const confirmExit = window.confirm('Cancel drawing? All points will be lost.');
          if (confirmExit) {
            // Reset drawing state without relying on cancelDrawing
            setDrawingMode(false);
            setPoints([]);
            if (creationStep > 0) {
              setCreationStep(1); // Go back to info step
            } else if (isEditingPoints) {
              setIsEditingPoints(false);
            }
          }
        }
        
        // Z key for undo (with Ctrl/Cmd)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          undoLastPoint();
          e.preventDefault();
        }
        
        // Enter key to finish drawing (if enough points)
        if (e.key === 'Enter' && points.length >= 3) {
          if (creationStep === 2) {
            finishDrawingAndReview();
          } else if (isEditingPoints) {
            finishEditingPoints();
          }
          e.preventDefault();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawingMode, creationStep, isEditingPoints, points.length, undoLastPoint, finishDrawingAndReview, finishEditingPoints, setDrawingMode, setPoints, setIsEditingPoints, setCreationStep]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 w-full h-screen overflow-y-auto bg-netflix-black text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading hotspots...</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-netflix-black text-white">
      {/* Location selector */}
      <div className="mb-6 flex flex-wrap items-center">
        <label htmlFor="location" className="mr-3 font-bold text-white mb-2 md:mb-0">
          Location:
        </label>
        <Select
          value={selectedLocation?._id || ''}
          onValueChange={handleLocationChange}
          disabled={isLoading || isLoadingAerial || drawingMode}
        >
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Select a location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map(location => (
              <SelectItem key={location._id} value={location._id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedLocation ? (
        <div className="flex flex-col space-y-6">
          {/* Row 1: Canvas for drawing hotspots - full width */}
          <Card className="border-netflix-gray">
            <CardContent className="p-6 !pt-6">
              <HotspotCanvas
                videoRef={videoRef}
                canvasRef={canvasRef}
                canvasContainerRef={canvasContainerRef}
                aerialAsset={aerialAsset}
                isLoadingAerial={isLoadingAerial}
                useVideoFallback={useVideoFallback}
                videoLoaded={videoLoaded}
                setVideoLoaded={setVideoLoaded}
                handleVideoLoad={handleVideoLoad}
                handleVideoError={handleVideoError}
                videoKey={videoKey}
                handleCanvasClick={handleCanvasClickWrapper}
                handleCanvasHover={handleCanvasHover}
                drawingMode={drawingMode}
                creationStep={creationStep}
                getVideoUrl={getVideoUrl}
                selectedMapPin={selectedMapPin}
                points={points}
                hotspots={processedHotspots}
              />
            </CardContent>
          </Card>
          
          {/* Row 2: Hotspot controls - full width with responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* STEP 0: Initial State - HotspotList */}
            {creationStep === 0 && !isEditingPoints && !selectedHotspot && (
              <div className="md:col-span-2 lg:col-span-3">
                <HotspotList 
                  hotspots={hotspots}
                  selectedHotspot={selectedHotspot}
                  hoveredHotspot={hoveredHotspot}
                  selectHotspot={selectHotspot}
                  setHoveredHotspot={handleHotspotHover}
                  startHotspotCreation={startHotspotCreation}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  drawingMode={drawingMode}
                />
              </div>
            )}
            
            {/* HotspotCreation - handles steps 1-4 of creation */}
            {creationStep > 0 && (
              <div className="md:col-span-2 lg:col-span-3">
                <HotspotCreation
                  creationStep={creationStep}
                  hotspotForm={hotspotForm}
                  handleInputChange={handleInputChange}
                  handleSelectChange={handleSelectChange}
                  proceedToDrawing={proceedToDrawing}
                  resetCreationState={resetCreationState}
                  points={points}
                  undoLastPoint={undoLastPoint}
                  onFinishDrawingClick={onFinishDrawingClick}
                  draftHotspot={draftHotspot}
                  setCreationStep={setCreationStep}
                  saveNewHotspot={saveNewHotspot}
                  isSaving={isSaving}
                  selectedMapPin={selectedMapPin}
                  setSelectedMapPin={handleSetSelectedMapPin}
                  onMapPinSelectionComplete={onMapPinSelectionComplete}
                  locationId={selectedLocation?._id}
                  setHotspotForm={setHotspotForm}
                  onSave={saveNewHotspot}
                  secondaryMode={secondaryMode}
                  setSecondaryMode={setSecondaryMode}
                />
              </div>
            )}
            
            {/* HotspotEditor - for editing existing hotspots */}
            {selectedHotspot && !creationStep && (
              <div className="md:col-span-2 lg:col-span-3">
                <HotspotEditor
                  selectedHotspot={selectedHotspot}
                  hotspotForm={hotspotForm}
                  handleInputChange={handleInputChange}
                  handleSelectChange={handleSelectChange}
                  handleUpdateHotspot={handleUpdateHotspot}
                  startEditingPoints={startEditingPoints}
                  handleDeleteClick={handleDeleteClick}
                  setSelectedHotspot={setSelectedHotspot}
                  isSaving={isSaving}
                  editingPoints={isEditingPoints}
                  points={points}
                  finishEditingPoints={finishEditingPoints}
                  undoLastPoint={undoLastPoint}
                  setEditingPoints={setIsEditingPoints}
                  setDrawingMode={setDrawingMode}
                  setPoints={setPoints}
                  drawExistingHotspots={drawExistingHotspotsRef.current}
                  selectedMapPin={selectedMapPin}
                  setSelectedMapPin={handleSetSelectedMapPin}
                  locationId={selectedLocation?._id}
                  selectedUIElement={selectedUIElement}
                  setSelectedUIElement={setSelectedUIElement}
                  isUpdatingMapPin={isUpdatingMapPin}
                  setIsUpdatingMapPin={setIsUpdatingMapPin}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-netflix-dark p-8 rounded-md text-center">
          <p className="text-netflix-lightgray mb-6">Please select a location to manage hotspots.</p>
          {locations.length === 0 && (
            <Button 
              onClick={() => window.location.href = '/admin/locations'}
              className="bg-netflix-red hover:bg-netflix-red/80"
            >
              Go to Location Management
            </Button>
          )}
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={performDelete}
        title="Delete Hotspot"
        description="Are you sure you want to delete this hotspot? This action cannot be undone."
        itemName={deleteConfirmation.hotspotName}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

// Add a helper function to process map pins for all hotspots
const processHotspotMapPins = async (hotspots) => {
  if (!hotspots || hotspots.length === 0) {
    console.log("No hotspots to process");
    return [];
  }
  
  console.log(`Processing ${hotspots.length} hotspots to ensure map pins are loaded`);
  
  // Create a new array instead of a shallow copy to ensure React detects changes
  const processedHotspots = JSON.parse(JSON.stringify(hotspots));
  
  // Process each hotspot in parallel using Promise.all
  await Promise.all(
    processedHotspots.map(async (hotspot, index) => {
      try {
        // Skip if no map pin
        if (!hotspot.mapPin) {
          console.log(`Hotspot ${hotspot.name} has no map pin`);
          return;
        }
        
        // Check if map pin is already a full object with accessUrl
        if (typeof hotspot.mapPin === 'object' && hotspot.mapPin.accessUrl) {
          console.log(`Hotspot ${hotspot.name} already has complete map pin data:`, {
            name: hotspot.mapPin.name,
            id: hotspot.mapPin._id,
            accessUrl: hotspot.mapPin.accessUrl
          });
          
          // Check if the accessUrl is properly formatted
          if (!hotspot.mapPin.accessUrl.startsWith('http') && !hotspot.mapPin.accessUrl.startsWith('/api')) {
            console.log(`Fixing malformed accessUrl for hotspot ${hotspot.name}`);
            hotspot.mapPin.accessUrl = hotspot.mapPin.accessUrl.startsWith('/') ? 
              `${baseBackendUrl}${hotspot.mapPin.accessUrl}` : 
              `${baseBackendUrl}/api/assets/file/MapPin/${hotspot.mapPin.accessUrl}`;
          }
          return;
        }
        
        // Determine the ID string
        const mapPinId = typeof hotspot.mapPin === 'string' ? 
          hotspot.mapPin : 
          (hotspot.mapPin.$oid || hotspot.mapPin._id || hotspot.mapPin);
          
        console.log(`Fetching full map pin data for hotspot ${hotspot.name}, ID: ${mapPinId}`);
        
        // Fetch the full map pin object
        const response = await api.getAssetById(mapPinId);
        
        if (response.error) {
          console.error(`Error fetching map pin for hotspot ${hotspot.name}:`, response.message);
          // Set a fallback object with the ID so we know it's been processed
          hotspot.mapPin = { 
            _id: mapPinId, 
            error: true, 
            message: response.message,
            // Add basic properties needed by the renderer
            type: 'MapPin',
            name: 'Error Loading Map Pin'
          };
          return;
        }
        
        if (response.data) {
          console.log(`Successfully loaded map pin for ${hotspot.name}:`, response.data.name);
          // Update the hotspot with the full map pin data
          hotspot.mapPin = response.data;
          
          // Verify accessUrl is present and properly formatted
          if (!hotspot.mapPin.accessUrl) {
            console.error(`Map pin ${response.data.name} has no accessUrl`);
            hotspot.mapPin.error = true;
            hotspot.mapPin.message = 'Map pin is missing accessUrl';
          } else if (!hotspot.mapPin.accessUrl.startsWith('http') && !hotspot.mapPin.accessUrl.startsWith('/api')) {
            // Fix incorrectly formatted URLs
            console.log(`Fixing accessUrl format for ${hotspot.name}`);
            hotspot.mapPin.accessUrl = hotspot.mapPin.accessUrl.startsWith('/') ? 
              `${baseBackendUrl}${hotspot.mapPin.accessUrl}` : 
              `${baseBackendUrl}/api/assets/file/MapPin/${hotspot.mapPin.accessUrl}`;
          }
        } else {
          console.error(`No data returned for map pin ID ${mapPinId}`);
          hotspot.mapPin = { 
            _id: mapPinId, 
            error: true,
            message: 'No data returned from API',
            type: 'MapPin',
            name: 'Missing Map Pin'
          };
        }
      } catch (error) {
        console.error(`Error processing map pin for hotspot ${hotspot.name}:`, error);
        // Set a fallback object so we know it's been processed
        if (hotspot.mapPin) {
          const mapPinId = typeof hotspot.mapPin === 'string' ? 
            hotspot.mapPin : 
            (hotspot.mapPin.$oid || hotspot.mapPin._id || hotspot.mapPin);
            
          hotspot.mapPin = { 
            _id: mapPinId, 
            error: true,
            message: error.message,
            type: 'MapPin',
            name: 'Error Loading Map Pin'
          };
        }
      }
    })
  );
  
  console.log(`Finished processing ${processedHotspots.length} hotspots`);
  return processedHotspots;
};

export default Hotspots;

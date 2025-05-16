// client/src/pages/Admin/Hotspots.js - Hotspot management tab

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAdmin } from '../../context/AdminContext';
import api from '../../utils/api';
import { useToast } from '../../components/ui/use-toast';
import { DeleteConfirmation } from '../../components/ui/DeleteConfirmation';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';

// Import new components
import HotspotCanvas from '../../components/Hotspot/HotspotCanvas';
import HotspotList from '../../components/Hotspot/HotspotList';
import HotspotEditor from '../../components/Hotspot/HotspotEditor';
import HotspotCreation from '../../components/Hotspot/HotspotCreation';
import useHotspotDrawing from '../../components/Hotspot/useHotspotDrawing';

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

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    hotspotId: null,
    hotspotName: ''
  });
  
  // New state variables for improved workflow
  const [creationStep, setCreationStep] = useState(0); // 0=idle, 1=info, 2=drawing, 3=review
  const [draftHotspot, setDraftHotspot] = useState(null);
  const [videoKey, setVideoKey] = useState(0);
  
  // Add a flag to prevent multiple draft restorations
  const [draftRestored, setDraftRestored] = useState(false);

  // Define points state here to use before hook initialization
  const [points, setPoints] = useState([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);

  // Select a hotspot
  const selectHotspot = (hotspot) => {
    setSelectedHotspot(hotspot);
    setDrawingMode(false);
    setPoints([]);
    
    // Update form with hotspot data
    setHotspotForm({
      name: hotspot.name,
      type: hotspot.type,
      infoPanel: {
        title: hotspot.infoPanel?.title || '',
        description: hotspot.infoPanel?.description || ''
      }
    });
    
    // Redraw hotspots to highlight selected one
    drawExistingHotspots && drawExistingHotspots();
  };

  // Use the custom drawing hook (placed after selectHotspot is defined)
  const {
    drawExistingHotspots,
    cancelDrawing,
    undoLastPoint,
    handleCanvasClick,
    handleCanvasHover,
    finishDrawing
  } = useHotspotDrawing(canvasRef, hotspots, selectedHotspot, hotspotForm, selectHotspot, drawingMode, setDrawingMode, points, setPoints);
  
  // Load hotspots when component mounts or becomes visible
  useEffect(() => {
    // Only fetch if we have a selected location
    if (selectedLocation?._id) {
      console.log("Hotspots component initialized/activated - fetching hotspots for:", selectedLocation.name);
      fetchHotspots(selectedLocation._id);
    }
  }, [selectedLocation, fetchHotspots]);
  
  // Load aerial video for the selected location
  useEffect(() => {
    const loadAerialVideo = async () => {
      if (!selectedLocation) return;
      
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
    const baseBackendUrl = 'http://localhost:3001';
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
  const handleLocationChange = (value) => {
    const location = locations.find(loc => loc._id === value);
    if (location) {
      setSelectedLocation(location);
      setSelectedHotspot(null);
      setPoints([]);
      setDrawingMode(false);
      
      // Always fetch hotspots when changing locations to ensure fresh data
      setTimeout(() => {
        fetchHotspots(location._id);
      }, 100); // Short delay to ensure location state is updated first
    }
  };
  
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
  
  // Finish drawing and move to review step - wrapped in useCallback
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
    
    // Update draft with coordinates
    setDraftHotspot(prev => ({
      ...prev,
      coordinates: points
    }));
    
    setCreationStep(3); // Move to review step
  }, [points, finishDrawing, toast, setDraftHotspot, setCreationStep]);
  
  // Save the newly created hotspot
  const saveNewHotspot = async () => {
    if (!draftHotspot || !hotspotForm.name) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Create hotspot data
    const hotspotData = {
      name: hotspotForm.name,
      type: hotspotForm.type,
      coordinates: points,
      infoPanel: hotspotForm.type === 'SECONDARY' ? hotspotForm.infoPanel : undefined
    };
    
    try {
      // Create hotspot
      const result = await createHotspot(hotspotData);
      
      if (result) {
        resetCreationState();
        
        toast({
          title: "Success",
          description: `Hotspot "${hotspotForm.name}" has been created successfully`,
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create hotspot",
        variant: "destructive"
      });
    }
  };
  
  // Reset all creation state
  const resetCreationState = () => {
    setPoints([]);
    setHotspotForm({
      name: '',
      type: 'PRIMARY',
      infoPanel: {
        title: '',
        description: ''
      }
    });
    setDraftHotspot(null);
    setCreationStep(0);
    setDrawingMode(false);
    
    // Remove draft from localStorage
    localStorage.removeItem('hotspotDraft');
    
    // Refresh hotspots and redraw
    fetchHotspots(selectedLocation._id);
    drawExistingHotspots();
  };
  
  // Save edited points of an existing hotspot - wrapped in useCallback
  const finishEditingPoints = useCallback(async () => {
    if (!selectedHotspot || points.length < 3) return;
    
    try {
      // Update hotspot with new coordinates
      const result = await updateHotspot(selectedHotspot._id, {
        ...hotspotForm,
        coordinates: points
      });
      
      if (result) {
        setEditingPoints(false);
        setDrawingMode(false);
        setPoints([]);
        await fetchHotspots(selectedLocation._id);
        drawExistingHotspots();
        
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
    }
  }, [selectedHotspot, points, updateHotspot, hotspotForm, setEditingPoints, setDrawingMode, setPoints, fetchHotspots, selectedLocation, drawExistingHotspots, toast]);

  // Custom handler for canvas clicks that handles both adding points and closing the loop
  const handleCanvasClickWrapper = (e) => {
    // handleCanvasClick returns true when clicking on the first point to close the loop
    const shouldCloseLoop = handleCanvasClick(e);
    
    // If we should close the loop, call the appropriate function based on mode
    if (shouldCloseLoop) {
      if (creationStep === 2) {
        finishDrawingAndReview();
      } else if (editingPoints) {
        finishEditingPoints();
      }
    }
  };
  
  // Function called by the Finish Drawing button 
  const onFinishDrawingClick = () => {
    if (creationStep === 2) {
      finishDrawingAndReview();
    } else if (editingPoints) {
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
  
  // Update canvas when hotspots change
  useEffect(() => {
    if (videoLoaded && drawExistingHotspots) {
      drawExistingHotspots();
      console.log("Drawing hotspots after data update:", hotspots.length);
    }
  }, [hotspots, videoLoaded, drawExistingHotspots]);
  
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
        
        // Refresh hotspots and redraw
        await fetchHotspots(selectedLocation._id);
        drawExistingHotspots();
        
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

  // Update existing hotspot
  const handleUpdateHotspot = async (e) => {
    e.preventDefault();
    
    if (!selectedHotspot) return;
    
    // Update hotspot data
    const hotspotData = {
      name: hotspotForm.name,
      type: hotspotForm.type,
      infoPanel: hotspotForm.type === 'SECONDARY' ? hotspotForm.infoPanel : undefined
    };
    
    try {
      // Update hotspot
      const result = await updateHotspot(selectedHotspot._id, hotspotData);
      
      if (result) {
        // Refresh hotspots and redraw
        await fetchHotspots(selectedLocation._id);
        drawExistingHotspots();
        
        toast({
          title: "Success",
          description: `Hotspot "${hotspotForm.name}" has been updated successfully`,
          variant: "success"
        });
        
        // Reset selected hotspot to return to the hotspot list
        setSelectedHotspot(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update hotspot",
        variant: "destructive"
      });
    }
  };
  
  // Start editing points of an existing hotspot
  const startEditingPoints = () => {
    if (!selectedHotspot) return;
    
    // Load existing coordinates to the editing state
    if (selectedHotspot.coordinates && Array.isArray(selectedHotspot.coordinates)) {
      setPoints(selectedHotspot.coordinates);
      setEditingPoints(true);
      setDrawingMode(true);
    } else {
      // Handle the case where coordinates don't exist
      toast({
        title: "No coordinates found",
        description: "This hotspot doesn't have any coordinates to edit.",
        variant: "destructive"
      });
    }
  };
  
  // Load draft hotspot from localStorage if it exists
  useEffect(() => {
    if (selectedLocation?._id && !draftRestored) {
      const savedDraft = localStorage.getItem('hotspotDraft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Check if the draft is for the current location
          if (parsed.locationId === selectedLocation._id) {
            setDraftHotspot(parsed.hotspot);
            setPoints(parsed.points || []);
            setHotspotForm(parsed.form);
            setCreationStep(parsed.step || 1);
            
            // If we were in drawing mode, restore it
            if (parsed.step === 2) {
              setDrawingMode(true);
            }
            
            // Mark as restored to prevent infinite loop
            setDraftRestored(true);
            
            toast({
              title: "Draft Restored",
              description: "Your unsaved hotspot has been restored.",
              variant: "success"
            });
          }
        } catch (e) {
          console.error("Error parsing saved draft:", e);
          localStorage.removeItem('hotspotDraft');
        }
      }
    }
  }, [selectedLocation, toast, setDrawingMode, draftRestored, setPoints, setHotspotForm, setCreationStep, setDraftHotspot, setDraftRestored]);

  // Add keyboard shortcuts for hotspot editing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (drawingMode) {
        // Escape key to cancel drawing
        if (e.key === 'Escape') {
          const confirmExit = window.confirm('Cancel drawing? All points will be lost.');
          if (confirmExit) {
            cancelDrawing();
            if (creationStep > 0) {
              setCreationStep(1); // Go back to info step
            } else if (editingPoints) {
              setEditingPoints(false);
              setDrawingMode(false);
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
          } else if (editingPoints) {
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
  }, [drawingMode, creationStep, editingPoints, points.length, cancelDrawing, finishDrawingAndReview, finishEditingPoints, setDrawingMode, undoLastPoint, setEditingPoints]);

  // Show warning when leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (creationStep > 0 || editingPoints) {
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
  }, [creationStep, editingPoints]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading hotspots...</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white">
      <h1 className="text-2xl font-bold text-netflix-red border-b border-netflix-gray pb-3 mb-6">Hotspot Management</h1>
      
      {/* Location selector */}
      <div className="mb-6 flex items-center">
        <label htmlFor="location" className="mr-3 font-bold text-white">
          Location:
        </label>
        <Select
          value={selectedLocation ? selectedLocation._id : ''}
          onValueChange={handleLocationChange}
          disabled={isLoading || drawingMode}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a location" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {locations.map(location => (
                <SelectItem key={location._id} value={location._id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      {selectedLocation ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas for drawing hotspots */}
          <div className="lg:col-span-2">
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
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Hotspot controls */}
          <div className="lg:col-span-1">
            {/* STEP 0: Initial State - HotspotList */}
            {creationStep === 0 && !editingPoints && !selectedHotspot && (
              <HotspotList 
                hotspots={hotspots}
                selectedHotspot={selectedHotspot}
                selectHotspot={selectHotspot}
                startHotspotCreation={startHotspotCreation}
                isLoading={isLoading}
                isSaving={isSaving}
                drawingMode={drawingMode}
              />
            )}
            
            {/* HotspotCreation - handles steps 1-3 of creation */}
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
            />
            
            {/* HotspotEditor - for editing existing hotspots */}
            {selectedHotspot && !creationStep && (
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
                editingPoints={editingPoints}
                points={points}
                finishEditingPoints={finishEditingPoints}
                undoLastPoint={undoLastPoint}
                setEditingPoints={setEditingPoints}
                setDrawingMode={setDrawingMode}
                setPoints={setPoints}
                drawExistingHotspots={drawExistingHotspots}
              />
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

export default Hotspots;

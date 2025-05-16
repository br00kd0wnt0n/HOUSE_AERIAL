// client/src/pages/Admin/Assets.js - Asset management tab

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';

// Import shadcn/ui components
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from '../../components/ui/alert';
import { FileUpload } from '../../components/ui/file-upload';
import VideoPreview from '../../components/VideoPlayer/VideoPreview';
import { useToast } from '../../components/ui/use-toast';
import { DeleteConfirmation } from '../../components/ui/DeleteConfirmation';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';

// Add custom CSS
const customRadioStyles = {
  radioGroup: 'grid grid-cols-2 gap-4',
  radioItem: 'flex items-center space-x-2',
  radioButton: 'flex items-center justify-center w-6'
};

// Get API base URL from environment or use a default
const API_BASE_URL = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

const Assets = () => {
  const { 
    locations,
    selectedLocation,
    setSelectedLocation,
    assetsByType,
    isLoading: adminIsLoading,
    isSaving,
    setSaveStatus,
    uploadAsset,
    deleteAsset,
    fetchAssets,
    fetchInProgress: adminFetchInProgress,
    pushChangesToFrontend,
    fetchedLocationIds
  } = useAdmin();
  
  console.log('[Assets Component Mount/Render] Context values:', {
    locationsCount: locations?.length || 0,
    selectedLocationId: selectedLocation?._id || 'none',
    adminIsLoading,
    adminFetchInProgress,
    fetchedLocationIds: fetchedLocationIds ? [...fetchedLocationIds] : []
  });
  
  // Define activeTab state first
  const [activeTab, setActiveTab] = useState('AERIAL');
  
  // Memoize asset types to prevent recreation on each render
  const assetTypes = useMemo(() => [
    { id: 'AERIAL', label: 'Aerial Videos' },
    { id: 'DiveIn', label: 'Dive-In Videos' },
    { id: 'FloorLevel', label: 'Floor Level Videos' },
    { id: 'ZoomOut', label: 'Zoom-Out Videos' },
    { id: 'Transition', label: 'Transition Videos' },
    { id: 'Button', label: 'Buttons' },
    { id: 'MapPin', label: 'Map Pins' },
    { id: 'UIElement', label: 'UI Elements' }
  ], []);
  
  // Define current asset type
  const currentAssetType = useMemo(() => 
    assetTypes.find(t => t.id === activeTab),
    [assetTypes, activeTab]
  );
  
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'AERIAL',
    file: null,
    fileName: '',
    buttonState: 'OFF' // Default button state
  });
  
  // Store image dimensions for validation
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Managed URL states for button previews
  const [previewUrl, setPreviewUrl] = useState('');
  const [oppositeButtonUrl, setOppositeButtonUrl] = useState('');
  
  const fileInputRef = useRef(null);
  
  // Add error state
  const [error, setError] = useState(null);
  
  // Add state for delete confirmation dialogs
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    assetId: null,
    assetName: '',
    isBulkDelete: false
  });
  
  // Add toast hook
  const { toast } = useToast();
  
  // Create and cleanup object URL for file preview
  useEffect(() => {
    if (uploadForm.file) {
      const url = URL.createObjectURL(uploadForm.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return () => {};
  }, [uploadForm.file]);
  
  // Find opposite button state (ON/OFF) for the selected location
  const getOppositeButtonUrl = useCallback(() => {
    if (!selectedLocation || !assetsByType.Button || !assetsByType.Button.length) {
      return null;
    }
    
    const oppositeState = uploadForm.buttonState === 'ON' ? 'OFF' : 'ON';
    const oppositeButtonSuffix = `_Button_${oppositeState}`;
    
    const oppositeButton = assetsByType.Button.find(asset => 
      asset.location && 
      asset.location._id === selectedLocation._id && 
      asset.name.endsWith(oppositeButtonSuffix)
    );
    
    return oppositeButton?.accessUrl ? `${API_BASE_URL}${oppositeButton.accessUrl}` : null;
  }, [selectedLocation, assetsByType.Button, uploadForm.buttonState]);
  
  // Update opposite button URL when needed
  useEffect(() => {
    setOppositeButtonUrl(getOppositeButtonUrl());
  }, [getOppositeButtonUrl]);
  
  // Filter assets based on selected tab and location
  const getFilteredAssets = useCallback(() => {
    const assetsForType = assetsByType[activeTab] || [];
    console.log(`Filtering assets for type ${activeTab}:`, assetsForType);
    
    // For location-specific assets, filter by selected location
    if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button'].includes(activeTab)) {
      if (!selectedLocation) {
        console.log('No location selected for location-specific assets');
        return []; // Return empty array if no location selected for location-specific assets
      }
      const filtered = assetsForType.filter(asset => 
        asset.location && asset.location._id === selectedLocation._id
      );
      console.log(`Filtered ${activeTab} assets for location ${selectedLocation._id}:`, filtered);
      return filtered;
    }
    
    // For non-location-specific assets (UI elements, map pins, etc.), show all
    console.log(`Showing all ${activeTab} assets:`, assetsForType);
    return assetsForType;
  }, [activeTab, assetsByType, selectedLocation]);

  // Debug logging
  useEffect(() => {
    console.log('Assets component render:', {
      selectedLocation,
      activeTab,
      assetsByType: assetsByType[activeTab],
      adminIsLoading,
      adminFetchInProgress,
      filteredAssets: getFilteredAssets()
    });
  }, [selectedLocation, activeTab, assetsByType, adminIsLoading, adminFetchInProgress, getFilteredAssets]);
  
  // Memoize filtered assets to prevent unnecessary recalculations
  const filteredAssets = useMemo(() => getFilteredAssets(), [getFilteredAssets]);
  
  // Memoize handlers to prevent recreation on each render
  const handleLocationChange = useCallback((value) => {
    const location = locations.find(loc => loc._id === value);
    if (location) {
      console.log('Changing location to:', location);
      setSelectedLocation(location);
      
      // Auto-generate button name if we're in Button tab
      if (activeTab === 'Button' && location) {
        const buttonSuffix = uploadForm.buttonState === 'ON' ? '_Button_ON' : '_Button_OFF';
        setUploadForm(prev => ({ 
          ...prev, 
          name: `${location.name}${buttonSuffix}` 
        }));
      }
    }
  }, [locations, setSelectedLocation, activeTab, uploadForm.buttonState]);
  
  const handleTabChange = useCallback((value) => {
    console.log('Changing tab to:', value);
    setActiveTab(value);
    setUploadForm(prev => ({ 
      ...prev, 
      type: value,
      // Reset button state when changing tabs
      ...(value === 'Button' ? {} : { buttonState: 'OFF' })
    }));
  }, []);

  // Handle button state change
  const handleButtonStateChange = useCallback((value) => {
    console.log('Changing button state to:', value);
    setUploadForm(prev => {
      // Update the name if location is selected
      let updatedName = prev.name;
      if (selectedLocation && activeTab === 'Button') {
        // Replace the _ON or _OFF suffix
        if (updatedName.endsWith('_Button_ON') || updatedName.endsWith('_Button_OFF')) {
          updatedName = updatedName.substring(0, updatedName.lastIndexOf('_Button_')) + '_Button_' + value;
        } else {
          updatedName = `${selectedLocation.name}_Button_${value}`;
        }
      }
      
      return {
        ...prev,
        buttonState: value,
        name: updatedName
      };
    });
  }, [activeTab, selectedLocation]);

  // File type validation
  const isValidFileType = useCallback((file, isVideoType) => {
    const validVideoTypes = ['video/mp4', 'video/quicktime'];
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    
    if (isVideoType) {
      return validVideoTypes.includes(file.type);
    } else {
      // For Button assets, only allow PNG and JPG
      if (activeTab === 'Button') {
        return ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
      }
      return validImageTypes.includes(file.type);
    }
  }, [activeTab]);
  
  // Get image dimensions
  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for dimension check'));
      };
      img.src = URL.createObjectURL(file);
    });
  };
  
  // Check if dimensions match existing button for the same location
  const checkButtonDimensions = useCallback(async (file, locationId, buttonState) => {
    if (!locationId || activeTab !== 'Button') return true;
    
    try {
      // Get dimensions of the current file
      const dimensions = await getImageDimensions(file);
      setImageDimensions(dimensions);
      
      // Find opposite button state for this location
      const oppositeState = buttonState === 'ON' ? 'OFF' : 'ON';
      const oppositeButtonSuffix = `_Button_${oppositeState}`;
      
      const existingButtons = assetsByType.Button.filter(asset => 
        asset.location && asset.location._id === locationId && 
        asset.name.endsWith(oppositeButtonSuffix)
      );
      
      if (existingButtons.length === 0) {
        // No opposite button exists yet, so dimensions are valid
        return true;
      }
      
      // Load the existing button image to check dimensions
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const existingDimensions = { width: img.width, height: img.height };
          const dimensionsMatch = dimensions.width === existingDimensions.width && 
                                  dimensions.height === existingDimensions.height;
          
          if (!dimensionsMatch) {
            toast({
              title: "Dimension Mismatch",
              description: `This button's dimensions (${dimensions.width}x${dimensions.height}) don't match the existing ${oppositeState} button (${existingDimensions.width}x${existingDimensions.height}). Both ON and OFF buttons must have the same dimensions.`,
              variant: "destructive",
            });
          }
          
          resolve(dimensionsMatch);
        };
        img.onerror = () => {
          // If we can't load the image, assume dimensions are valid
          resolve(true);
        };
        img.src = existingButtons[0].accessUrl ? `${API_BASE_URL}${existingButtons[0].accessUrl}` : '';
      });
    } catch (error) {
      console.error('Error checking button dimensions:', error);
      return false;
    }
  }, [activeTab, assetsByType.Button, toast]);
  
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if current asset type requires a video or image
    const requiresVideo = ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(activeTab);
    
    // Validate file type
    if (!isValidFileType(file, requiresVideo)) {
      const allowedTypes = requiresVideo 
        ? 'MP4 or QuickTime video' 
        : activeTab === 'Button' 
          ? 'PNG or JPEG image'
          : 'PNG, JPEG, or GIF image';
      
      setError(null); // Clear any existing error first
      toast({
        title: "Invalid File Type",
        description: `This asset type only accepts ${allowedTypes} files.`,
        variant: "destructive",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // For Button assets, check dimensions if we have a location selected
    if (activeTab === 'Button' && selectedLocation) {
      const dimensionsValid = await checkButtonDimensions(
        file, 
        selectedLocation._id, 
        uploadForm.buttonState
      );
      
      if (!dimensionsValid) {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }
    
    // Auto-generate name for Button assets
    let fileName = file.name.split('.')[0]; // Default name from filename
    if (activeTab === 'Button' && selectedLocation) {
      fileName = `${selectedLocation.name}_Button_${uploadForm.buttonState}`;
    }
    
    setUploadForm(prev => ({
      ...prev,
      file,
      fileName: file.name,
      name: fileName
    }));
  }, [activeTab, isValidFileType, toast, selectedLocation, uploadForm.buttonState, checkButtonDimensions]);
  
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleUpload = useCallback(async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous errors
    
    if (!uploadForm.file) {
      setError(new Error('Please select a file to upload'));
      return;
    }
    
    // Determine if we need to associate with a location
    let locationId = null;
    if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button'].includes(uploadForm.type)) {
      if (!selectedLocation) {
        setError(new Error('Please select a location for this asset type'));
        return;
      }
      locationId = selectedLocation._id;
    }
    
    // For Button assets, enforce naming convention and validate
    if (uploadForm.type === 'Button') {
      // Ensure name follows the convention
      if (!uploadForm.name.endsWith(`_Button_${uploadForm.buttonState}`)) {
        // Auto-correct the name
        setUploadForm(prev => ({
          ...prev,
          name: `${selectedLocation.name}_Button_${uploadForm.buttonState}`
        }));
      }
      
      // Check for duplicate button with same location and state
      const duplicateButton = assetsByType.Button.find(
        asset => asset.location && 
                asset.location._id === locationId && 
                asset.name.endsWith(`_Button_${uploadForm.buttonState}`)
      );
      
      if (duplicateButton) {
        setError(new Error(`A ${uploadForm.buttonState} button already exists for this location. Delete the existing button first.`));
        toast({
          title: "Duplicate Button",
          description: `A ${uploadForm.buttonState} button already exists for ${selectedLocation.name}. Please delete the existing button first if you want to replace it.`,
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      // Set loading state
      setSaveStatus({ success: false, message: '' });
      
      // Upload the asset - only one upload at a time
      const result = await uploadAsset(
        uploadForm.file,
        uploadForm.name,
        uploadForm.type,
        locationId
      );
      
      if (result && selectedLocation?._id) {
        // Reset form
        setUploadForm({
          name: '',
          type: activeTab,
          file: null,
          fileName: '',
          buttonState: 'OFF' // Reset button state
        });
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Only fetch if we have a selected location
        await fetchAssets(selectedLocation._id);

        // Show success toast - use a single toast
        toast({
          title: "Upload Successful",
          description: `"${uploadForm.name}" has been uploaded successfully.`,
          variant: "success"
        });
      }
    } catch (err) {
      // Only show one error toast
      console.error('Upload error:', err);
      setError(err);
      
      toast({
        title: "Upload Failed",
        description: err.message || "There was an error uploading your file.",
        variant: "destructive"
      });
    }
  }, [uploadForm, selectedLocation, activeTab, uploadAsset, fetchAssets, setSaveStatus, toast, assetsByType.Button]);
  
  // Handle pushing changes to frontend
  const handlePushChanges = useCallback(async () => {
    try {
      await pushChangesToFrontend();
      toast({
        title: "Changes Pushed",
        description: "All changes have been successfully pushed to the frontend.",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Push Failed",
        description: error.message || "Failed to push changes to the frontend.",
        variant: "destructive"
      });
    }
  }, [pushChangesToFrontend, toast]);
  
  // Modify handleDeleteAsset to show confirmation dialog
  const handleDeleteAsset = useCallback((assetId, assetName) => {
    setDeleteConfirmation({
      isOpen: true,
      assetId,
      assetName,
      isBulkDelete: false
    });
  }, []);
  
  // Create a function to handle bulk delete confirmation
  const handleBulkDeleteConfirm = useCallback(() => {
    setDeleteConfirmation({
      isOpen: true,
      assetId: null,
      assetName: `${filteredAssets.length} ${currentAssetType?.label} Assets`,
      isBulkDelete: true
    });
  }, [filteredAssets, currentAssetType]);
  
  // Create a function to handle the actual deletion
  const performDelete = useCallback(async () => {
    // Clear any old toast state
    try {
      if (deleteConfirmation.isBulkDelete) {
        // Bulk delete
        setSaveStatus({ success: false, message: 'Deleting assets...' });
        let failures = 0;
        
        // Use sequential deletion instead of Promise.all to prevent multiple simultaneous errors
        for (const asset of filteredAssets) {
          try {
            await deleteAsset(asset._id);
          } catch (error) {
            console.error(`Error deleting asset ${asset.name}:`, error);
            failures++;
          }
        }
        
        setSaveStatus({ success: true, message: '' });
        
        // Only show one toast after all operations
        if (failures === 0) {
          toast({
            title: "Success",
            description: `Successfully deleted all ${currentAssetType?.label} assets.`,
            variant: "success"
          });
        } else {
          toast({
            title: "Partial Success",
            description: `Deleted ${filteredAssets.length - failures} assets. ${failures} assets failed to delete.`,
            variant: "destructive"
          });
        }
        
        // Refresh the asset list
        if (selectedLocation?._id) {
          await fetchAssets(selectedLocation._id);
        }
      } else {
        // Single asset delete
        setSaveStatus({ success: false, message: 'Deleting asset...' });
        try {
          await deleteAsset(deleteConfirmation.assetId);
          setSaveStatus({ success: true, message: '' });
          
          toast({
            title: "Success",
            description: `Successfully deleted ${deleteConfirmation.assetName}.`,
            variant: "success"
          });
          
          if (selectedLocation?._id) {
            await fetchAssets(selectedLocation._id);
          }
        } catch (error) {
          setSaveStatus({ success: false, message: '' });
          console.error('Error deleting asset:', error);
          
          toast({
            title: "Error",
            description: `Error deleting asset: ${error.message || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      }
      
      // Close the confirmation dialog
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      
    } catch (error) {
      setSaveStatus({ success: false, message: '' });
      console.error('Unexpected error in performDelete:', error);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      
      // Close the confirmation dialog
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  }, [deleteConfirmation, deleteAsset, fetchAssets, selectedLocation, filteredAssets, currentAssetType, toast, setSaveStatus]);
  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Memoize computed values
  const isLocationRequired = useMemo(() => 
    ['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(activeTab),
    [activeTab]
  );
  
  console.log('[Assets Component] Before main return - States:', {
    error,
    adminIsLoading,
    adminFetchInProgress,
    filteredAssetsLength: filteredAssets ? filteredAssets.length : 'undefined',
    locationsLength: locations ? locations.length : 'undefined',
    selectedLocationId: selectedLocation ? selectedLocation._id : 'none'
  });

  // Show loading state only when actually loading or fetching
  if (adminIsLoading || adminFetchInProgress) {
    console.log('[Assets Component] Loading state triggered');
    return (
      <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading assets...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Assets component error:', error);
    return (
      <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error Loading Assets</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show empty state if no locations
  if (!locations || locations.length === 0) {
    console.log('[Assets Component] No locations found. Rendering guidance.');
    return (
      <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white">
        <h1 className="text-2xl font-bold text-netflix-red border-b border-netflix-gray pb-3 mb-6">Asset Management</h1>
        <div className="bg-netflix-dark p-8 rounded-md text-center">
          <h2 className="text-xl font-bold mb-4">No Locations Found</h2>
          <p className="text-netflix-lightgray mb-6">Please create a location first before managing assets.</p>
          <Button 
            onClick={() => window.location.href = '/admin/locations'}
            className="bg-netflix-red hover:bg-netflix-red/80"
          >
            Go to Location Management
          </Button>
        </div>
      </div>
    );
  }

  // Empty state for assets
  if (!filteredAssets || filteredAssets.length === 0) {
    console.log('[Assets Component] No filtered assets. Rendering empty state for assets.', {
      filteredAssets,
      activeTab,
      selectedLocation,
      assetsByType: assetsByType[activeTab]
    });
    return (
      <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white">
        <h1 className="text-2xl font-bold text-netflix-red border-b border-netflix-gray pb-3 mb-6">Asset Management</h1>
        
        {/* Location selector */}
        <div className="mb-6 flex items-center">
          <label htmlFor="location" className="mr-3 font-bold text-white">
            Location:
          </label>
          <Select 
            value={selectedLocation?._id || ''} 
            onValueChange={handleLocationChange}
            disabled={!isLocationRequired}
          >
            <SelectTrigger className="w-[250px]">
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

        {/* Custom tabs implementation to match the UI migration example */}
        <div className="mb-6">
          <div className="flex border-b border-netflix-gray relative">
            {assetTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleTabChange(type.id)}
                className={`px-6 py-3 font-medium text-center whitespace-nowrap ${
                  activeTab === type.id 
                    ? 'bg-netflix-red text-white border-t border-l border-r border-netflix-gray rounded-t-md relative -mb-px' 
                    : 'bg-netflix-dark text-white hover:bg-netflix-gray/30'
                }`}
                disabled={adminIsLoading}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          {/* Tab content */}
          {assetTypes.map(type => (
            <div 
              key={type.id} 
              className={`bg-netflix-dark rounded-b-md rounded-tr-md p-0 ${activeTab === type.id ? 'block' : 'hidden'}`}
            >
              {/* Upload form */}
              <div className="p-6 mb-6">
                <h2 className="text-xl font-bold text-white border-b border-netflix-gray pb-3 mb-6">
                  Upload New {type.label}
                </h2>
                
                <form className="space-y-4" onSubmit={handleUpload}>
                  <div className="space-y-2">
                    <label htmlFor="file" className="block font-bold text-white">
                      Upload Media:
                    </label>
                    <FileUpload
                      id="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept={['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(type.id) ? 'video/mp4,video/quicktime' : 'image/png,image/jpeg,image/gif'}
                      disabled={isSaving}
                      className="bg-netflix-black/30"
                    />
                    {uploadForm.fileName && (
                      <span className="block text-sm text-netflix-lightgray mt-1">
                        Selected: {uploadForm.fileName}
                      </span>
                    )}
                    <div className="text-xs text-netflix-lightgray mt-1">
                      Accepted file types: {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(type.id) ? 'MP4, QuickTime videos' : 'PNG, JPEG, GIF images'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="name" className="block font-bold text-white">
                      Asset Name:
                    </label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={uploadForm.name}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      required
                      className="bg-netflix-gray border-netflix-gray"
                    />
                  </div>
                  
                  {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button'].includes(type.id) && (
                    <div className="text-netflix-lightgray text-sm p-3 bg-netflix-black/50 rounded">
                      This asset will be associated with:{' '}
                      <span className="font-bold text-white">
                        {selectedLocation?.name || 'No location selected'}
                      </span>
                    </div>
                  )}
                  
                  {/* Button State selector (only for Button asset type) */}
                  {type.id === 'Button' && (
                    <div className="space-y-2 mt-4">
                      <label className="block font-bold text-white">
                        Button State:
                      </label>
                      <RadioGroup
                        value={uploadForm.buttonState}
                        onValueChange={handleButtonStateChange}
                        className={customRadioStyles.radioGroup}
                      >
                        <div className={customRadioStyles.radioItem}>
                          <div className={customRadioStyles.radioButton}>
                            <RadioGroupItem value="OFF" id="radio-off" />
                          </div>
                          <Label htmlFor="radio-off" className="text-white">OFF Button (Normal State)</Label>
                        </div>
                        <div className={customRadioStyles.radioItem}>
                          <div className={customRadioStyles.radioButton}>
                            <RadioGroupItem value="ON" id="radio-on" />
                          </div>
                          <Label htmlFor="radio-on" className="text-white">ON Button (Hover State)</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-netflix-lightgray mt-1">
                        Upload separate images for ON (hover) and OFF (normal) states. Both must have the same dimensions.
                      </p>
                    </div>
                  )}
                  
                  {/* Button Preview (only for Button asset type with file selected) */}
                  {type.id === 'Button' && uploadForm.file && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="block font-bold text-white">
                          Current Button Preview:
                        </label>
                        <Card className="bg-netflix-dark border border-netflix-gray overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center gap-4">
                              <div className="text-center text-sm text-netflix-lightgray mb-2">
                                {uploadForm.buttonState === 'ON' ? 
                                  'How button will appear on hover:' : 
                                  'How button will appear normally:'}
                              </div>
                              {previewUrl ? (
                                <div className="bg-black p-4 rounded flex justify-center items-center" style={{ width: "240px", height: "160px" }}>
                                  <img 
                                    src={previewUrl} 
                                    alt="Button Preview" 
                                    className="object-contain max-w-full max-h-full" 
                                  />
                                </div>
                              ) : (
                                <div className="h-32 w-32 flex items-center justify-center text-netflix-lightgray">
                                  No preview available
                                </div>
                              )}
                              <div className="text-xs text-netflix-lightgray">
                                {imageDimensions.width > 0 ? 
                                  `Dimensions: ${imageDimensions.width}x${imageDimensions.height}px` : 
                                  ''}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Main Page Preview - how it will look on the actual page */}
                      <div className="space-y-2">
                        <label className="block font-bold text-white">
                          Main Page Interactive Preview:
                        </label>
                        <Card className="bg-netflix-dark border border-netflix-gray overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center gap-4">
                              <div className="text-center text-sm text-netflix-lightgray mb-2">
                                Hover over the button to see how it will appear on the main page
                              </div>
 
                              <div className="w-full flex justify-center">
                                <div className="rounded p-6 relative bg-black flex flex-col items-center" style={{ width: "100%" }}>
                                  <div className="mb-6 text-center text-white text-lg">Select a Location</div>
                                 
                                  <div className="flex justify-center items-center" style={{ width: "220px", height: "140px" }}>
                                    <div className="relative flex justify-center items-center w-full h-full">
                                      {uploadForm.buttonState === 'ON' && oppositeButtonUrl ? (
                                        <div className="relative w-full h-full flex justify-center items-center">
                                          <img 
                                            src={oppositeButtonUrl} 
                                            alt="Normal State" 
                                            className="object-contain max-w-full max-h-full"
                                            style={{ maxWidth: "200px" }}
                                          />
                                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                            <img 
                                              src={previewUrl} 
                                              alt="Hover State" 
                                              className="object-contain max-w-full max-h-full"
                                              style={{ maxWidth: "200px" }}
                                            />
                                          </div>
                                        </div>
                                      ) : uploadForm.buttonState === 'OFF' && oppositeButtonUrl ? (
                                        <div className="relative w-full h-full flex justify-center items-center">
                                          <img 
                                            src={previewUrl} 
                                            alt="Normal State" 
                                            className="object-contain max-w-full max-h-full"
                                            style={{ maxWidth: "200px" }}
                                          />
                                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                            <img 
                                              src={oppositeButtonUrl} 
                                              alt="Hover State" 
                                              className="object-contain max-w-full max-h-full"
                                              style={{ maxWidth: "200px" }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray">
                                          {uploadForm.buttonState === 'ON' ? 
                                            'No OFF button found. Upload an OFF button to see the complete preview.' : 
                                            'No ON button found. Upload an ON button to see the complete preview.'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-6 text-center text-xs text-netflix-lightgray">
                                    Hover over the button to see the {uploadForm.buttonState === 'ON' ? 'ON' : 'OFF'} state
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-netflix-lightgray">
                                This is how the button will behave and look on the actual site
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={isSaving || !uploadForm.file || (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(type.id) && !selectedLocation)}
                    className="w-full mt-4"
                  >
                    {isSaving ? 'Uploading...' : 'Upload Asset'}
                  </Button>
                </form>
              </div>
              
              {/* Assets list */}
              <div className="bg-netflix-dark p-6 rounded-md mb-6">
                <h2 className="text-xl font-bold text-white border-b border-netflix-gray pb-3 mb-6">
                  {type.label} List
                </h2>
                
                <div className="overflow-x-auto">
                  {(!filteredAssets || filteredAssets.length === 0) ? (
                    <div className="text-center p-4">
                      <p className="text-netflix-lightgray mb-2">No {type.label.toLowerCase()} found</p>
                      {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(type.id) && !selectedLocation && (
                        <p className="text-netflix-red text-sm">Please select a location to view assets</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Special group display for Buttons */}
                      {activeTab === 'Button' && (
                        <div className="mt-4">
                          {/* Group buttons by location */}
                          {(() => {
                            // Group buttons by location
                            const buttonsByLocation = {};
                            filteredAssets.forEach(asset => {
                              const loc = asset.location?.name || 'Unknown';
                              if (!buttonsByLocation[loc]) {
                                buttonsByLocation[loc] = { ON: null, OFF: null };
                              }
                              
                              // Determine if this is an ON or OFF button based on name
                              if (asset.name.endsWith('_Button_ON')) {
                                buttonsByLocation[loc].ON = asset;
                              } else if (asset.name.endsWith('_Button_OFF')) {
                                buttonsByLocation[loc].OFF = asset;
                              }
                            });
                            
                            return Object.entries(buttonsByLocation).map(([locationName, buttons]) => (
                              <Card 
                                key={locationName} 
                                className="mb-4 bg-netflix-dark border border-netflix-gray"
                              >
                                <CardContent className="p-4">
                                  <h3 className="text-lg font-bold text-netflix-red mb-3">
                                    {locationName} Buttons
                                  </h3>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* OFF Button */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-white">OFF Button (Normal State)</h4>
                                      {buttons.OFF ? (
                                        <div className="relative group">
                                          <div className="bg-black p-4 rounded flex justify-center items-center" style={{ width: "240px", height: "160px" }}>
                                            <img 
                                              src={buttons.OFF.accessUrl ? 
                                                `${API_BASE_URL}${buttons.OFF.accessUrl}` : ''}
                                              alt={`${locationName} OFF Button`}
                                              className="object-contain max-w-full max-h-full"
                                            />
                                          </div>
                                          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleDeleteAsset(buttons.OFF._id, buttons.OFF.name)}
                                              disabled={isSaving}
                                              size="sm"
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray">
                                          No OFF button uploaded
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* ON Button */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-white">ON Button (Hover State)</h4>
                                      {buttons.ON ? (
                                        <div className="relative group">
                                          <div className="bg-black p-4 rounded flex justify-center items-center" style={{ width: "240px", height: "160px" }}>
                                            <img 
                                              src={buttons.ON.accessUrl ? 
                                                `${API_BASE_URL}${buttons.ON.accessUrl}` : ''}
                                              alt={`${locationName} ON Button`}
                                              className="object-contain max-w-full max-h-full"
                                            />
                                          </div>
                                          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleDeleteAsset(buttons.ON._id, buttons.ON.name)}
                                              disabled={isSaving}
                                              size="sm"
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray">
                                          No ON button uploaded
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Status message */}
                                  {(!buttons.ON || !buttons.OFF) && (
                                    <div className="mt-4 p-2 bg-netflix-black/30 rounded text-sm text-netflix-red">
                                      {!buttons.ON && !buttons.OFF 
                                        ? 'Missing both ON and OFF buttons' 
                                        : !buttons.ON 
                                          ? 'Missing ON button' 
                                          : 'Missing OFF button'}
                                      . Both are required for proper functionality.
                                    </div>
                                  )}
                                  
                                  {/* Complete page preview when both buttons exist */}
                                  {buttons.ON && buttons.OFF && (
                                    <div className="mt-6">
                                      <h4 className="font-medium text-white mb-3">Complete Page Preview</h4>
                                      <div className="rounded bg-black relative flex flex-col items-center" style={{ width: "100%", paddingTop: "20px", paddingBottom: "20px" }}>
                                        <div className="text-center text-white text-lg mb-10">Select a Location</div>
                                        <div className="flex justify-center items-center" style={{ width: "220px", height: "140px" }}>
                                          <div className="relative cursor-pointer flex justify-center items-center w-full h-full">
                                            <img 
                                              src={`${API_BASE_URL}${buttons.OFF.accessUrl}`}
                                              alt={`${locationName} Location Button`}
                                              className="object-contain max-w-full max-h-full"
                                              style={{ maxWidth: "200px" }}
                                            />
                                            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                              <img 
                                                src={`${API_BASE_URL}${buttons.ON.accessUrl}`}
                                                alt={`${locationName} Location Button Hover`}
                                                className="object-contain max-w-full max-h-full"
                                                style={{ maxWidth: "200px" }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-6 text-center text-xs text-netflix-lightgray">
                                          Hover over the button to see the ON state
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ));
                          })()}
                        </div>
                      )}
                      
                      {/* Regular asset table for non-Button types */}
                      {activeTab !== 'Button' && (
                        <>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-netflix-gray">
                                <th className="py-3 px-4 text-left text-netflix-red">Preview</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Name</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Size</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Location</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAssets.map(asset => (
                                <tr key={asset._id} className="border-b border-netflix-gray/40 hover:bg-netflix-dark/60">
                                  <td className="py-3 px-4">
                                    {asset.fileType === 'mp4' ? (
                                      <VideoPreview 
                                        src={asset.accessUrl || ''} 
                                        title={asset.name}
                                        width={120}
                                        height={80}
                                      />
                                    ) : (
                                      <img 
                                        src={asset.accessUrl ? 
                                          `${API_BASE_URL}${asset.accessUrl}` : 
                                          ''
                                        } 
                                        alt={asset.name} 
                                        width="120"
                                        className="rounded" 
                                      />
                                    )}
                                  </td>
                                  <td className="py-3 px-4">{asset.name}</td>
                                  <td className="py-3 px-4">{formatFileSize(asset.size)}</td>
                                  <td className="py-3 px-4">{asset.location ? asset.location.name : 'N/A'}</td>
                                  <td className="py-3 px-4">
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeleteAsset(asset._id, asset.name)}
                                      disabled={isSaving}
                                      size="sm"
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {/* Bulk delete button for non-Button assets */}
                          {filteredAssets.length > 0 && (
                            <div className="mt-6">
                              <Button 
                                variant="destructive"
                                onClick={handleBulkDeleteConfirm}
                                disabled={isSaving}
                                className="w-full"
                              >
                                Delete All {filteredAssets.length} {type.label} Assets
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main render with assets
  console.log('Rendering assets list:', {
    filteredAssets,
    activeTab,
    selectedLocation,
    assetsByType: assetsByType[activeTab]
  });

  return (
    <>
      <div className="p-6 w-full min-w-[1000px] h-screen overflow-y-auto bg-netflix-black text-white">
        <h1 className="text-2xl font-bold text-netflix-red border-b border-netflix-gray pb-3 mb-6">Asset Management</h1>
        
        {/* Location selector */}
        <div className="mb-6 flex items-center">
          <label htmlFor="location" className="mr-3 font-bold text-white">
            Location:
          </label>
          <Select 
            value={selectedLocation?._id || ''} 
            onValueChange={handleLocationChange}
            disabled={adminIsLoading}
          >
            <SelectTrigger className="w-[250px]">
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
        
        {/* Custom tabs implementation to match the UI migration example */}
        <div className="mb-6">
          <div className="flex border-b border-netflix-gray relative">
            {assetTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleTabChange(type.id)}
                className={`px-6 py-3 font-medium text-center whitespace-nowrap ${
                  activeTab === type.id 
                    ? 'bg-netflix-red text-white border-t border-l border-r border-netflix-gray rounded-t-md relative -mb-px' 
                    : 'bg-netflix-dark text-white hover:bg-netflix-gray/30'
                }`}
                disabled={adminIsLoading}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          {/* Tab content */}
          {assetTypes.map(type => (
            <div 
              key={type.id} 
              className={`bg-netflix-dark rounded-b-md rounded-tr-md p-0 ${activeTab === type.id ? 'block' : 'hidden'}`}
            >
              {/* Upload form */}
              <div className="p-6 mb-6">
                <h2 className="text-xl font-bold text-white border-b border-netflix-gray pb-3 mb-6">
                  Upload New {type.label}
                </h2>
                
                <form className="space-y-4" onSubmit={handleUpload}>
                  <div className="space-y-2">
                    <label htmlFor="file" className="block font-bold text-white">
                      Upload Media:
                    </label>
                    <FileUpload
                      id="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept={['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(type.id) ? 'video/mp4,video/quicktime' : 'image/png,image/jpeg,image/gif'}
                      disabled={isSaving}
                      className="bg-netflix-black/30"
                    />
                    {uploadForm.fileName && (
                      <span className="block text-sm text-netflix-lightgray mt-1">
                        Selected: {uploadForm.fileName}
                      </span>
                    )}
                    <div className="text-xs text-netflix-lightgray mt-1">
                      Accepted file types: {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(type.id) ? 'MP4, QuickTime videos' : 'PNG, JPEG, GIF images'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="name" className="block font-bold text-white">
                      Asset Name:
                    </label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={uploadForm.name}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      required
                      className="bg-netflix-gray border-netflix-gray"
                    />
                  </div>
                  
                  {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button'].includes(type.id) && (
                    <div className="text-netflix-lightgray text-sm p-3 bg-netflix-black/50 rounded">
                      This asset will be associated with:{' '}
                      <span className="font-bold text-white">
                        {selectedLocation?.name || 'No location selected'}
                      </span>
                    </div>
                  )}
                  
                  {/* Button State selector (only for Button asset type) */}
                  {type.id === 'Button' && (
                    <div className="space-y-2 mt-4">
                      <label className="block font-bold text-white">
                        Button State:
                      </label>
                      <RadioGroup
                        value={uploadForm.buttonState}
                        onValueChange={handleButtonStateChange}
                        className={customRadioStyles.radioGroup}
                      >
                        <div className={customRadioStyles.radioItem}>
                          <div className={customRadioStyles.radioButton}>
                            <RadioGroupItem value="OFF" id="radio-off" />
                          </div>
                          <Label htmlFor="radio-off" className="text-white">OFF Button (Normal State)</Label>
                        </div>
                        <div className={customRadioStyles.radioItem}>
                          <div className={customRadioStyles.radioButton}>
                            <RadioGroupItem value="ON" id="radio-on" />
                          </div>
                          <Label htmlFor="radio-on" className="text-white">ON Button (Hover State)</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-netflix-lightgray mt-1">
                        Upload separate images for ON (hover) and OFF (normal) states. Both must have the same dimensions.
                      </p>
                    </div>
                  )}
                  
                  {/* Button Preview (only for Button asset type with file selected) */}
                  {type.id === 'Button' && uploadForm.file && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="block font-bold text-white">
                          Current Button Preview:
                        </label>
                        <Card className="bg-netflix-dark border border-netflix-gray overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center gap-4">
                              <div className="text-center text-sm text-netflix-lightgray mb-2">
                                {uploadForm.buttonState === 'ON' ? 
                                  'How button will appear on hover:' : 
                                  'How button will appear normally:'}
                              </div>
                              {previewUrl ? (
                                <div className="bg-black p-4 rounded flex justify-center items-center" style={{ width: "240px", height: "160px" }}>
                                  <img 
                                    src={previewUrl} 
                                    alt="Button Preview" 
                                    className="object-contain max-w-full max-h-full" 
                                  />
                                </div>
                              ) : (
                                <div className="h-32 w-32 flex items-center justify-center text-netflix-lightgray">
                                  No preview available
                                </div>
                              )}
                              <div className="text-xs text-netflix-lightgray">
                                {imageDimensions.width > 0 ? 
                                  `Dimensions: ${imageDimensions.width}x${imageDimensions.height}px` : 
                                  ''}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Main Page Preview - how it will look on the actual page */}
                      <div className="space-y-2">
                        <label className="block font-bold text-white">
                          Main Page Interactive Preview:
                        </label>
                        <Card className="bg-netflix-dark border border-netflix-gray overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center gap-4">
                              <div className="text-center text-sm text-netflix-lightgray mb-2">
                                Hover over the button to see how it will appear on the main page
                              </div>
 
                              <div className="w-full flex justify-center">
                                <div className="rounded p-6 relative bg-black flex flex-col items-center" style={{ width: "100%" }}>
                                  <div className="mb-6 text-center text-white text-lg">Select a Location</div>
                                 
                                  <div className="flex justify-center items-center" style={{ width: "220px", height: "140px" }}>
                                    <div className="relative flex justify-center items-center w-full h-full">
                                      {uploadForm.buttonState === 'ON' && oppositeButtonUrl ? (
                                        <div className="relative w-full h-full flex justify-center items-center">
                                          <img 
                                            src={oppositeButtonUrl} 
                                            alt="Normal State" 
                                            className="object-contain max-w-full max-h-full"
                                            style={{ maxWidth: "200px" }}
                                          />
                                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                            <img 
                                              src={previewUrl} 
                                              alt="Hover State" 
                                              className="object-contain max-w-full max-h-full"
                                              style={{ maxWidth: "200px" }}
                                            />
                                          </div>
                                        </div>
                                      ) : uploadForm.buttonState === 'OFF' && oppositeButtonUrl ? (
                                        <div className="relative w-full h-full flex justify-center items-center">
                                          <img 
                                            src={previewUrl} 
                                            alt="Normal State" 
                                            className="object-contain max-w-full max-h-full"
                                            style={{ maxWidth: "200px" }}
                                          />
                                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                            <img 
                                              src={oppositeButtonUrl} 
                                              alt="Hover State" 
                                              className="object-contain max-w-full max-h-full"
                                              style={{ maxWidth: "200px" }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray">
                                          {uploadForm.buttonState === 'ON' ? 
                                            'No OFF button found. Upload an OFF button to see the complete preview.' : 
                                            'No ON button found. Upload an ON button to see the complete preview.'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-6 text-center text-xs text-netflix-lightgray">
                                    Hover over the button to see the {uploadForm.buttonState === 'ON' ? 'ON' : 'OFF'} state
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-netflix-lightgray">
                                This is how the button will behave and look on the actual site
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={isSaving || !uploadForm.file || (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(type.id) && !selectedLocation)}
                    className="w-full mt-4"
                  >
                    {isSaving ? 'Uploading...' : 'Upload Asset'}
                  </Button>
                </form>
              </div>
              
              {/* Assets list */}
              <div className="bg-netflix-dark p-6 rounded-md mb-6">
                <h2 className="text-xl font-bold text-white border-b border-netflix-gray pb-3 mb-6">
                  {type.label} List
                </h2>
                
                <div className="overflow-x-auto">
                  {(!filteredAssets || filteredAssets.length === 0) ? (
                    <div className="text-center p-4">
                      <p className="text-netflix-lightgray mb-2">No {type.label.toLowerCase()} found</p>
                      {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(type.id) && !selectedLocation && (
                        <p className="text-netflix-red text-sm">Please select a location to view assets</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Special group display for Buttons */}
                      {activeTab === 'Button' && (
                        <div className="mt-4">
                          {/* Group buttons by location */}
                          {(() => {
                            // Group buttons by location
                            const buttonsByLocation = {};
                            filteredAssets.forEach(asset => {
                              const loc = asset.location?.name || 'Unknown';
                              if (!buttonsByLocation[loc]) {
                                buttonsByLocation[loc] = { ON: null, OFF: null };
                              }
                              
                              // Determine if this is an ON or OFF button based on name
                              if (asset.name.endsWith('_Button_ON')) {
                                buttonsByLocation[loc].ON = asset;
                              } else if (asset.name.endsWith('_Button_OFF')) {
                                buttonsByLocation[loc].OFF = asset;
                              }
                            });
                            
                            return Object.entries(buttonsByLocation).map(([locationName, buttons]) => (
                              <Card 
                                key={locationName} 
                                className="mb-4 bg-netflix-dark border border-netflix-gray"
                              >
                                <CardContent className="p-4">
                                  <h3 className="text-lg font-bold text-netflix-red mb-3">
                                    {locationName} Buttons
                                  </h3>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* OFF Button */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-white">OFF Button (Normal State)</h4>
                                      {buttons.OFF ? (
                                        <div className="relative group">
                                          <div className="bg-black p-4 rounded flex justify-center items-center" style={{ width: "240px", height: "160px" }}>
                                            <img 
                                              src={buttons.OFF.accessUrl ? 
                                                `${API_BASE_URL}${buttons.OFF.accessUrl}` : ''}
                                              alt={`${locationName} OFF Button`}
                                              className="object-contain max-w-full max-h-full"
                                            />
                                          </div>
                                          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleDeleteAsset(buttons.OFF._id, buttons.OFF.name)}
                                              disabled={isSaving}
                                              size="sm"
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray">
                                          No OFF button uploaded
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* ON Button */}
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-white">ON Button (Hover State)</h4>
                                      {buttons.ON ? (
                                        <div className="relative group">
                                          <div className="bg-black p-4 rounded flex justify-center items-center" style={{ width: "240px", height: "160px" }}>
                                            <img 
                                              src={buttons.ON.accessUrl ? 
                                                `${API_BASE_URL}${buttons.ON.accessUrl}` : ''}
                                              alt={`${locationName} ON Button`}
                                              className="object-contain max-w-full max-h-full"
                                            />
                                          </div>
                                          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleDeleteAsset(buttons.ON._id, buttons.ON.name)}
                                              disabled={isSaving}
                                              size="sm"
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray">
                                          No ON button uploaded
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Status message */}
                                  {(!buttons.ON || !buttons.OFF) && (
                                    <div className="mt-4 p-2 bg-netflix-black/30 rounded text-sm text-netflix-red">
                                      {!buttons.ON && !buttons.OFF 
                                        ? 'Missing both ON and OFF buttons' 
                                        : !buttons.ON 
                                          ? 'Missing ON button' 
                                          : 'Missing OFF button'}
                                      . Both are required for proper functionality.
                                    </div>
                                  )}
                                  
                                  {/* Complete page preview when both buttons exist */}
                                  {buttons.ON && buttons.OFF && (
                                    <div className="mt-6">
                                      <h4 className="font-medium text-white mb-3">Complete Page Preview</h4>
                                      <div className="rounded bg-black relative flex flex-col items-center" style={{ width: "100%", paddingTop: "20px", paddingBottom: "20px" }}>
                                        <div className="text-center text-white text-lg mb-10">Select a Location</div>
                                        <div className="flex justify-center items-center" style={{ width: "220px", height: "140px" }}>
                                          <div className="relative cursor-pointer flex justify-center items-center w-full h-full">
                                            <img 
                                              src={`${API_BASE_URL}${buttons.OFF.accessUrl}`}
                                              alt={`${locationName} Location Button`}
                                              className="object-contain max-w-full max-h-full"
                                              style={{ maxWidth: "200px" }}
                                            />
                                            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                              <img 
                                                src={`${API_BASE_URL}${buttons.ON.accessUrl}`}
                                                alt={`${locationName} Location Button Hover`}
                                                className="object-contain max-w-full max-h-full"
                                                style={{ maxWidth: "200px" }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-6 text-center text-xs text-netflix-lightgray">
                                          Hover over the button to see the ON state
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ));
                          })()}
                        </div>
                      )}
                      
                      {/* Regular asset table for non-Button types */}
                      {activeTab !== 'Button' && (
                        <>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-netflix-gray">
                                <th className="py-3 px-4 text-left text-netflix-red">Preview</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Name</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Size</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Location</th>
                                <th className="py-3 px-4 text-left text-netflix-red">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAssets.map(asset => (
                                <tr key={asset._id} className="border-b border-netflix-gray/40 hover:bg-netflix-dark/60">
                                  <td className="py-3 px-4">
                                    {asset.fileType === 'mp4' ? (
                                      <VideoPreview 
                                        src={asset.accessUrl || ''} 
                                        title={asset.name}
                                        width={120}
                                        height={80}
                                      />
                                    ) : (
                                      <img 
                                        src={asset.accessUrl ? 
                                          `${API_BASE_URL}${asset.accessUrl}` : 
                                          ''
                                        } 
                                        alt={asset.name} 
                                        width="120"
                                        className="rounded" 
                                      />
                                    )}
                                  </td>
                                  <td className="py-3 px-4">{asset.name}</td>
                                  <td className="py-3 px-4">{formatFileSize(asset.size)}</td>
                                  <td className="py-3 px-4">{asset.location ? asset.location.name : 'N/A'}</td>
                                  <td className="py-3 px-4">
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeleteAsset(asset._id, asset.name)}
                                      disabled={isSaving}
                                      size="sm"
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {/* Bulk delete button for non-Button assets */}
                          {filteredAssets.length > 0 && (
                            <div className="mt-6">
                              <Button 
                                variant="destructive"
                                onClick={handleBulkDeleteConfirm}
                                disabled={isSaving}
                                className="w-full"
                              >
                                Delete All {filteredAssets.length} {type.label} Assets
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Push changes button */}
      <div className="text-center mb-6">
        <Button
          onClick={handlePushChanges}
          disabled={isSaving || adminIsLoading}
          className="px-8 py-6 text-lg"
        >
          Push Changes to Frontend
        </Button>
      </div>
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={performDelete}
        title={`Delete ${deleteConfirmation.isBulkDelete ? 'Multiple' : ''} Asset${deleteConfirmation.isBulkDelete ? 's' : ''}`}
        description={`Are you sure you want to delete ${deleteConfirmation.isBulkDelete ? 'all' : 'this'} asset${deleteConfirmation.isBulkDelete ? 's' : ''}? This action cannot be undone.`}
        itemName={deleteConfirmation.assetName}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default React.memo(Assets);

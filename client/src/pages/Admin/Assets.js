// client/src/pages/Admin/Assets.js - Asset management tab

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { baseBackendUrl } from '../../utils/api';

// Import shadcn/ui components
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from '../../components/ui/alert';
import { useToast } from '../../components/ui/use-toast';
import { DeleteConfirmation } from '../../components/ui/DeleteConfirmation';

// Import our new component files
import AssetUploadForm from '../../components/admin/assets/AssetUploadForm';
import AssetList from '../../components/admin/assets/AssetList';

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
    fetchedLocationIds
  } = useAdmin();
  
  console.log('[Assets Component Mount/Render] Context values:', {
    locationsCount: locations?.length || 0,
    selectedLocationId: selectedLocation?._id || 'none',
    adminIsLoading,
    adminFetchInProgress,
    fetchedLocationIds: fetchedLocationIds ? [...fetchedLocationIds] : []
  });
  
  // Define activeTab state
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
  
  // Filter assets based on selected tab and location
  const getFilteredAssets = useCallback(() => {
    const assetsForType = assetsByType[activeTab] || [];
    console.log(`Filtering assets for type ${activeTab}:`, assetsForType);
    
    // For location-specific assets, filter by selected location
    if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button', 'MapPin'].includes(activeTab)) {
      if (!selectedLocation) {
        console.log('No location selected for location-specific assets');
        return []; // Return empty array if no location selected for location-specific assets
      }
      
      // Filter by location
      const filtered = assetsForType.filter(asset => 
        asset.location && asset.location._id === selectedLocation._id
      );
      console.log(`Filtered ${activeTab} assets for location ${selectedLocation._id}:`, filtered);
      return filtered;
    }
    
    // For non-location-specific assets (UI elements), show all
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
      
      // Fetch assets for this location if not already fetched
      if (!fetchedLocationIds.has(location._id)) {
        fetchAssets(location._id);
      }
      
      // Auto-generate button name if we're in Button tab
      if (activeTab === 'Button' && location) {
        const buttonSuffix = uploadForm.buttonState === 'ON' ? '_Button_ON' : '_Button_OFF';
        setUploadForm(prev => ({ 
          ...prev, 
          name: `${location.name}${buttonSuffix}` 
        }));
      }
    }
  }, [locations, setSelectedLocation, activeTab, uploadForm.buttonState, fetchAssets, fetchedLocationIds]);
  
  const handleTabChange = useCallback((tabId) => {
    console.log('Changing tab to:', tabId);
    setActiveTab(tabId);
    setUploadForm(prev => ({ 
      ...prev, 
      type: tabId,
      // Reset button state when changing tabs
      ...(tabId === 'Button' ? {} : { buttonState: 'OFF' })
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
        img.src = existingButtons[0].accessUrl ? `${baseBackendUrl}${existingButtons[0].accessUrl}` : '';
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
      if (e.target) {
        e.target.value = '';
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
        if (e.target) {
          e.target.value = '';
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
    if (['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button', 'MapPin'].includes(uploadForm.type)) {
      if (!selectedLocation) {
        setError(new Error('Please select a location for this asset type'));
        return;
      }
      locationId = selectedLocation._id;
      console.log(`[Assets] Using location ID for upload: ${locationId} (${selectedLocation.name})`);
    } else {
      console.log(`[Assets] No location required for asset type: ${uploadForm.type}`);
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
      
      console.log(`[Assets] Preparing to upload: "${uploadForm.name}" (${uploadForm.type}) to location: ${locationId ? selectedLocation.name : 'none'}`);
      
      // Upload the asset - only one upload at a time
      const result = await uploadAsset(
        uploadForm.file,
        uploadForm.name,
        uploadForm.type,
        locationId
      );
      
      if (result) {
        console.log(`[Assets] Upload result:`, {
          id: result._id,
          name: result.name,
          hasLocation: !!result.location,
          locationId: result.location?._id || result.location || 'none'
        });
        
        // Reset form
        setUploadForm({
          name: '',
          type: activeTab,
          file: null,
          fileName: '',
          buttonState: 'OFF' // Reset button state
        });
        
        // Only fetch if we have a selected location
        if (selectedLocation?._id) {
          await fetchAssets(selectedLocation._id);
        }

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

  // Auto-select first location if none is selected and locations are available
  useEffect(() => {
    if (locations?.length > 0 && !selectedLocation && !adminIsLoading) {
      console.log('[Assets Component] Auto-selecting first location:', locations[0].name);
      setSelectedLocation(locations[0]);
    }
  }, [locations, selectedLocation, adminIsLoading, setSelectedLocation]);

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
      <div className="p-6 flex flex-col items-center justify-center h-full bg-netflix-black text-white">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading assets...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Assets component error:', error);
    return (
      <div className="p-6 bg-netflix-black text-white">
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
      <div className="p-6 bg-netflix-black text-white">
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

  // Main render with layout - implementing vertical tabs like in the screenshot
  return (
    <div className="p-6 bg-netflix-black text-white">
      {/* Location selector */}
      <div className="mb-6 flex items-center flex-wrap">
        <label htmlFor="location" className="mr-3 font-bold text-white mb-2 md:mb-0">
          Location:
        </label>
        <Select 
          value={selectedLocation?._id || ''}
          onValueChange={handleLocationChange}
          defaultValue={locations?.length > 0 ? locations[0]._id : ''}
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
      
      {/* Main content with sidebar tabs and content area */}
      <div className="flex flex-col md:flex-row md:gap-4">
        {/* Left sidebar with vertical tabs */}
        <div className="w-full md:w-36 lg:w-40 mb-6 md:mb-0 shrink-0">
          <div className="bg-netflix-dark rounded p-1 flex flex-col">
            {assetTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleTabChange(type.id)}
                className={`px-2 py-2.5 text-left text-sm sm:text-base font-medium whitespace-nowrap rounded-sm mb-1 last:mb-0 ${
                  activeTab === type.id 
                    ? 'bg-netflix-red text-white' 
                    : 'bg-transparent text-netflix-lightgray hover:bg-netflix-gray/30'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Right content area */}
        <div className="flex-1 max-w-full md:max-w-[calc(100%-9rem)] lg:max-w-[calc(100%-10.5rem)]">
          {/* Asset upload form */}
          <AssetUploadForm
            activeTab={activeTab}
            selectedLocation={selectedLocation}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            isSaving={isSaving}
            handleUpload={handleUpload}
            handleFileChange={handleFileChange}
            handleInputChange={handleInputChange}
            assetsByType={assetsByType}
            handleButtonStateChange={handleButtonStateChange}
          />
          
          {/* Assets list */}
          <div className="bg-netflix-dark p-4 sm:p-6 rounded-md mb-6">
            <h2 className="text-xl font-bold text-white border-b border-netflix-gray pb-3 mb-6">
              {currentAssetType?.label} List
            </h2>
            
            <div className="overflow-x-auto">
              {(!filteredAssets || filteredAssets.length === 0) ? (
                <div className="text-center p-4">
                  <p className="text-netflix-lightgray mb-2">No {currentAssetType?.label?.toLowerCase()} found</p>
                  {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut'].includes(activeTab) && !selectedLocation && (
                    <p className="text-netflix-red text-sm">Please select a location to view assets</p>
                  )}
                </div>
              ) : (
                <AssetList
                  activeTab={activeTab}
                  filteredAssets={filteredAssets}
                  isSaving={isSaving}
                  onDeleteAsset={handleDeleteAsset}
                  onBulkDelete={handleBulkDeleteConfirm}
                  currentAssetType={currentAssetType}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Assets);

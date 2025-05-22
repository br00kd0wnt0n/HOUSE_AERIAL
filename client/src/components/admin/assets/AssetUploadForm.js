import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { FileUpload } from '../../../components/ui/file-upload';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { Label } from '../../../components/ui/label';
import { Card, CardContent } from '../../../components/ui/card';
import { baseBackendUrl } from '../../../utils/api';
import { useAdmin } from '../../../context/AdminContext';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../../components/ui/select';

// Add custom CSS for radio buttons
const customRadioStyles = {
  radioGroup: 'flex flex-wrap gap-4',
  radioItem: 'flex items-center space-x-2',
  radioButton: 'flex items-center justify-center w-6'
};

// Map of asset types to their display names
const assetTypeNames = {
  'AERIAL': 'Aerial Videos',
  'DiveIn': 'Dive-In Videos',
  'FloorLevel': 'Floor Level Videos',
  'ZoomOut': 'Zoom-Out Videos',
  'Transition': 'Transition Videos',
  'Button': 'Location Buttons',
  'MapPin': 'Map Pins',
  'UIElement': 'UI Elements',
  'LocationBanner': 'Location Banner'
};

/**
 * Component for uploading various asset types
 */
const AssetUploadForm = ({
  activeTab,
  selectedLocation,
  uploadForm,
  setUploadForm,
  isSaving,
  handleUpload,
  handleFileChange,
  handleInputChange,
  assetsByType,
  handleButtonStateChange
}) => {
  const fileInputRef = useRef(null);
  
  // Store image dimensions for validation
  const [imageDimensions] = useState({ width: 0, height: 0 });
  
  // Managed URL states for button previews
  const [previewUrl, setPreviewUrl] = useState('');
  const [oppositeButtonUrl, setOppositeButtonUrl] = useState('');
  
  // Get locations from AdminContext for transition source/destination selectors
  const { locations } = useAdmin();
  
  // Get display name for the current asset type
  const assetTypeName = assetTypeNames[activeTab] || activeTab;
  
  // Create and cleanup object URL for file preview
  useEffect(() => {
    if (uploadForm.file) {
      const url = URL.createObjectURL(uploadForm.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return () => {};
  }, [uploadForm.file]);
  
  // Find opposite button state (ON/OFF) for the selected location - wrapped in useCallback
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
    
    return oppositeButton?.accessUrl ? `${baseBackendUrl}${oppositeButton.accessUrl}` : null;
  }, [selectedLocation, assetsByType.Button, uploadForm.buttonState]);
  
  // Update opposite button URL when needed
  useEffect(() => {
    setOppositeButtonUrl(getOppositeButtonUrl());
  }, [getOppositeButtonUrl]);
  
  // Automatically set source location to selected location for transitions
  useEffect(() => {
    if (activeTab === 'Transition' && selectedLocation) {
      setUploadForm(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          sourceLocation: selectedLocation._id
        }
      }));
    }
  }, [activeTab, selectedLocation, setUploadForm]);
  
  // When file changes, update the name based on filename
  useEffect(() => {
    if (uploadForm.fileName) {
      let name = uploadForm.fileName;
      
      // For Button assets, append the state
      if (activeTab === 'Button' && selectedLocation) {
        const buttonSuffix = `_Button_${uploadForm.buttonState}`;
        if (!name.endsWith(buttonSuffix)) {
          // Remove file extension first
          name = `${selectedLocation.name}${buttonSuffix}`;
        }
      }
      
      setUploadForm(prev => ({
        ...prev,
        name: name
      }));
    }
  }, [uploadForm.fileName, activeTab, uploadForm.buttonState, selectedLocation, setUploadForm]);
  
  // Handle destination location change for transitions
  const handleDestinationLocationChange = (value) => {
    setUploadForm(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        destinationLocation: value
      }
    }));
  };
  
  return (
    <div className="p-4 sm:p-6 mb-6 bg-netflix-dark rounded-md w-full overflow-hidden">
      <h2 className="text-xl font-bold text-white border-b border-netflix-gray pb-3 mb-6">
        Upload New {assetTypeName}
      </h2>
      
      <form className="space-y-4 w-full" onSubmit={handleUpload}>
        <div className="space-y-2 w-full">
          <label htmlFor="file" className="block font-bold text-white">
            Upload Media:
          </label>
          <div className="w-full">
            <FileUpload
              id="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(activeTab) ? 'video/mp4,video/quicktime' : 'image/png,image/jpeg,image/gif'}
              disabled={isSaving}
              className="bg-netflix-black/30 w-full"
            />
          </div>
          {uploadForm.fileName && (
            <span className="block text-sm text-netflix-lightgray mt-1 break-words">
              Selected: {uploadForm.fileName}
            </span>
          )}
          <div className="text-xs text-netflix-lightgray mt-1">
            Accepted file types: {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Transition'].includes(activeTab) ? 'MP4, QuickTime videos' : 'PNG, JPEG, GIF images'}
          </div>
        </div>
        
        {['AERIAL', 'DiveIn', 'FloorLevel', 'ZoomOut', 'Button', 'MapPin', 'Transition', 'LocationBanner'].includes(activeTab) && (
          <div className="text-netflix-lightgray text-sm p-3 bg-netflix-black/50 rounded w-full">
            This asset will be associated with:{' '}
            <span className="font-bold text-white">
              {selectedLocation?.name || 'No location selected'}
            </span>
          </div>
        )}
        
        {/* Transition destination selector */}
        {activeTab === 'Transition' && (
          <div className="space-y-4 mt-4">
            <div className="text-white font-bold mb-2">Transition Relationship:</div>
            
            {/* Source Location Info */}
            <div className="space-y-2">
              <div className="flex flex-row items-center gap-2">
                <label className="block text-sm text-netflix-lightgray">
                  Source Location (Starting Point):
                </label>
                <span className="font-medium text-white">{selectedLocation?.name || 'Select a location first'}</span>
              </div>
              <input 
                type="hidden" 
                name="sourceLocation" 
                value={selectedLocation?._id || ''} 
              />
            </div>
            
            {/* Destination Location Selector */}
            <div className="space-y-2">
              <label htmlFor="destinationLocation" className="block text-sm text-netflix-lightgray">
                Destination Location (Ending Point):
              </label>
              <Select
                value={uploadForm.metadata?.destinationLocation || ''}
                onValueChange={handleDestinationLocationChange}
                disabled={isSaving || !locations || locations.length === 0}
              >
                <SelectTrigger className="bg-netflix-gray border-netflix-gray w-full">
                  <SelectValue placeholder="Select destination location" />
                </SelectTrigger>
                <SelectContent className="bg-netflix-black border-netflix-gray">
                  {locations && locations.filter(location => location._id !== selectedLocation?._id).map(location => (
                    <SelectItem key={`dest-${location._id}`} value={location._id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-xs text-netflix-lightgray mt-1">
              The transition video will play when navigating from <span className="font-medium">{selectedLocation?.name || 'this location'}</span> to the selected destination location.
            </div>
          </div>
        )}
        
        {/* Button State selector (only for Button asset type) */}
        {activeTab === 'Button' && (
          <div className="space-y-2 mt-4 w-full">
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
        {activeTab === 'Button' && uploadForm.file && (
          <div className="space-y-4 mt-4 w-full">
            <div className="space-y-2">
              <label className="block font-bold text-white">
                Current Button Preview:
              </label>
              <Card className="bg-netflix-dark border border-netflix-gray overflow-hidden w-full">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center text-sm text-netflix-lightgray mb-2">
                      {uploadForm.buttonState === 'ON' ? 
                        'How button will appear on hover:' : 
                        'How button will appear normally:'}
                    </div>
                    {previewUrl ? (
                      <div className="bg-netflix-dark p-4 rounded flex justify-center items-center w-full max-w-[240px] h-[160px]">
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
            <div className="space-y-2 w-full">
              <label className="block font-bold text-white">
                Main Page Interactive Preview:
              </label>
              <Card className="bg-netflix-dark border border-netflix-gray overflow-hidden w-full">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="text-center text-sm text-netflix-lightgray mb-2">
                      Hover over the button to see how it will appear on the main page
                    </div>

                    <div className="w-full flex justify-center">
                      <div className="rounded p-4 sm:p-6 relative bg-netflix-dark flex flex-col items-center max-w-full" style={{ width: "100%" }}>
                        <div className="mb-4 sm:mb-6 text-center text-white text-base sm:text-lg">Select a Location</div>
                        
                        <div className="flex justify-center items-center w-full max-w-[220px] h-[140px]">
                          <div className="relative flex justify-center items-center w-full h-full">
                            {uploadForm.buttonState === 'ON' && oppositeButtonUrl ? (
                              <div className="relative w-full h-full flex justify-center items-center">
                                <img 
                                  src={oppositeButtonUrl} 
                                  alt="Normal State" 
                                  className="object-contain max-w-full max-h-full"
                                />
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                  <img 
                                    src={previewUrl} 
                                    alt="Hover State" 
                                    className="object-contain max-w-full max-h-full"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="relative w-full h-full flex justify-center items-center">
                                <img 
                                  src={previewUrl} 
                                  alt="Normal State" 
                                  className="object-contain max-w-full max-h-full"
                                />
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                                  <img 
                                    src={oppositeButtonUrl} 
                                    alt="Hover State" 
                                    className="object-contain max-w-full max-h-full"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* Submit button */}
        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={isSaving || !uploadForm.file || 
              (activeTab === 'Transition' && (!selectedLocation || !uploadForm.metadata?.destinationLocation))}
            className="bg-netflix-red hover:bg-netflix-red/80 w-full sm:w-auto"
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </div>
            ) : 'Upload Asset'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AssetUploadForm; 
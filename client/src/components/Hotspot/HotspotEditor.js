import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import HotspotMapPinSelection from './HotspotMapPinSelection';
import UIElementSelection from './UIElementSelection';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';

const HotspotEditor = ({
  selectedHotspot,
  hotspotForm,
  handleInputChange,
  handleSelectChange,
  handleUpdateHotspot,
  startEditingPoints,
  handleDeleteClick,
  setSelectedHotspot,
  isSaving,
  editingPoints,
  points,
  finishEditingPoints,
  undoLastPoint,
  setEditingPoints,
  setDrawingMode,
  setPoints,
  drawExistingHotspots,
  selectedMapPin,
  setSelectedMapPin,
  locationId,
  isUpdatingMapPin,
  setIsUpdatingMapPin,
  selectedUIElement,
  setSelectedUIElement
}) => {
  // Add state to track if map pin selection is open
  const [showMapPinSelection, setShowMapPinSelection] = useState(false);
  // Add a form ref to access the form element directly
  const formRef = useRef(null);
  const [editMode, setEditMode] = useState('form');
  const [secondaryMode, setSecondaryMode] = useState(selectedUIElement ? 'ui-element' : 'classic');
  
  // Update secondaryMode when selectedUIElement changes
  useEffect(() => {
    if (selectedUIElement) {
      setSecondaryMode('ui-element');
    } else if (hotspotForm.infoPanel && (hotspotForm.infoPanel.title || hotspotForm.infoPanel.description)) {
      setSecondaryMode('classic');
    }
  }, [selectedUIElement, hotspotForm.infoPanel]);
  
  // Handle secondary mode change
  const handleSecondaryModeChange = (value) => {
    setSecondaryMode(value);
    
    // Clear UI element selection if switching to classic mode
    if (value === 'classic') {
      setSelectedUIElement(null);
    }
  };

  if (!selectedHotspot) return null;
  
  // If editing points, show the point editing UI
  if (editingPoints && selectedHotspot) {
    return (
      <Card className="bg-netflix-dark border-netflix-gray mb-4">
        <CardHeader>
          <CardTitle className="text-xl">Editing Shape: {selectedHotspot.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-netflix-lightgray mb-2">Click on the image to modify the hotspot shape.</p>
          <p className="text-netflix-red font-medium mb-4">Points added: {points.length}</p>
          
          <div className="mb-4">
            <Button
              type="button"
              onClick={undoLastPoint}
              disabled={points.length === 0}
              variant="outline"
              size="sm"
              className="w-full mb-2"
            >
              Undo Last Point
            </Button>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button 
              onClick={finishEditingPoints}
              disabled={points.length < 3 || isSaving}
              className="bg-netflix-red hover:bg-netflix-darkred"
            >
              {isSaving ? 'Saving...' : 'Save Shape'}
            </Button>
            
            <Button 
              onClick={() => {
                setEditingPoints(false);
                setDrawingMode(false);
                setPoints(selectedHotspot.coordinates || []);
                if (drawExistingHotspots) {
                  drawExistingHotspots(true);
                }
              }}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If map pin selection is open, show the map pin selection UI
  if (showMapPinSelection) {
    return (
      <Card className="bg-netflix-dark border-netflix-gray mb-4">
        <CardHeader>
          <CardTitle className="text-xl">Change Map Pin: {selectedHotspot.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <HotspotMapPinSelection
            selectedMapPin={selectedMapPin}
            setSelectedMapPin={(mapPin) => {
              console.log("Map pin selected in editor:", mapPin);
              // Set a flag indicating we're updating the map pin
              setIsUpdatingMapPin(true);
              setSelectedMapPin(mapPin);
              // Clear the flag after a short delay
              setTimeout(() => setIsUpdatingMapPin(false), 300);
            }}
            onCancel={() => setShowMapPinSelection(false)}
            onComplete={(mapPin) => {
              console.log("Map pin selection completed in editor with:", mapPin);
              
              // Set the updating flag
              setIsUpdatingMapPin(true);
              
              // Ensure we have the latest selection
              setSelectedMapPin(mapPin);
              
              // Close the selection UI
              setShowMapPinSelection(false);
              
              // Directly call handleUpdateHotspot with the new map pin data
              const updatedData = {
                ...hotspotForm,
                mapPin: mapPin ? mapPin._id : null
              };
              
              // Wrap in setTimeout to avoid state update collisions
              setTimeout(() => {
                // Call handleUpdateHotspot directly with the updated data
                handleUpdateHotspot(null, updatedData);
                
                // Clear the updating flag after the update is complete
                setTimeout(() => setIsUpdatingMapPin(false), 300);
              }, 100);
            }}
            hotspotName={selectedHotspot.name}
            isUpdating={isUpdatingMapPin}
            locationId={locationId}
          />
        </CardContent>
      </Card>
    );
  }
  
  // MapPin selection mode
  if (editMode === 'map-pin') {
    return (
      <Card 
        className="bg-netflix-dark border-netflix-gray mt-4"
      >
        <CardContent>
          <HotspotMapPinSelection
            selectedMapPin={selectedMapPin}
            setSelectedMapPin={setSelectedMapPin}
            onCancel={() => setEditMode('form')}
            onComplete={(mapPin) => {
              setSelectedMapPin(mapPin);
              setEditMode('form');
            }}
            hotspotName={hotspotForm.name}
            isSaving={false} 
            isUpdating={isUpdatingMapPin}
            locationId={locationId}
          />
        </CardContent>
      </Card>
    );
  }
  
  // UI Element selection mode
  if (editMode === 'ui-element') {
    return (
      <Card 
        className="bg-netflix-dark border-netflix-gray mt-4"
      >
        <CardContent>
          <UIElementSelection
            selectedUIElement={selectedUIElement}
            setSelectedUIElement={setSelectedUIElement}
            onCancel={() => setEditMode('form')}
            onComplete={(uiElement) => {
              setSelectedUIElement(uiElement);
              setEditMode('form');
            }}
            hotspotName={hotspotForm.name}
            isSaving={false}
            isUpdating={false}
          />
        </CardContent>
      </Card>
    );
  }
  
  // Standard edit form
  return (
    <Card 
      className="bg-netflix-dark border-netflix-gray mt-4"
    >
      <CardHeader>
        <CardTitle className="text-lg">
          Edit Hotspot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form 
          ref={formRef}
          className="space-y-4"
          onSubmit={handleUpdateHotspot}
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Hotspot Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={hotspotForm.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-netflix-gray border border-netflix-gray rounded-md text-white"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Hotspot Type:
            </label>
            <select
              id="type"
              className="w-full px-3 py-2 bg-netflix-gray border border-netflix-gray rounded-md text-white"
              value={hotspotForm.type}
              onChange={(e) => handleSelectChange('type', e.target.value)}
            >
              <option value="PRIMARY">PRIMARY</option>
              <option value="SECONDARY">SECONDARY</option>
            </select>
          </div>
          
          {/* Secondary hotspot options */}
          {hotspotForm.type === 'SECONDARY' && (
            <div className="space-y-4 p-3 bg-netflix-black rounded-md">
              <h4 className="font-medium text-netflix-red">Secondary Hotspot Display</h4>
              
              {/* Mode selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Display Mode:</label>
                <RadioGroup 
                  value={secondaryMode} 
                  onValueChange={handleSecondaryModeChange}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="classic" id="mode-classic" />
                    <Label htmlFor="mode-classic" className="cursor-pointer">Classic Info Panel (Text)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ui-element" id="mode-ui-element" />
                    <Label htmlFor="mode-ui-element" className="cursor-pointer">UI Element Image</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Show appropriate fields based on selected mode */}
              {secondaryMode === 'classic' ? (
                <>
                  <div>
                    <label htmlFor="infoPanel.title" className="block text-sm font-medium mb-1">
                      Title:
                    </label>
                    <input
                      type="text"
                      id="infoPanel.title"
                      name="infoPanel.title"
                      value={hotspotForm.infoPanel.title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-netflix-gray border border-netflix-gray rounded-md text-white"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="infoPanel.description" className="block text-sm font-medium mb-1">
                      Description:
                    </label>
                    <textarea
                      id="infoPanel.description"
                      name="infoPanel.description"
                      value={hotspotForm.infoPanel.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 bg-netflix-gray border border-netflix-gray rounded-md text-white resize-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center mb-2">
                    <span className="block text-sm font-medium">UI Element:</span>
                    <Button 
                      type="button"
                      onClick={() => setEditMode('ui-element')}
                      variant="link"
                      className="ml-2 text-netflix-red"
                    >
                      {selectedUIElement ? 'Change' : 'Select'} UI Element
                    </Button>
                  </div>
                  
                  {selectedUIElement ? (
                    <div className="flex items-center p-2 bg-netflix-black/40 rounded-md">
                      <img 
                        src={selectedUIElement.accessUrl} 
                        alt={selectedUIElement.name}
                        className="h-16 mr-2 object-contain"
                      />
                      <div>
                        <p className="text-white">{selectedUIElement.name}</p>
                        <button 
                          type="button"
                          onClick={() => setSelectedUIElement(null)}
                          className="text-xs text-netflix-lightgray hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-netflix-lightgray text-sm">No UI element selected</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Map Pin display */}
          <div>
            <div className="flex items-center mb-2">
              <span className="block text-sm font-medium">Map Pin:</span>
              <Button 
                type="button"
                onClick={() => setEditMode('map-pin')}
                variant="link"
                className="ml-2 text-netflix-red"
              >
                {selectedMapPin ? 'Change' : 'Select'} Map Pin
              </Button>
            </div>
            
            {selectedMapPin ? (
              <div className="flex items-center p-2 bg-netflix-black/40 rounded-md">
                <img 
                  src={selectedMapPin.accessUrl} 
                  alt={selectedMapPin.name}
                  className="h-12 mr-2"
                />
                <div>
                  <p className="text-white">{selectedMapPin.name}</p>
                  <button 
                    type="button"
                    onClick={() => setSelectedMapPin(null)}
                    className="text-xs text-netflix-lightgray hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-netflix-lightgray text-sm">No map pin selected</p>
            )}
          </div>

          <div className="pt-4 flex flex-wrap justify-between items-center">
            {/* Action buttons */}
            <div className="flex space-x-2 mb-2 sm:mb-0">
              <Button 
                type="button"
                onClick={startEditingPoints}
                variant="outline"
                className="border-netflix-red text-netflix-red hover:bg-netflix-red hover:text-white"
              >
                Edit Shape
              </Button>
              
              <Button 
                type="button"
                onClick={handleDeleteClick}
                variant="outline" 
                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              >
                Delete
              </Button>
            </div>
            
            {/* Save and Cancel buttons */}
            <div className="flex space-x-2">
              <Button 
                type="submit"
                className="bg-netflix-red hover:bg-netflix-darkred"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <Button
                type="button"
                onClick={() => setSelectedHotspot(null)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default HotspotEditor; 
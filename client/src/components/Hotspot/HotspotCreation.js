import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import HotspotForm from './HotspotForm';
import HotspotMapPinSelection from './HotspotMapPinSelection';
import UIElementSelection from './UIElementSelection';

const HotspotCreation = ({
  creationStep,
  hotspotForm,
  handleInputChange,
  handleSelectChange,
  proceedToDrawing,
  resetCreationState,
  points,
  undoLastPoint,
  onFinishDrawingClick,
  draftHotspot,
  setCreationStep,
  saveNewHotspot,
  isSaving,
  selectedMapPin,
  setSelectedMapPin,
  onMapPinSelectionComplete,
  locationId,
  areaImage,
  videoWidth,
  videoHeight,
  setHotspotForm,
  setPoints,
  onSave,
  secondaryMode,
  setSecondaryMode
}) => {
  // Add state to track if map pin is being updated
  const [isUpdatingMapPin, setIsUpdatingMapPin] = useState(false);
  
  // State for selected UI element
  const [selectedUIElement, setSelectedUIElement] = useState(null);

  if (creationStep === 0) return null;

  // Step 1: Information Entry
  if (creationStep === 1) {
    return (
      <HotspotForm
        hotspotForm={hotspotForm}
        handleInputChange={(e) => {
          const { name, value } = e.target;
          setHotspotForm(prev => {
            if (name.includes('.')) {
              const [parent, child] = name.split('.');
              return {
                ...prev,
                [parent]: {
                  ...prev[parent],
                  [child]: value
                }
              };
            }
            return { ...prev, [name]: value };
          });
        }}
        handleSelectChange={(name, value) => {
          setHotspotForm(prev => ({ ...prev, [name]: value }));
        }}
        onCancel={resetCreationState}
        proceedToDrawing={proceedToDrawing}
        creationStep={creationStep}
        title="New Hotspot Information"
        secondaryMode={secondaryMode}
        onSecondaryModeChange={(value) => {
          if (setSecondaryMode) {
            setSecondaryMode(value);
          }
          if (value === 'classic') {
            setSelectedUIElement(null);
          }
        }}
      />
    );
  }
  
  // Step 2: Drawing Mode
  if (creationStep === 2) {
    return (
      <Card className="bg-netflix-dark border-netflix-gray mb-4">
        <CardHeader>
          <CardTitle className="text-xl">Drawing: {hotspotForm.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-netflix-lightgray mb-2">Click on the image to add points. Add at least 3 points to create a valid hotspot.</p>
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
            <div className="text-xs text-netflix-lightgray mt-1">
              Pro tip: Click points in sequence to form a polygon shape around your hotspot area.
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button 
              onClick={onFinishDrawingClick}
              disabled={points.length < 3}
              className="bg-netflix-red hover:bg-netflix-darkred"
            >
              Finish Drawing
            </Button>
            
            <Button 
              onClick={() => {
                setCreationStep(1); // Go back to info
                // cancelDrawing will be called from parent
              }}
              variant="secondary"
            >
              Back to Info
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Step 3: UI Element Selection (only for secondary hotspots with ui-element mode)
  if (creationStep === 3) {
    return (
      <UIElementSelection
        selectedUIElement={selectedUIElement}
        setSelectedUIElement={setSelectedUIElement}
        hotspotName={hotspotForm.name}
        onComplete={(uiElement) => {
          setSelectedUIElement(uiElement);
          setCreationStep(4);
        }}
        onCancel={resetCreationState}
        setCreationStep={setCreationStep}
        isSaving={isSaving}
      />
    );
  }
  
  // Step 4: Map Pin Selection
  if (creationStep === 4) {
    return (
      <HotspotMapPinSelection
        selectedMapPin={selectedMapPin}
        setSelectedMapPin={(mapPin) => {
          // Set the updating flag
          setIsUpdatingMapPin(true);
          // Update the map pin
          setSelectedMapPin(mapPin);
          // Clear the flag after a delay
          setTimeout(() => setIsUpdatingMapPin(false), 300);
        }}
        onComplete={(mapPin) => {
          // Set the updating flag
          setIsUpdatingMapPin(true);
          // First, ensure the parent has the latest selection
          setSelectedMapPin(mapPin);
          
          // Then move to the review step
          setTimeout(() => {
            setCreationStep(5);
            // Clear the flag
            setTimeout(() => setIsUpdatingMapPin(false), 300);
          }, 100);
        }}
        onCancel={() => {
          // Reset to initial state and clean up the canvas
          setSelectedMapPin(null);
          resetCreationState();
        }}
        setCreationStep={setCreationStep}
        hotspotName={hotspotForm.name}
        isSaving={isSaving}
        isUpdating={isUpdatingMapPin}
        locationId={locationId}
      />
    );
  }
  
  // Step 5: Review and Save (was previously step 3)
  if (creationStep === 5) {
    return (
      <Card className="bg-netflix-dark border-netflix-gray mb-4">
        <CardHeader>
          <CardTitle className="text-xl">Save Hotspot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-netflix-black/50 rounded-md">
            <h3 className="font-medium text-netflix-red mb-2">Hotspot Summary</h3>
            <p><strong>Name:</strong> {hotspotForm.name}</p>
            <p><strong>Type:</strong> {hotspotForm.type}</p>
            <p><strong>Points:</strong> {points.length}</p>
            {selectedMapPin && (
              <p>
                <strong>Map Pin:</strong> {selectedMapPin.name} 
                <img 
                  src={selectedMapPin.accessUrl} 
                  alt={selectedMapPin.name} 
                  className="inline-block ml-2 h-6"
                />
              </p>
            )}
            {hotspotForm.type === 'SECONDARY' && (
              <>
                {secondaryMode === 'classic' ? (
                  <>
                    <p><strong>Info Title:</strong> {hotspotForm.infoPanel.title}</p>
                    <p><strong>Description:</strong> {hotspotForm.infoPanel.description}</p>
                  </>
                ) : (
                  <p>
                    <strong>UI Element:</strong> {selectedUIElement ? selectedUIElement.name : 'None'} 
                    {selectedUIElement && (
                      <img 
                        src={selectedUIElement.accessUrl} 
                        alt={selectedUIElement.name} 
                        className="inline-block ml-2 h-10"
                      />
                    )}
                  </p>
                )}
              </>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 pt-4 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
            <Button
              onClick={() => {
                // Prepare the hotspot data for saving
                const hotspotData = {
                  ...hotspotForm,
                  coordinates: points,
                  mapPin: selectedMapPin?._id,
                  // Add UI element if selected
                  ...(hotspotForm.type === 'SECONDARY' && secondaryMode === 'ui-element' && selectedUIElement 
                    ? { uiElement: selectedUIElement._id } 
                    : {})
                };
                
                if (onSave) {
                  onSave(hotspotData);
                }
              }}
              disabled={isSaving}
              className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
            >
              {isSaving ? 'Saving...' : 'Save Hotspot'}
            </Button>
            
            <Button
              onClick={() => setCreationStep(4)} // Back to map pin selection
              variant="secondary"
              disabled={isSaving}
            >
              Back
            </Button>
            
            <Button
              onClick={resetCreationState}
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return null;
};

export default HotspotCreation;
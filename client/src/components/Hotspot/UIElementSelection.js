import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import api from '../../utils/api';

const UIElementSelection = ({
  selectedUIElement,
  setSelectedUIElement,
  onCancel,
  onComplete,
  setCreationStep,
  hotspotName,
  isSaving,
  isUpdating = false
}) => {
  const [uiElements, setUIElements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInternalUpdateRef = useRef(false);

  // Fetch UI elements on component mount
  useEffect(() => {
    const fetchUIElements = async () => {
      try {
        setIsLoading(true);
        
        // UI Elements are not location-specific
        const response = await api.getAssetsByType('UIElement');
        console.log(`Fetched ${response.data.length} UI elements`);
        
        if (response.data.length === 0) {
          console.log("No UI elements found.");
          setUIElements([]);
        } else {
          setUIElements(response.data);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching UI elements:', err);
        setError('Failed to load UI elements. Please try again.');
        setIsLoading(false);
      }
    };

    fetchUIElements();
  }, []);

  // Check for saved UI element in localStorage and restore it if found
  useEffect(() => {
    // Skip restoration if we're actively updating, to avoid loops
    if (isUpdating || isInternalUpdateRef.current) {
      console.log("Skipping UI element restoration from localStorage - update in progress");
      return;
    }

    // Only attempt to restore if we don't already have a selected UI element
    if (!selectedUIElement && uiElements.length > 0) {
      try {
        const savedUIElementData = localStorage.getItem('hotspotUIElementData');
        if (savedUIElementData) {
          const uiElementData = JSON.parse(savedUIElementData);
          
          // Find the UI element in our loaded collection by ID
          if (uiElementData.uiElement && uiElementData.uiElement._id) {
            const matchingElement = uiElements.find(element => element._id === uiElementData.uiElement._id);
            
            if (matchingElement) {
              console.log("Restoring previously selected UI element:", matchingElement.name);
              // Set flag to prevent loops
              isInternalUpdateRef.current = true;
              setSelectedUIElement(matchingElement);
              // Reset flag after a delay to allow for state update
              setTimeout(() => {
                isInternalUpdateRef.current = false;
              }, 200);
            }
          }
        }
      } catch (err) {
        console.error("Error restoring UI element from localStorage:", err);
      }
    }
  }, [selectedUIElement, uiElements, setSelectedUIElement, isUpdating]);

  return (
    <Card className="bg-netflix-dark border-netflix-gray mb-4">
      <CardHeader>
        <CardTitle className="text-xl">Select UI Element for: {hotspotName}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 border-4 border-netflix-red border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading UI elements...</p>
          </div>
        ) : error ? (
          <div className="text-netflix-red py-4">{error}</div>
        ) : uiElements.length === 0 ? (
          <div className="py-4">
            <p className="text-netflix-lightgray mb-4">No UI elements available. You'll need to upload UI elements in the Assets page first.</p>
            <Button
              onClick={() => onComplete(null)}
              className="bg-netflix-red hover:bg-netflix-darkred"
            >
              Continue Without UI Element
            </Button>
          </div>
        ) : (
          <>
            <p className="text-netflix-lightgray mb-4">
              Select a UI element to display when this hotspot is clicked:
            </p>
            <RadioGroup
              value={selectedUIElement?._id || ''}
              onValueChange={(value) => {
                const element = uiElements.find(e => e._id === value);
                setSelectedUIElement(element);
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6"
            >
              {uiElements.map((element) => (
                <div key={element._id} className="relative flex flex-col items-center">
                  <RadioGroupItem
                    value={element._id}
                    id={`element-${element._id}`}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`element-${element._id}`}
                    className={`cursor-pointer p-2 rounded-md border-2 flex flex-col items-center ${
                      selectedUIElement?._id === element._id ? 'border-netflix-red bg-netflix-black/50' : 'border-transparent'
                    }`}
                  >
                    <div className="w-24 h-24 flex items-center justify-center mb-2">
                      <img
                        src={element.accessUrl}
                        alt={element.name}
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => console.log("UI element image loaded:", element.name, element.accessUrl)}
                        onError={(e) => console.error("UI element image failed to load:", element.name, e.target.error)}
                      />
                    </div>
                    <span className="text-center text-xs truncate max-w-full">
                      {element.name}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex flex-col space-y-2 pt-4 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
              <Button
                onClick={() => {
                  // Get the current selection to make sure we pass the right element
                  const currentSelection = selectedUIElement;
                  
                  console.log("Continue clicked with selected UI element:", {
                    name: currentSelection?.name,
                    id: currentSelection?._id,
                    accessUrl: currentSelection?.accessUrl
                  });
                  
                  // Set flag to prevent localStorage restoration loops
                  isInternalUpdateRef.current = true;
                  
                  // First make sure the parent component has the latest selection
                  setSelectedUIElement(currentSelection);
                  
                  // Then wait a moment to ensure state updates before completing
                  setTimeout(() => {
                    if (onComplete) {
                      console.log("Calling onComplete with UI element:", currentSelection?.name);
                      onComplete(currentSelection);
                    }
                    
                    // Reset flag after update is complete
                    setTimeout(() => {
                      isInternalUpdateRef.current = false;
                    }, 200);
                  }, 50);
                }}
                disabled={isSaving || isUpdating}
                className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
              >
                {isSaving || isUpdating ? 'Processing...' : (setCreationStep ? 'Continue to Map Pin' : 'Save Selection')}
              </Button>
              
              <Button
                onClick={() => setCreationStep ? setCreationStep(1) : onCancel()} // Go back to form if in creation flow, otherwise cancel
                variant="secondary"
                disabled={isSaving || isUpdating}
              >
                {setCreationStep ? 'Back to Form' : 'Back'}
              </Button>
              
              <Button
                onClick={() => {
                  // Clean up localStorage data to prevent restoration
                  try {
                    localStorage.removeItem('hotspotUIElementData');
                  } catch (err) {
                    console.error("Error clearing localStorage data:", err);
                  }
                  
                  // Signal cancellation to parent
                  onCancel();
                }}
                variant="outline"
                disabled={isSaving || isUpdating}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UIElementSelection; 
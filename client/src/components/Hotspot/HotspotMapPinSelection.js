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

const HotspotMapPinSelection = ({
  selectedMapPin,
  setSelectedMapPin,
  onCancel,
  onComplete,
  setCreationStep,
  hotspotName,
  isSaving,
  isUpdating = false,
  locationId
}) => {
  const [mapPins, setMapPins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInternalUpdateRef = useRef(false);

  // Fetch map pins on component mount
  useEffect(() => {
    const fetchMapPins = async () => {
      try {
        setIsLoading(true);
        
        // Use locationId to filter map pins by location
        const response = await api.getAssetsByType('MapPin', locationId);
        console.log(`Fetched ${response.data.length} map pins for location: ${locationId}`);
        
        if (response.data.length === 0) {
          console.log("No map pins found for this location. Checking if there are any map pins without location.");
          // Fallback to get pins without location (legacy pins)
          const legacyResponse = await api.getAssetsByType('MapPin', null);
          const noLocationPins = legacyResponse.data.filter(pin => !pin.location);
          
          if (noLocationPins.length > 0) {
            console.log(`Found ${noLocationPins.length} map pins without location assigned.`);
            setMapPins(noLocationPins);
          } else {
            setMapPins([]);
          }
        } else {
          setMapPins(response.data);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching map pins:', err);
        setError('Failed to load map pins. Please try again.');
        setIsLoading(false);
      }
    };

    fetchMapPins();
  }, [locationId]);

  // Check for saved map pin in localStorage and restore it if found
  useEffect(() => {
    // Skip restoration if we're actively updating, to avoid loops
    if (isUpdating || isInternalUpdateRef.current) {
      console.log("Skipping map pin restoration from localStorage - update in progress");
      return;
    }

    // Only attempt to restore if we don't already have a selected pin
    if (!selectedMapPin && mapPins.length > 0) {
      try {
        const savedPinData = localStorage.getItem('hotspotMapPinData');
        if (savedPinData) {
          const pinData = JSON.parse(savedPinData);
          
          // Find the map pin in our loaded collection by ID
          if (pinData.mapPin && pinData.mapPin._id) {
            const matchingPin = mapPins.find(pin => pin._id === pinData.mapPin._id);
            
            if (matchingPin) {
              console.log("Restoring previously selected map pin:", matchingPin.name);
              // Set flag to prevent loops
              isInternalUpdateRef.current = true;
              setSelectedMapPin(matchingPin);
              // Reset flag after a delay to allow for state update
              setTimeout(() => {
                isInternalUpdateRef.current = false;
              }, 200);
            }
          }
        }
      } catch (err) {
        console.error("Error restoring map pin from localStorage:", err);
      }
    }
  }, [selectedMapPin, mapPins, setSelectedMapPin, isUpdating]);

  return (
    <Card className="bg-netflix-dark border-netflix-gray mb-4">
      <CardHeader>
        <CardTitle className="text-xl">Select Map Pin for: {hotspotName}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-10 h-10 border-4 border-netflix-red border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading map pins...</p>
          </div>
        ) : error ? (
          <div className="text-netflix-red py-4">{error}</div>
        ) : mapPins.length === 0 ? (
          <div className="py-4">
            <p className="text-netflix-lightgray mb-4">No map pins available. You'll need to upload map pins in the Assets page first.</p>
            <Button
              onClick={() => onComplete(null)}
              className="bg-netflix-red hover:bg-netflix-darkred"
            >
              Continue Without Map Pin
            </Button>
          </div>
        ) : (
          <>
            <p className="text-netflix-lightgray mb-4">
              Select a map pin to display on your hotspot:
              {mapPins.some(pin => !pin.location) && (
                <span className="block text-xs mt-1 text-amber-400">
                  Note: Some pins shown do not have a location assigned and will be available to all locations.
                </span>
              )}
            </p>
            <RadioGroup
              value={selectedMapPin?._id || ''}
              onValueChange={(value) => {
                const pin = mapPins.find(p => p._id === value);
                setSelectedMapPin(pin);
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6"
            >
              {mapPins.map((pin) => (
                <div key={pin._id} className="relative flex flex-col items-center">
                  <RadioGroupItem
                    value={pin._id}
                    id={`pin-${pin._id}`}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`pin-${pin._id}`}
                    className={`cursor-pointer p-2 rounded-md border-2 flex flex-col items-center ${
                      selectedMapPin?._id === pin._id ? 'border-netflix-red bg-netflix-black/50' : 'border-transparent'
                    }`}
                  >
                    <div className="w-16 h-24 flex items-center justify-center mb-2">
                      <img
                        src={pin.accessUrl}
                        alt={pin.name}
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => console.log("Map pin image loaded:", pin.name, pin.accessUrl)}
                        onError={(e) => console.error("Map pin image failed to load:", pin.name, e.target.error)}
                      />
                    </div>
                    <span className="text-center text-xs truncate max-w-full">
                      {pin.name}
                      {!pin.location && (
                        <span className="block text-amber-400 text-[10px]">(Global)</span>
                      )}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex flex-col space-y-2 pt-4 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
              <Button
                onClick={() => {
                  // Get the current selection to make sure we pass the right pin
                  const currentSelection = selectedMapPin;
                  
                  console.log("Continue to Review clicked with selected map pin:", {
                    name: currentSelection?.name,
                    id: currentSelection?._id,
                    accessUrl: currentSelection?.accessUrl
                  });
                  
                  // Set flag to prevent localStorage restoration loops
                  isInternalUpdateRef.current = true;
                  
                  // First make sure the parent component has the latest selection
                  setSelectedMapPin(currentSelection);
                  
                  // Then wait a moment to ensure state updates before completing
                  setTimeout(() => {
                    if (onComplete) {
                      console.log("Calling onComplete with map pin:", currentSelection?.name);
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
                {isSaving || isUpdating ? 'Processing...' : 'Continue to Review'}
              </Button>
              
              <Button
                onClick={() => setCreationStep ? setCreationStep(2) : onCancel()} // Go back to drawing if in creation flow, otherwise cancel
                variant="secondary"
                disabled={isSaving || isUpdating}
              >
                {setCreationStep ? 'Back to Drawing' : 'Back'}
              </Button>
              
              <Button
                onClick={() => {
                  // Clean up localStorage data to prevent restoration
                  try {
                    localStorage.removeItem('hotspotMapPinData');
                    localStorage.removeItem('hotspotDraft');
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

export default HotspotMapPinSelection; 
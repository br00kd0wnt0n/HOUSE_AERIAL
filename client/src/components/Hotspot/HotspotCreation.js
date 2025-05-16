import React from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import HotspotForm from './HotspotForm';

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
  isSaving
}) => {
  if (creationStep === 0) return null;

  // Step 1: Information Entry
  if (creationStep === 1) {
    return (
      <HotspotForm
        hotspotForm={hotspotForm}
        handleInputChange={handleInputChange}
        handleSelectChange={handleSelectChange}
        onCancel={resetCreationState}
        proceedToDrawing={proceedToDrawing}
        creationStep={creationStep}
        title="New Hotspot Information"
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
  
  // Step 3: Review and Save
  if (creationStep === 3) {
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
            {hotspotForm.type === 'SECONDARY' && (
              <>
                <p><strong>Info Title:</strong> {hotspotForm.infoPanel.title}</p>
                <p><strong>Description:</strong> {hotspotForm.infoPanel.description}</p>
              </>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 pt-4 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
            <Button 
              onClick={saveNewHotspot}
              disabled={isSaving}
              className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
            >
              {isSaving ? 'Saving...' : 'Save Hotspot'}
            </Button>
            
            <Button 
              onClick={() => {
                setCreationStep(2); // Go back to drawing
              }}
              variant="secondary"
            >
              Edit Shape
            </Button>
            
            <Button 
              onClick={() => {
                setCreationStep(1); // Go back to info
              }}
              variant="secondary"
            >
              Edit Info
            </Button>
            
            <Button 
              onClick={resetCreationState}
              variant="outline"
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
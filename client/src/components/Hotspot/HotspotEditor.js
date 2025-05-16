import React from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';

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
  drawExistingHotspots
}) => {
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
                setPoints([]);
                drawExistingHotspots();
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
          
          {/* Info panel fields (only for SECONDARY hotspots) */}
          {hotspotForm.type === 'SECONDARY' && (
            <div className="space-y-4 p-3 bg-netflix-black rounded-md">
              <h4 className="font-medium text-netflix-red">Information Panel</h4>
              
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
            </div>
          )}
          
          <div className="flex flex-col space-y-2 pt-4 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
            <Button 
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
            >
              {isSaving ? 'Saving...' : 'Update Info'}
            </Button>
            
            <Button
              type="button"
              onClick={startEditingPoints}
              disabled={isSaving}
              className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
            >
              Edit Shape
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Delete Hotspot
            </Button>

            <Button
              type="button"
              onClick={() => setSelectedHotspot(null)}
              disabled={isSaving}
              className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
            >
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default HotspotEditor; 
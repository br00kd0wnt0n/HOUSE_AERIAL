// client/src/pages/Admin/Locations.js - Location management page

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';

// Import shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { DeleteConfirmation } from '../../components/ui/DeleteConfirmation';
import './AdminPages.css';

const Locations = ({ showCreate, onCreateShown }) => {
  const { 
    locations,
    createLocation,
    updateLocation,
    deleteLocation,
    isLoading,
    isSaving,
  } = useAdmin();
  
  const { toast } = useToast();
  
  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    locationId: null,
    locationName: ''
  });

  // Listen for props change to open the creation dialog
  useEffect(() => {
    if (showCreate) {
      setIsCreating(true);
      // Tell the parent that we've shown the dialog
      onCreateShown && onCreateShown();
    }
  }, [showCreate, onCreateShown]);
  
  // Form handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleEditClick = useCallback((location) => {
    setCurrentLocation(location);
    setFormData({
      name: location.name,
      description: location.description || ''
    });
    setIsEditing(true);
  }, []);
  
  const handleDeleteClick = useCallback((locationId, locationName) => {
    setDeleteConfirmation({
      isOpen: true,
      locationId,
      locationName
    });
  }, []);
  
  const handleCreateSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Location name is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createLocation(formData);
      setIsCreating(false);
      toast({
        title: "Success",
        description: `Location "${formData.name}" created successfully`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive"
      });
    }
  }, [formData, createLocation, toast]);
  
  const handleEditSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Location name is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await updateLocation(currentLocation._id, formData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: `Location "${formData.name}" updated successfully`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive"
      });
    }
  }, [formData, currentLocation, updateLocation, toast]);
  
  const performDelete = useCallback(async () => {
    try {
      await deleteLocation(deleteConfirmation.locationId);
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      toast({
        title: "Success",
        description: `Location "${deleteConfirmation.locationName}" deleted successfully`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive"
      });
    }
  }, [deleteConfirmation, deleteLocation, toast]);
  
  // Sort locations alphabetically
  const sortedLocations = useMemo(() => {
    return [...(locations || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full bg-netflix-black text-white">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading locations...</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-netflix-black text-white" data-component="locations">
      {/* Add New Location button is now moved to App.js header */}
      <div className="absolute top-4 right-8 hidden">
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-netflix-red hover:bg-netflix-red/80"
          data-action="add-location"
        >
          Add New Location
        </Button>
      </div>
      
      {sortedLocations.length === 0 ? (
        <div className="bg-netflix-dark p-8 rounded-md text-center">
          <p className="text-lg text-netflix-lightgray">No locations found. Click the "Add New Location" button to add a new location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedLocations.map(location => (
            <Card key={location._id} className="bg-netflix-dark border-netflix-gray">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-white">{location.name}</CardTitle>
                  <Badge variant={location.isActive ? "success" : "destructive"}>
                    {location.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-netflix-lightgray mb-4">
                  {location.description || 'No description provided'}
                </p>
                {location.coordinates && (
                  <div className="text-sm text-netflix-lightgray">
                    <p>Coordinates: X: {location.coordinates.x || 0}, Y: {location.coordinates.y || 0}, Z: {location.coordinates.z || 0}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => handleEditClick(location)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteClick(location._id, location.name)}>
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Location Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Location Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={performDelete}
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone, and all associated assets and hotspots will also be removed."
        itemName={deleteConfirmation.locationName}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Locations; 
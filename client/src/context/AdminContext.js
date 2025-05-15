// client/src/context/AdminContext.js - Context for admin panel state management

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';

const AdminContext = createContext();

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }) {
  // Locations state
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Assets state
  const [assets, setAssets] = useState([]);
  const [assetsByType, setAssetsByType] = useState({
    AERIAL: [],
    DiveIn: [],
    FloorLevel: [],
    ZoomOut: [],
    Transition: [],
    Button: [],
    MapPin: [],
    UIElement: []
  });
  
  // Hotspots state
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  
  // Playlists state
  const [playlists, setPlaylists] = useState([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ success: false, message: '' });
  
  // Add fetchInProgress state
  const [fetchInProgress, setFetchInProgress] = useState(false);
  
  // Add retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  // Add retry utility
  const retryWithBackoff = async (fn, retries = MAX_RETRIES) => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... ${retries} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return retryWithBackoff(fn, retries - 1);
      }
      throw error;
    }
  };

  // Modify fetchLocations to use retry logic
  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await retryWithBackoff(() => api.getLocations());
      console.log('Locations response:', response.data);
      setLocations(prevLocations => {
        if (JSON.stringify(prevLocations) !== JSON.stringify(response.data)) {
          // Select first location by default if none selected or if changed
          if (response.data.length > 0 && (!selectedLocation || selectedLocation._id !== response.data[0]._id)) {
            console.log('Setting default location:', response.data[0]);
            setSelectedLocation(response.data[0]);
          }
          return response.data;
        }
        return prevLocations;
      });
    } catch (error) {
      console.error('Error fetching locations:', error);
      setSaveStatus({ 
        success: false, 
        message: `Failed to load locations: ${error.message}. Please refresh the page.` 
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modify fetchAssets to use retry logic
  const fetchAssets = useCallback(async (locationId) => {
    if (!locationId || isLoading || fetchInProgress) {
      console.log('Skipping asset fetch:', { locationId, isLoading, fetchInProgress });
      return;
    }

    // Check if we already have assets for this location
    const existingAssets = assets.filter(asset => asset.location?._id === locationId);
    if (existingAssets.length > 0) {
      console.log('Assets already loaded for location:', locationId);
      return;
    }

    setFetchInProgress(true);
    try {
      console.log('Fetching assets for location:', locationId);
      const response = await retryWithBackoff(() => api.getAssets(null, locationId));
      console.log('Assets response:', {
        count: response.data.length,
        assets: response.data.map(a => ({ id: a._id, type: a.type, name: a.name }))
      });
      
      // Ensure assets have location data populated
      const assetsWithLocation = response.data.map(asset => ({
        ...asset,
        location: asset.location || { _id: locationId }
      }));
      
      setAssets(prevAssets => {
        if (JSON.stringify(prevAssets) !== JSON.stringify(assetsWithLocation)) {
          console.log('Updating assets state with new assets');
          return assetsWithLocation;
        }
        console.log('Assets unchanged, not updating state');
        return prevAssets;
      });
    } catch (error) {
      console.error('Error fetching assets:', error);
      setSaveStatus({ 
        success: false, 
        message: `Failed to load assets: ${error.message}. Please try again.` 
      });
    } finally {
      setFetchInProgress(false);
    }
  }, [isLoading, fetchInProgress, assets]);

  // Modify fetchHotspots to use retry logic
  const fetchHotspots = useCallback(async (locationId) => {
    if (!locationId) {
      console.log('No location ID provided, skipping hotspot fetch');
      return;
    }

    try {
      console.log('Fetching hotspots for location:', locationId);
      const response = await retryWithBackoff(() => api.getHotspotsByLocation(locationId));
      console.log('Hotspots response:', response.data);
      
      setHotspots(prevHotspots => {
        if (JSON.stringify(prevHotspots) !== JSON.stringify(response.data)) {
          return response.data;
        }
        return prevHotspots;
      });
    } catch (error) {
      console.error('Error fetching hotspots:', error);
      setSaveStatus({ 
        success: false, 
        message: `Failed to load hotspots: ${error.message}. Please try again.` 
      });
    }
  }, []);

  // Modify fetchPlaylists to use retry logic
  const fetchPlaylists = useCallback(async (locationId) => {
    if (!locationId) {
      console.log('No location ID provided, skipping playlist fetch');
      return;
    }

    try {
      console.log('Fetching playlists for location:', locationId);
      const response = await retryWithBackoff(() => api.getPlaylistsByLocation(locationId));
      console.log('Playlists response:', response.data);
      
      setPlaylists(prevPlaylists => {
        if (JSON.stringify(prevPlaylists) !== JSON.stringify(response.data)) {
          return response.data;
        }
        return prevPlaylists;
      });
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setSaveStatus({ 
        success: false, 
        message: `Failed to load playlists: ${error.message}. Please try again.` 
      });
    }
  }, []);

  // Load initial data only once
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('Loading initial data...');
      await fetchLocations();
    };
    loadInitialData();
  }, [fetchLocations]);

  // Load location-specific data when location changes
  useEffect(() => {
    if (selectedLocation?._id) {
      const loadLocationData = async () => {
        console.log('Loading data for location:', selectedLocation._id);
        
        // Only fetch if we don't have data for this location
        const hasAssets = assets.some(asset => asset.location?._id === selectedLocation._id);
        const hasHotspots = hotspots.some(hotspot => hotspot.location?._id === selectedLocation._id);
        const hasPlaylists = playlists.some(playlist => playlist.location?._id === selectedLocation._id);

        console.log('Data status:', {
          hasAssets,
          hasHotspots,
          hasPlaylists,
          assetsCount: assets.length,
          hotspotsCount: hotspots.length,
          playlistsCount: playlists.length
        });

        const promises = [];
        if (!hasAssets) {
          console.log('Fetching assets for location:', selectedLocation._id);
          promises.push(fetchAssets(selectedLocation._id));
        }
        if (!hasHotspots) {
          console.log('Fetching hotspots for location:', selectedLocation._id);
          promises.push(fetchHotspots(selectedLocation._id));
        }
        if (!hasPlaylists) {
          console.log('Fetching playlists for location:', selectedLocation._id);
          promises.push(fetchPlaylists(selectedLocation._id));
        }

        if (promises.length > 0) {
          try {
            await Promise.all(promises);
            console.log('Successfully loaded all data for location:', selectedLocation._id);
          } catch (error) {
            console.error('Error loading location data:', error);
          }
        } else {
          console.log('Using cached data for location:', selectedLocation._id);
        }
      };
      loadLocationData();
    }
  }, [selectedLocation?._id, fetchAssets, fetchHotspots, fetchPlaylists, assets, hotspots, playlists]);

  // Organize assets by type when assets change
  useEffect(() => {
    console.log('Assets changed, organizing by type:', {
      assetsCount: assets.length,
      assets: assets.map(a => ({ id: a._id, type: a.type, name: a.name }))
    });

    if (!assets.length) {
      console.log('No assets to organize');
      return;
    }

    console.log('Organizing assets by type. Total assets:', assets.length);
    
    const categorized = {
      AERIAL: [],
      DiveIn: [],
      FloorLevel: [],
      ZoomOut: [],
      Transition: [],
      Button: [],
      MapPin: [],
      UIElement: []
    };
    
    assets.forEach(asset => {
      if (categorized[asset.type]) {
        categorized[asset.type].push(asset);
      } else {
        console.warn('Unknown asset type:', asset.type, asset);
      }
    });
    
    console.log('Assets by type:', Object.entries(categorized).reduce((acc, [type, items]) => {
      acc[type] = {
        count: items.length,
        assets: items.map(a => ({ id: a._id, name: a.name }))
      };
      return acc;
    }, {}));
    
    setAssetsByType(prev => {
      // Only update if assets have changed
      if (JSON.stringify(prev) !== JSON.stringify(categorized)) {
        console.log('Updating assets by type');
        return categorized;
      }
      console.log('Assets by type unchanged');
      return prev;
    });
  }, [assets]);
  
  // API functions
  const uploadAsset = async (file, name, type, locationId = null) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Uploading asset...' });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('type', type);
      if (locationId) {
        formData.append('location', locationId);
      }
      
      const response = await api.createAsset(formData);
      
      // Update assets list
      setAssets(prevAssets => [...prevAssets, response.data]);
      
      setSaveStatus({ 
        success: true, 
        message: `Asset "${name}" uploaded successfully.` 
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading asset:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error uploading asset: ${error.response?.data?.error || error.message}` 
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  const deleteAsset = async (assetId) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Deleting asset...' });
    
    try {
      await api.deleteAsset(assetId);
      
      // Update assets list
      setAssets(prevAssets => prevAssets.filter(asset => asset._id !== assetId));
      
      setSaveStatus({ 
        success: true, 
        message: 'Asset deleted successfully.' 
      });
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error deleting asset: ${error.response?.data?.error || error.message}` 
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Hotspot management functions
  const createHotspot = async (hotspotData) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Creating hotspot...' });
    
    try {
      const response = await api.createHotspot({
        ...hotspotData,
        location: selectedLocation._id
      });
      
      // Update hotspots list
      setHotspots(prevHotspots => [...prevHotspots, response.data]);
      
      setSaveStatus({ 
        success: true, 
        message: `Hotspot "${hotspotData.name}" created successfully.` 
      });
      return response.data;
    } catch (error) {
      console.error('Error creating hotspot:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error creating hotspot: ${error.response?.data?.error || error.message}` 
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  const updateHotspot = async (hotspotId, hotspotData) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Updating hotspot...' });
    
    try {
      const response = await api.updateHotspot(hotspotId, hotspotData);
      
      // Update hotspots list
      setHotspots(prevHotspots => 
        prevHotspots.map(hotspot => 
          hotspot._id === hotspotId ? response.data : hotspot
        )
      );
      
      setSaveStatus({ 
        success: true, 
        message: `Hotspot "${hotspotData.name || 'unnamed'}" updated successfully.` 
      });
      return response.data;
    } catch (error) {
      console.error('Error updating hotspot:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error updating hotspot: ${error.response?.data?.error || error.message}` 
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  const deleteHotspot = async (hotspotId) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Deleting hotspot...' });
    
    try {
      await api.deleteHotspot(hotspotId);
      
      // Update hotspots list
      setHotspots(prevHotspots => prevHotspots.filter(hotspot => hotspot._id !== hotspotId));
      
      // Clear selected hotspot if it was deleted
      if (selectedHotspot && selectedHotspot._id === hotspotId) {
        setSelectedHotspot(null);
      }
      
      setSaveStatus({ 
        success: true, 
        message: 'Hotspot deleted successfully.' 
      });
      return true;
    } catch (error) {
      console.error('Error deleting hotspot:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error deleting hotspot: ${error.response?.data?.error || error.message}` 
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Playlist management functions
  const updatePlaylist = async (playlistId, videoData) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Updating playlist...' });
    
    try {
      const response = await api.updatePlaylist(playlistId, videoData);
      
      // Update playlists list
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(playlist => 
          playlist._id === playlistId ? response.data : playlist
        )
      );
      
      setSaveStatus({ 
        success: true, 
        message: 'Playlist updated successfully.' 
      });
      return response.data;
    } catch (error) {
      console.error('Error updating playlist:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error updating playlist: ${error.response?.data?.error || error.message}` 
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Push all changes to frontend
  const pushChangesToFrontend = async () => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Pushing changes to frontend...' });
    
    try {
      // No actual API call needed since the frontend will reload the data
      // This is just for user feedback
      setSaveStatus({ 
        success: true, 
        message: 'All changes have been pushed to the frontend.' 
      });
      return true;
    } catch (error) {
      console.error('Error pushing changes:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error pushing changes: ${error.message}` 
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Provide the context value
  const value = {
    // State
    locations,
    selectedLocation,
    setSelectedLocation,
    assets,
    assetsByType,
    hotspots,
    selectedHotspot,
    setSelectedHotspot,
    drawingMode,
    setDrawingMode,
    playlists,
    isLoading,
    isSaving,
    saveStatus,
    setSaveStatus,
    
    // API methods
    fetchLocations,
    fetchAssets,
    fetchHotspots,
    fetchPlaylists,
    uploadAsset,
    deleteAsset,
    createHotspot,
    updateHotspot,
    deleteHotspot,
    updatePlaylist,
    pushChangesToFrontend
  };
  
  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

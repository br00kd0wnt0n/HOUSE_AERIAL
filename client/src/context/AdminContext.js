// client/src/context/AdminContext.js - Context for admin panel state management

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';

const AdminContext = createContext();

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }) {
  console.log('[AdminProvider] Initializing / Re-rendering');
  
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(false); // Default to false when in AdminProvider

  // Locations state
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Tracking state for loaded locations
  const [fetchedLocationIds, setFetchedLocationIds] = useState(new Set());
  
  // Assets state
  const [assets, setAssets] = useState([]); // Holds all assets fetched so far, across locations
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
  const [hotspots, setHotspots] = useState([]); // Holds all hotspots fetched
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  
  // Playlists state
  const [playlists, setPlaylists] = useState([]); // Holds all playlists fetched
  
  // Loading states
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isFetchingLocationData, setIsFetchingLocationData] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ success: false, message: '' });
  
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const retryWithBackoff = useCallback(async (fn, retries = MAX_RETRIES) => {
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
  }, []);

  const fetchLocations = useCallback(async () => {
    setIsLoadingLocations(true);
    console.log('[AdminProvider] fetchLocations called.');
    try {
      const response = await retryWithBackoff(() => api.getLocations());
      
      // Handle both response formats
      const locationsData = Array.isArray(response) ? response : (response.data || []);
      
      console.log('[AdminProvider] Locations API response:', locationsData.length);
      setLocations(locationsData);
      if (locationsData.length > 0 && !selectedLocation) {
         // Set selectedLocation only if it's not already set by another interaction
        console.log('[AdminProvider] Setting default selectedLocation:', locationsData[0].name);
        setSelectedLocation(locationsData[0]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setSaveStatus({ success: false, message: `Failed to load locations: ${error.message}.` });
    } finally {
      setIsLoadingLocations(false);
      console.log('[AdminProvider] fetchLocations finished.');
    }
  }, [selectedLocation, retryWithBackoff]); // Depend on selectedLocation to avoid re-setting it if already set.

  const fetchAssetsForLocation = useCallback(async (locationId) => {
    if (!locationId) return;
    console.log(`[AdminProvider] fetchAssetsForLocation called for ${locationId}.`);
    // No direct dependency on 'assets' state here to avoid loops
    try {
      const response = await retryWithBackoff(() => api.getAssets(null, locationId));
      
      // Handle both response formats
      const assetsData = Array.isArray(response) ? response : (response.data || []);
      
      console.log(`[AdminProvider] Assets API response for ${locationId}:`, assetsData.length);
      // Merge new assets with existing, replacing if IDs match, to build a cumulative list
      setAssets(prevAssets => {
        const newAssets = assetsData.map(asset => ({ ...asset, location: asset.location || { _id: locationId } }));
        const updatedAssets = [...prevAssets];
        newAssets.forEach(newAsset => {
          const index = updatedAssets.findIndex(a => a._id === newAsset._id);
          if (index !== -1) updatedAssets[index] = newAsset; // Update existing
          else updatedAssets.push(newAsset); // Add new
        });
        console.log('[AdminProvider] Updated cumulative assets count:', updatedAssets.length);
        return updatedAssets;
      });
    } catch (error) {
      console.error(`Error fetching assets for ${locationId}:`, error);
      setSaveStatus({ success: false, message: `Failed to load assets: ${error.message}.` });
    }
  }, [retryWithBackoff]); // No dependencies like isLoading/fetchInProgress that it controls itself

  const fetchHotspotsForLocation = useCallback(async (locationId) => {
    if (!locationId) return;
    console.log(`[AdminProvider] fetchHotspotsForLocation called for ${locationId}.`);
    try {
      const response = await retryWithBackoff(() => api.getHotspotsByLocation(locationId));
      
      // Handle the new response format which returns the array directly instead of {data: [...]}
      const hotspotsData = Array.isArray(response) ? response : (response.data || []);
      
      console.log(`[AdminProvider] Hotspots API response for ${locationId}:`, hotspotsData.length);
      
      // Replace the entire hotspots array with only the hotspots from the current location
      // instead of accumulating hotspots from different locations
      setHotspots(hotspotsData);
      console.log('[AdminProvider] Updated hotspots count for this location:', hotspotsData.length);
    } catch (error) {
      console.error(`Error fetching hotspots for ${locationId}:`, error);
      setSaveStatus({ success: false, message: `Failed to load hotspots: ${error.message}.` });
    }
  }, [retryWithBackoff]);

  const fetchPlaylistsForLocation = useCallback(async (locationId) => {
    if (!locationId) return;
    console.log(`[AdminProvider] fetchPlaylistsForLocation called for ${locationId}.`);
    try {
      // Use getPlaylists() instead of the non-existent getPlaylistsByLocation
      const response = await retryWithBackoff(() => api.getPlaylists());
      
      // Handle both response formats
      const playlistsData = Array.isArray(response) ? response : (response.data || []);
      
      console.log(`[AdminProvider] All playlists API response:`, playlistsData.length);
      
      // Filter playlists for this location based on hotspot's location
      const filteredPlaylists = playlistsData.filter(playlist => {
        // Check if the playlist has a hotspot and that hotspot has a location matching our locationId
        return playlist.hotspot && 
               ((typeof playlist.hotspot.location === 'string' && playlist.hotspot.location === locationId) ||
                (playlist.hotspot.location && playlist.hotspot.location._id === locationId));
      });
      
      console.log(`[AdminProvider] Filtered playlists for ${locationId}:`, filteredPlaylists.length);
      
      setPlaylists(prevPlaylists => {
        const newPlaylists = filteredPlaylists;
        const updatedPlaylists = [...prevPlaylists];
        newPlaylists.forEach(newPlaylist => {
          const index = updatedPlaylists.findIndex(p => p._id === newPlaylist._id);
          if (index !== -1) updatedPlaylists[index] = newPlaylist;
          else updatedPlaylists.push(newPlaylist);
        });
        console.log('[AdminProvider] Updated cumulative playlists count:', updatedPlaylists.length);
        return updatedPlaylists;
      });
    } catch (error) {
      console.error(`Error fetching playlists for ${locationId}:`, error);
      setSaveStatus({ success: false, message: `Failed to load playlists: ${error.message}.` });
    }
  }, [retryWithBackoff]);

  // Effect to load initial set of all locations
  useEffect(() => {
    console.log('[AdminProvider] Initial locations fetch effect running.');
    fetchLocations();
  }, [fetchLocations]); // fetchLocations is stable if its own deps are stable

  // Effect to load data for the currently selected location
  useEffect(() => {
    const currentLocId = selectedLocation?._id;
    if (currentLocId) {
      console.log(`[AdminProvider] Selected location changed to: ${currentLocId}. Checking data.`);
      
      // Only fetch if we haven't already fetched data for this location
      if (!fetchedLocationIds.has(currentLocId)) {
        setIsFetchingLocationData(true);
        
        const loadAllDataForLocation = async () => {
          console.log(`[AdminProvider] Loading data for location: ${currentLocId} (not previously fetched)`);
          
          const promisesToRun = [
            fetchAssetsForLocation(currentLocId),
            fetchHotspotsForLocation(currentLocId),
            fetchPlaylistsForLocation(currentLocId)
          ];

          try {
            await Promise.all(promisesToRun);
            console.log(`[AdminProvider] All data fetched for ${currentLocId}.`);
            
            // Mark this location as fetched to prevent future redundant fetches
            setFetchedLocationIds(prev => new Set([...prev, currentLocId]));
          } catch (err) {
            console.error(`[AdminProvider] Error during Promise.all for ${currentLocId}:`, err);
          } finally {
            setIsFetchingLocationData(false);
            console.log(`[AdminProvider] Finished data processing for ${currentLocId}.`);
          }
        };

        loadAllDataForLocation();
      } else {
        console.log(`[AdminProvider] Location ${currentLocId} data already fetched, skipping.`);
      }
    }
  }, [selectedLocation?._id, fetchedLocationIds, fetchAssetsForLocation, fetchHotspotsForLocation, fetchPlaylistsForLocation]);
  // Removed assets, hotspots, playlists from dependency array since they cause render loops
  
  // Organize assets by type when the cumulative 'assets' state changes
  useEffect(() => {
    console.log('[AdminProvider] Organizing assets by type. Total assets:', assets.length);
    if (!assets.length) {
        // Ensure assetsByType is reset if all assets are cleared
        setAssetsByType(prev => {
            const isEmpty = Object.values(prev).every(arr => arr.length === 0);
            if (!isEmpty) return { AERIAL: [], DiveIn: [], FloorLevel: [], ZoomOut: [], Transition: [], Button: [], MapPin: [], UIElement: [] };
            return prev;
        });
      return;
    }

    const categorized = assets.reduce((acc, asset) => {
      if (!acc[asset.type]) acc[asset.type] = [];
      acc[asset.type].push(asset);
      return acc;
    }, { AERIAL: [], DiveIn: [], FloorLevel: [], ZoomOut: [], Transition: [], Button: [], MapPin: [], UIElement: [] });
    
    setAssetsByType(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(categorized)) {
        console.log('[AdminProvider] Assets by type updated.');
        return categorized;
      }
      return prev;
    });
  }, [assets]);
  
  // API functions
  const uploadAsset = async (file, name, type, locationId = null, metadata = null) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Uploading asset...' });
    try {
      console.log(`[AdminContext] Uploading asset: ${name}, type: ${type}, locationId: ${locationId || 'none'}, metadata:`, metadata);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('type', type);
      
      // Ensure locationId is properly handled
      if (locationId && locationId !== 'null' && locationId !== 'undefined') {
        console.log(`[AdminContext] Adding location ID to form data: ${locationId}`);
        formData.append('location', locationId);
      } else {
        console.log(`[AdminContext] No valid location ID to add to form data`);
      }
      
      // Add metadata if provided
      if (metadata && typeof metadata === 'object') {
        console.log(`[AdminContext] Adding metadata to form data:`, metadata);
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      // Log formData entries for debugging
      console.log('[AdminContext] FormData contents:');
      for (let pair of formData.entries()) {
        console.log(`[AdminContext] ${pair[0]}: ${pair[1]}`);
      }
      
      const response = await api.createAsset(formData);
      console.log(`[AdminContext] Upload response:`, response.data);
      
      // Check if the location was properly saved
      if (locationId && (!response.data.location || response.data.location === null)) {
        console.warn(`[AdminContext] Warning: Location was not saved in the response data despite being provided.`);
      }
      
      // Manually add to the cumulative assets state after successful upload
      setAssets(prevAssets => [...prevAssets, { ...response.data, location: response.data.location || { _id: locationId } }]);
      setSaveStatus({ success: true, message: `Asset "${name}" uploaded successfully.` });
      return response.data;
    } catch (error) {
      console.error('Error uploading asset:', error);
      setSaveStatus({ success: false, message: `Error uploading asset: ${error.response?.data?.error || error.message}` });
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
      setAssets(prevAssets => prevAssets.filter(asset => asset._id !== assetId));
      setSaveStatus({ success: true, message: 'Asset deleted successfully.' });
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      setSaveStatus({ success: false, message: `Error deleting asset: ${error.response?.data?.error || error.message}` });
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
  
  // Location management functions
  const createLocation = async (locationData) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Creating location...' });
    
    try {
      const response = await api.createLocation(locationData);
      
      // Update locations list
      setLocations(prevLocations => [...prevLocations, response.data]);
      
      setSaveStatus({ 
        success: true, 
        message: `Location "${locationData.name}" created successfully.` 
      });
      return response.data;
    } catch (error) {
      console.error('Error creating location:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error creating location: ${error.response?.data?.error || error.message}` 
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateLocation = async (locationId, locationData) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Updating location...' });
    
    try {
      const response = await api.updateLocation(locationId, locationData);
      
      // Update locations list
      setLocations(prevLocations => 
        prevLocations.map(location => 
          location._id === locationId ? response.data : location
        )
      );
      
      // If this is the selected location, update it too
      if (selectedLocation && selectedLocation._id === locationId) {
        setSelectedLocation(response.data);
      }
      
      setSaveStatus({ 
        success: true, 
        message: `Location "${locationData.name}" updated successfully.` 
      });
      return response.data;
    } catch (error) {
      console.error('Error updating location:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error updating location: ${error.response?.data?.error || error.message}` 
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLocation = async (locationId) => {
    setIsSaving(true);
    setSaveStatus({ success: false, message: 'Deleting location...' });
    
    try {
      await api.deleteLocation(locationId);
      
      // Update locations list
      setLocations(prevLocations => prevLocations.filter(location => location._id !== locationId));
      
      // If this is the selected location, clear it and select another one if available
      if (selectedLocation && selectedLocation._id === locationId) {
        const remainingLocations = locations.filter(location => location._id !== locationId);
        setSelectedLocation(remainingLocations.length > 0 ? remainingLocations[0] : null);
        
        // Clear data for this location
        if (remainingLocations.length === 0) {
          setAssets([]);
          setHotspots([]);
          setPlaylists([]);
        }
      }
      
      // Remove from fetchedLocationIds
      setFetchedLocationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(locationId);
        return newSet;
      });
      
      setSaveStatus({ 
        success: true, 
        message: 'Location deleted successfully.' 
      });
      return true;
    } catch (error) {
      console.error('Error deleting location:', error);
      setSaveStatus({ 
        success: false, 
        message: `Error deleting location: ${error.response?.data?.error || error.message}` 
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Provide the context value
  const value = {
    isAdminMode,
    setIsAdminMode,
    locations,
    selectedLocation,
    setSelectedLocation, // Make sure this is used carefully to avoid loops
    assets, // The cumulative list of all assets fetched
    assetsByType, // Assets categorized and filtered for the UI
    hotspots,
    selectedHotspot,
    setSelectedHotspot,
    drawingMode,
    setDrawingMode,
    playlists,
    isLoading: isLoadingLocations || isFetchingLocationData, // Combined loading state for UI
    fetchInProgress: isFetchingLocationData, // More specific for asset/hotspot/playlist fetches per location
    isSaving,
    setSaving: setIsSaving,
    saveStatus,
    setSaveStatus,
    fetchLocations,
    fetchAssets: fetchAssetsForLocation, // Expose the per-location fetcher
    fetchHotspots: fetchHotspotsForLocation,
    fetchPlaylists: fetchPlaylistsForLocation,
    uploadAsset,
    deleteAsset,
    createHotspot,
    updateHotspot,
    deleteHotspot,
    updatePlaylist,
    pushChangesToFrontend,
    fetchedLocationIds,
    // Added location management functions
    createLocation,
    updateLocation,
    deleteLocation
  };
  
  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

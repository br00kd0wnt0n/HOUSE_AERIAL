// client/src/pages/Admin/Playlists.js - Playlist management tab

import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../../context/AdminContext';
import './AdminPages.css';

// Import shadcn/ui components
import { Button } from '../../components/ui/button';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../components/ui/select';
import { 
  Card, 
  CardContent, 
  CardHeader
} from '../../components/ui/card';
import { useToast } from '../../components/ui/use-toast';
import { Badge } from '../../components/ui/badge';

// Import baseBackendUrl from api.js
import { baseBackendUrl } from '../../utils/api';

const Playlists = () => {
  const { 
    locations,
    selectedLocation,
    setSelectedLocation,
    hotspots,
    playlists,
    assetsByType,
    isLoading,
    isSaving,
    updatePlaylist,
    fetchPlaylists,
    fetchHotspots
  } = useAdmin();
  
  const { toast } = useToast();
  
  // State for the selected hotspot and playlist
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  
  // Video selection form state
  const [videoSelections, setVideoSelections] = useState({
    diveInVideo: 'none',
    floorLevelVideo: 'none',
    zoomOutVideo: 'none'
  });
  
  // Reset video selections
  const resetVideoSelections = useCallback(() => {
    setVideoSelections({
      diveInVideo: 'none',
      floorLevelVideo: 'none',
      zoomOutVideo: 'none'
    });
  }, []);
  
  // Handle location change
  const handleLocationChange = useCallback((value) => {
    const location = locations.find(loc => loc._id === value);
    if (location) {
      setSelectedLocation(location);
      setSelectedHotspot(null);
      setSelectedPlaylist(null);
      resetVideoSelections();
      // Explicitly fetch hotspots and playlists for the new location
      fetchHotspots(location._id);
      fetchPlaylists(location._id);
    }
  }, [locations, setSelectedLocation, resetVideoSelections, fetchHotspots, fetchPlaylists]);
  
  // Load playlist when hotspot changes
  useEffect(() => {
    if (selectedHotspot) {
      // Find playlist for selected hotspot
      const playlist = playlists.find(p => p.hotspot._id === selectedHotspot._id);
      setSelectedPlaylist(playlist);
      
      if (playlist) {
        // Set initial video selections
        setVideoSelections({
          diveInVideo: playlist.sequence?.diveInVideo?._id || 'none',
          floorLevelVideo: playlist.sequence?.floorLevelVideo?._id || 'none',
          zoomOutVideo: playlist.sequence?.zoomOutVideo?._id || 'none'
        });
      } else {
        resetVideoSelections();
      }
    } else {
      setSelectedPlaylist(null);
      resetVideoSelections();
    }
  }, [selectedHotspot, playlists, resetVideoSelections]);
  
  // Get available videos of a specific type for the current location
  const getAvailableVideos = useCallback((type) => {
    return assetsByType[type]?.filter(asset => 
      asset.location && asset.location._id === selectedLocation._id
    ) || [];
  }, [assetsByType, selectedLocation]);
  
  // Handle video selection change
  const handleVideoSelectionChange = useCallback((name, value) => {
    setVideoSelections(prev => ({ ...prev, [name]: value }));
  }, []);
  
  // Handle form submission to update playlist
  const handleUpdatePlaylist = useCallback(async (e) => {
    e.preventDefault();
    
    if (!selectedPlaylist) return;
    
    try {
      // Convert 'none' values to empty strings for the API
      const apiVideoSelections = {
        diveInVideo: videoSelections.diveInVideo === 'none' ? '' : videoSelections.diveInVideo,
        floorLevelVideo: videoSelections.floorLevelVideo === 'none' ? '' : videoSelections.floorLevelVideo,
        zoomOutVideo: videoSelections.zoomOutVideo === 'none' ? '' : videoSelections.zoomOutVideo
      };
      
      // Update playlist data
      const result = await updatePlaylist(selectedPlaylist._id, apiVideoSelections);
      
      if (result) {
        // Refresh playlists
        await fetchPlaylists(selectedLocation._id);
        
        toast({
          title: "Success",
          description: `Playlist for "${selectedHotspot.name}" updated successfully`,
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update playlist",
        variant: "destructive"
      });
    }
  }, [selectedPlaylist, videoSelections, updatePlaylist, fetchPlaylists, selectedLocation, selectedHotspot, toast]);
  
  // Filter hotspots to show only PRIMARY type (which need playlists)
  const primaryHotspots = hotspots.filter(hotspot => hotspot.type === 'PRIMARY');
  
  // Get completion status for a playlist
  const getPlaylistStatus = useCallback((playlist) => {
    if (!playlist) return 'incomplete';
    if (!playlist.sequence) return 'incomplete';
    
    const { diveInVideo, floorLevelVideo, zoomOutVideo } = playlist.sequence;
    
    if (diveInVideo && floorLevelVideo && zoomOutVideo) {
      return 'complete';
    } else if (diveInVideo || floorLevelVideo || zoomOutVideo) {
      return 'partial';
    } else {
      return 'incomplete';
    }
  }, []);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full bg-netflix-black text-white">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading playlists...</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-netflix-black text-white">
      {/* Location selector */}
      <div className="mb-6 flex flex-wrap items-center">
        <label htmlFor="location" className="mr-3 font-bold text-white mb-2 md:mb-0">
          Location:
        </label>
        <Select 
          value={selectedLocation?._id || ''} 
          onValueChange={handleLocationChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Select a location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map(location => (
              <SelectItem key={location._id} value={location._id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedLocation ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Hotspot selection */}
          <div className="lg:col-span-1">
            <Card className="bg-netflix-dark border-netflix-gray">
              <CardHeader>
                <h2 className="text-xl font-bold text-white">Select a Hotspot</h2>
              </CardHeader>
              <CardContent>
                {primaryHotspots.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-netflix-lightgray mb-2">No PRIMARY hotspots available.</p>
                    <p className="text-sm text-netflix-lightgray">Please create PRIMARY hotspots in the Hotspots tab.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {primaryHotspots.map(hotspot => {
                      // Find playlist for this hotspot
                      const playlist = playlists.find(p => p.hotspot._id === hotspot._id);
                      const status = getPlaylistStatus(playlist);
                      
                      return (
                        <div 
                          key={hotspot._id}
                          className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                            selectedHotspot && selectedHotspot._id === hotspot._id 
                              ? 'bg-netflix-red/20 text-white border border-netflix-red' 
                              : 'bg-netflix-black hover:bg-netflix-gray/20 border border-netflix-gray/50'
                          }`}
                          onClick={() => setSelectedHotspot(hotspot)}
                        >
                          <div className="font-medium truncate mr-2">{hotspot.name}</div>
                          <Badge variant={
                            status === 'complete' ? 'success' : 
                            status === 'partial' ? 'warning' : 
                            'destructive'
                          }>
                            {status === 'complete' ? 'Complete' : 
                             status === 'partial' ? 'Partial' : 
                             'Incomplete'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Playlist editor */}
          <div className="lg:col-span-2">
            {selectedHotspot ? (
              <Card className="bg-netflix-dark border-netflix-gray w-full">
                <CardHeader>
                  <h2 className="text-xl font-bold text-white break-words">Configure Playlist for "{selectedHotspot.name}"</h2>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6" onSubmit={handleUpdatePlaylist}>
                    {/* Dive In Video selection */}
                    <div className="space-y-2">
                      <label className="block font-medium text-white">
                        Dive-In Video:
                      </label>
                      <Select
                        value={videoSelections.diveInVideo}
                        onValueChange={(value) => handleVideoSelectionChange('diveInVideo', value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a Dive-In Video" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {getAvailableVideos('DiveIn').map(video => (
                            <SelectItem key={video._id} value={video._id}>
                              {video.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {videoSelections.diveInVideo && videoSelections.diveInVideo !== 'none' && (
                        <div className="mt-4 p-2 sm:p-4 bg-netflix-black rounded-md">
                          <h4 className="font-medium text-netflix-red mb-2">Preview:</h4>
                          <video 
                            className="w-full max-h-[180px] object-contain rounded-md" 
                            controls 
                            preload="metadata"
                          >
                            <source 
                              src={(function() {
                                const video = assetsByType.DiveIn.find(v => v._id === videoSelections.diveInVideo);
                                if (!video) return '';
                                
                                // Use direct backend URL
                                if (video.accessUrl) {
                                  return video.accessUrl.startsWith('/api/') ? 
                                    `${baseBackendUrl}${video.accessUrl}` : 
                                    `${baseBackendUrl}/api${video.accessUrl}`;
                                }
                                
                                return '';
                              })()} 
                              type="video/mp4" 
                            />
                            Your browser does not support video playback.
                          </video>
                        </div>
                      )}
                    </div>
                    
                    {/* Floor Level Video selection */}
                    <div className="space-y-2">
                      <label className="block font-medium text-white">
                        Floor-Level Video:
                      </label>
                      <Select
                        value={videoSelections.floorLevelVideo}
                        onValueChange={(value) => handleVideoSelectionChange('floorLevelVideo', value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a Floor-Level Video" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {getAvailableVideos('FloorLevel').map(video => (
                            <SelectItem key={video._id} value={video._id}>
                              {video.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {videoSelections.floorLevelVideo && videoSelections.floorLevelVideo !== 'none' && (
                        <div className="mt-4 p-2 sm:p-4 bg-netflix-black rounded-md">
                          <h4 className="font-medium text-netflix-red mb-2">Preview:</h4>
                          <video 
                            className="w-full max-h-[180px] object-contain rounded-md" 
                            controls 
                            preload="metadata"
                          >
                            <source 
                              src={(function() {
                                const video = assetsByType.FloorLevel.find(v => v._id === videoSelections.floorLevelVideo);
                                if (!video) return '';
                                
                                // Use direct backend URL
                                if (video.accessUrl) {
                                  return video.accessUrl.startsWith('/api/') ? 
                                    `${baseBackendUrl}${video.accessUrl}` : 
                                    `${baseBackendUrl}/api${video.accessUrl}`;
                                }
                                
                                return '';
                              })()} 
                              type="video/mp4" 
                            />
                            Your browser does not support video playback.
                          </video>
                        </div>
                      )}
                    </div>
                    
                    {/* Zoom Out Video selection */}
                    <div className="space-y-2">
                      <label className="block font-medium text-white">
                        Zoom-Out Video:
                      </label>
                      <Select
                        value={videoSelections.zoomOutVideo}
                        onValueChange={(value) => handleVideoSelectionChange('zoomOutVideo', value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a Zoom-Out Video" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {getAvailableVideos('ZoomOut').map(video => (
                            <SelectItem key={video._id} value={video._id}>
                              {video.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {videoSelections.zoomOutVideo && videoSelections.zoomOutVideo !== 'none' && (
                        <div className="mt-4 p-2 sm:p-4 bg-netflix-black rounded-md">
                          <h4 className="font-medium text-netflix-red mb-2">Preview:</h4>
                          <video 
                            className="w-full max-h-[180px] object-contain rounded-md" 
                            controls 
                            preload="metadata"
                          >
                            <source 
                              src={(function() {
                                const video = assetsByType.ZoomOut.find(v => v._id === videoSelections.zoomOutVideo);
                                if (!video) return '';
                                
                                // Use direct backend URL
                                if (video.accessUrl) {
                                  return video.accessUrl.startsWith('/api/') ? 
                                    `${baseBackendUrl}${video.accessUrl}` : 
                                    `${baseBackendUrl}/api${video.accessUrl}`;
                                }
                                
                                return '';
                              })()} 
                              type="video/mp4" 
                            />
                            Your browser does not support video playback.
                          </video>
                        </div>
                      )}
                    </div>
                    
                    {/* Playlist status */}
                    <div className="p-2 sm:p-4 bg-netflix-black rounded-md">
                      <h4 className="font-medium text-white mb-2">Playlist Status:</h4>
                      <div className={`flex items-center ${
                        getPlaylistStatus(selectedPlaylist) === 'complete' 
                          ? 'text-green-500' 
                          : getPlaylistStatus(selectedPlaylist) === 'partial'
                            ? 'text-amber-500'
                            : 'text-red-500'
                      }`}>
                        <span className="text-xl sm:text-2xl mr-2">
                          {getPlaylistStatus(selectedPlaylist) === 'complete' ? '✓' : 
                           getPlaylistStatus(selectedPlaylist) === 'partial' ? '⚠' : '✕'}
                        </span>
                        <span className="text-sm sm:text-base">
                          {getPlaylistStatus(selectedPlaylist) === 'complete' 
                            ? 'Complete - Ready for playback' 
                            : getPlaylistStatus(selectedPlaylist) === 'partial'
                              ? 'Partial - Missing some videos'
                              : 'Incomplete - Please assign all videos'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Submit button */}
                    <Button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? 'Saving...' : 'Save Playlist'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-netflix-dark border-netflix-gray w-full">
                <CardContent className="p-4 sm:p-8 flex flex-col items-center justify-center text-center">
                  <p className="text-netflix-lightgray mb-4 mx-auto">Select a hotspot from the list to configure its playlist.</p>
                  {primaryHotspots.length === 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = '/admin/hotspots'}
                    >
                      Go to Hotspot Management
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-netflix-dark p-4 sm:p-8 rounded-md text-center">
          <p className="text-netflix-lightgray mb-6">Please select a location to manage playlists.</p>
          {locations.length === 0 && (
            <Button 
              onClick={() => window.location.href = '/admin/locations'}
              className="bg-netflix-red hover:bg-netflix-red/80"
            >
              Go to Location Management
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Playlists;

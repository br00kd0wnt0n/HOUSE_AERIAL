import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const HotspotList = ({
  hotspots = [],
  selectedHotspot,
  selectHotspot,
  startHotspotCreation,
  isLoading,
  isSaving,
  drawingMode
}) => {
  return (
    <div className="space-y-4">
      <Button 
        onClick={startHotspotCreation}
        disabled={isLoading || isSaving || drawingMode}
        className="w-full mb-4 bg-netflix-red hover:bg-netflix-darkred"
      >
        CREATE NEW HOTSPOT
      </Button>
      
      {/* Existing hotspots list */}
      <Card className="bg-netflix-dark border-netflix-gray">
        <CardHeader>
          <CardTitle className="text-lg">Existing Hotspots</CardTitle>
        </CardHeader>
        <CardContent>
          {hotspots.length === 0 ? (
            <p className="text-netflix-lightgray text-center py-4">No hotspots created yet.</p>
          ) : (
            <ul className="space-y-2 max-h-[300px] overflow-y-auto">
              {hotspots.map(hotspot => (
                <li 
                  key={hotspot._id}
                  className={`flex items-center p-2 rounded-sm cursor-pointer transition-colors ${
                    selectedHotspot && selectedHotspot._id === hotspot._id 
                      ? 'bg-netflix-red/20 text-white border border-netflix-red' 
                      : 'hover:bg-netflix-gray/20 border border-netflix-gray/50'
                  }`}
                  onClick={() => selectHotspot(hotspot)}
                >
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    hotspot.type === 'PRIMARY' ? 'bg-netflix-red' : 'bg-blue-500'
                  }`}></div>
                  <span className="flex-1 font-medium">{hotspot.name}</span>
                  <span className="text-xs bg-netflix-black py-1 px-2 rounded">
                    {hotspot.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HotspotList; 
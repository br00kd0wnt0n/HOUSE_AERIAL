import React from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { baseBackendUrl } from '../../../utils/api';

/**
 * Component for displaying a group of button assets with ON/OFF states
 */
const ButtonAssetGroup = ({ locationName, buttons, onDelete, isSaving }) => {
  return (
    <Card 
      key={locationName} 
      className="mb-4 bg-netflix-dark border border-netflix-gray"
    >
      <CardContent className="p-4">
        <h3 className="text-lg font-bold text-netflix-red mb-3">
          {locationName} Buttons
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* OFF Button */}
          <div className="space-y-2">
            <h4 className="font-medium text-white">OFF Button (Normal State)</h4>
            {buttons.OFF ? (
              <div className="relative group">
                <div className="bg-netflix-dark p-4 rounded flex justify-center items-center w-full max-w-[240px] h-[160px] mx-auto sm:mx-0">
                  <img 
                    src={buttons.OFF.accessUrl ? 
                      `${baseBackendUrl}${buttons.OFF.accessUrl}` : ''}
                    alt={`${locationName} OFF Button`}
                    className="object-contain max-w-full max-h-full"
                  />
                </div>
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="destructive"
                    onClick={() => onDelete(buttons.OFF._id, buttons.OFF.name)}
                    disabled={isSaving}
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray w-full max-w-[240px] h-[160px] flex items-center justify-center mx-auto sm:mx-0">
                No OFF button uploaded
              </div>
            )}
          </div>
          
          {/* ON Button */}
          <div className="space-y-2">
            <h4 className="font-medium text-white">ON Button (Hover State)</h4>
            {buttons.ON ? (
              <div className="relative group">
                <div className="bg-netflix-dark p-4 rounded flex justify-center items-center w-full max-w-[240px] h-[160px] mx-auto sm:mx-0">
                  <img 
                    src={buttons.ON.accessUrl ? 
                      `${baseBackendUrl}${buttons.ON.accessUrl}` : ''}
                    alt={`${locationName} ON Button`}
                    className="object-contain max-w-full max-h-full"
                  />
                </div>
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="destructive"
                    onClick={() => onDelete(buttons.ON._id, buttons.ON.name)}
                    disabled={isSaving}
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-netflix-black/40 rounded text-center text-netflix-lightgray w-full max-w-[240px] h-[160px] flex items-center justify-center mx-auto sm:mx-0">
                No ON button uploaded
              </div>
            )}
          </div>
        </div>
        
        {/* Status message */}
        {(!buttons.ON || !buttons.OFF) && (
          <div className="mt-4 p-2 bg-netflix-black/30 rounded text-sm text-netflix-red">
            {!buttons.ON && !buttons.OFF 
              ? 'Missing both ON and OFF buttons' 
              : !buttons.ON 
                ? 'Missing ON button' 
                : 'Missing OFF button'}
            . Both are required for proper functionality.
          </div>
        )}
        
        {/* Complete page preview when both buttons exist */}
        {buttons.ON && buttons.OFF && (
          <div className="mt-6">
            <h4 className="font-medium text-white mb-3">Complete Page Preview</h4>
            <div className="rounded bg-netflix-dark relative flex flex-col items-center w-full p-4 sm:p-6">
              <div className="text-center text-white text-base sm:text-lg mb-4 sm:mb-10">Select a Location</div>
              <div className="flex justify-center items-center w-full max-w-[220px] h-[140px]">
                <div className="relative cursor-pointer flex justify-center items-center w-full h-full">
                  <img 
                    src={`${baseBackendUrl}${buttons.OFF.accessUrl}`}
                    alt={`${locationName} Location Button`}
                    className="object-contain max-w-full max-h-full"
                  />
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
                    <img 
                      src={`${baseBackendUrl}${buttons.ON.accessUrl}`}
                      alt={`${locationName} Location Button Hover`}
                      className="object-contain max-w-full max-h-full"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 text-center text-xs text-netflix-lightgray">
                Hover over the button to see the ON state
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ButtonAssetGroup; 
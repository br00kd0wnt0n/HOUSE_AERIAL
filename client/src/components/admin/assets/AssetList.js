import React from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import AssetPreview from './AssetPreview';
import ButtonAssetGroup from './ButtonAssetGroup';

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Component for displaying a list of assets based on their type
 */
const AssetList = ({ 
  activeTab, 
  filteredAssets, 
  isSaving, 
  onDeleteAsset, 
  onBulkDelete,
  currentAssetType
}) => {
  
  // Special case for Button assets
  if (activeTab === 'Button') {
    // Group buttons by location
    const buttonsByLocation = {};
    filteredAssets.forEach(asset => {
      const loc = asset.location?.name || 'Unknown';
      if (!buttonsByLocation[loc]) {
        buttonsByLocation[loc] = { ON: null, OFF: null };
      }
      
      // Determine if this is an ON or OFF button based on name
      if (asset.name.endsWith('_Button_ON')) {
        buttonsByLocation[loc].ON = asset;
      } else if (asset.name.endsWith('_Button_OFF')) {
        buttonsByLocation[loc].OFF = asset;
      }
    });
    
    // Render button groups
    return (
      <div className="mt-4">
        {Object.entries(buttonsByLocation).map(([locationName, buttons]) => (
          <ButtonAssetGroup
            key={locationName}
            locationName={locationName}
            buttons={buttons}
            onDelete={onDeleteAsset}
            isSaving={isSaving}
          />
        ))}
      </div>
    );
  }
  
  // For non-button assets, render table for desktop and cards for mobile
  return (
    <>
      {/* Desktop view - Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-netflix-gray">
              <th className="py-3 px-4 text-left text-netflix-red">Preview</th>
              <th className="py-3 px-4 text-left text-netflix-red">Name</th>
              <th className="py-3 px-4 text-left text-netflix-red">Size</th>
              <th className="py-3 px-4 text-left text-netflix-red">Location</th>
              <th className="py-3 px-4 text-left text-netflix-red">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => (
              <tr key={asset._id} className="border-b border-netflix-gray/40 hover:bg-netflix-dark/60">
                <td className="py-3 px-4">
                  <AssetPreview asset={asset} width={120} height={80} />
                </td>
                <td className="py-3 px-4">{asset.name}</td>
                <td className="py-3 px-4">{formatFileSize(asset.size)}</td>
                <td className="py-3 px-4">
                  {asset.location ? asset.location.name : 'N/A'}
                </td>
                <td className="py-3 px-4">
                  <Button
                    variant="destructive"
                    onClick={() => onDeleteAsset(asset._id, asset.name)}
                    disabled={isSaving}
                    size="sm"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-4">
        {filteredAssets.map(asset => (
          <Card key={asset._id} className="bg-netflix-dark border border-netflix-gray overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex justify-center mb-2">
                  <AssetPreview asset={asset} width={160} height={100} className="mx-auto" />
                </div>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-netflix-red font-medium">Name:</span>
                    <span className="text-white col-span-2 break-words">{asset.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-netflix-red font-medium">Size:</span>
                    <span className="text-white col-span-2">{formatFileSize(asset.size)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-netflix-red font-medium">Location:</span>
                    <span className="text-white col-span-2">
                      {asset.location ? asset.location.name : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => onDeleteAsset(asset._id, asset.name)}
                    disabled={isSaving}
                    size="sm"
                    className="w-full"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Bulk delete button for non-Button assets */}
      {filteredAssets.length > 0 && (
        <div className="mt-6">
          <Button 
            variant="destructive"
            onClick={onBulkDelete}
            disabled={isSaving}
            className="w-full"
          >
            Delete All {filteredAssets.length} {currentAssetType?.label} Assets
          </Button>
        </div>
      )}
    </>
  );
};

export default AssetList; 
import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';

const HotspotForm = ({
  hotspotForm,
  handleInputChange,
  handleSelectChange,
  onSave,
  onCancel,
  isSaving,
  title,
  buttonText,
  showBackButton = false,
  onBack,
  creationStep,
  proceedToDrawing,
  errorText,
  onNext,
  secondaryMode,
  onSecondaryModeChange
}) => {
  return (
    <Card className="bg-netflix-dark border-netflix-gray mb-4">
      <CardHeader>
        <CardTitle className="text-xl">{title || 'Hotspot Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        {creationStep === 1 && (
          <p className="text-netflix-lightgray mb-4">Enter basic information before drawing the hotspot.</p>
        )}
        
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (onSave) onSave(e);
        }}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Hotspot Name: <span className="text-netflix-red">*</span>
            </label>
            <Input
              type="text"
              id="name"
              name="name"
              value={hotspotForm.name}
              onChange={handleInputChange}
              required
              className="bg-netflix-gray border-netflix-gray"
              placeholder="Enter a descriptive name"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Hotspot Type:
            </label>
            <Select
              value={hotspotForm.type}
              onValueChange={(value) => handleSelectChange('type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">PRIMARY</SelectItem>
                <SelectItem value="SECONDARY">SECONDARY</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-2 text-xs text-netflix-lightgray">
              <p><strong>PRIMARY:</strong> Interactive hotspot with video sequence</p>
              <p><strong>SECONDARY:</strong> Informational hotspot with modal</p>
            </div>
          </div>
          
          {/* Secondary hotspot options */}
          {hotspotForm.type === 'SECONDARY' && (
            <div className="space-y-4 p-3 bg-netflix-black rounded-md">
              <h4 className="font-medium text-netflix-red">Secondary Hotspot Display</h4>
              
              {/* Mode selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Display Mode:</label>
                <RadioGroup 
                  value={secondaryMode} 
                  onValueChange={onSecondaryModeChange}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="classic" id="mode-classic" />
                    <Label htmlFor="mode-classic" className="cursor-pointer">Classic Info Panel (Text)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ui-element" id="mode-ui-element" />
                    <Label htmlFor="mode-ui-element" className="cursor-pointer">UI Element Image</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Show appropriate fields based on selected mode */}
              {secondaryMode === 'classic' ? (
                <>
                  <div>
                    <label htmlFor="infoPanel.title" className="block text-sm font-medium mb-1">
                      Title: <span className="text-netflix-red">*</span>
                    </label>
                    <Input
                      type="text"
                      id="infoPanel.title"
                      name="infoPanel.title"
                      value={hotspotForm.infoPanel.title}
                      onChange={handleInputChange}
                      className="bg-netflix-gray border-netflix-gray"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="infoPanel.description" className="block text-sm font-medium mb-1">
                      Description:
                    </label>
                    <Textarea
                      id="infoPanel.description"
                      name="infoPanel.description"
                      value={hotspotForm.infoPanel.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="bg-netflix-gray border-netflix-gray resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="py-2 px-3 bg-netflix-gray/20 rounded-md">
                  <p className="text-netflix-lightgray text-sm">
                    You'll be able to select a UI Element image in the next step.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {errorText && (
            <div className="text-red-500 text-sm">{errorText}</div>
          )}
          
          <div className="flex flex-col space-y-2 pt-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {creationStep === 1 ? (
              <Button 
                type="button"
                onClick={proceedToDrawing}
                className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
              >
                Proceed to Drawing
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto bg-netflix-red hover:bg-netflix-darkred"
              >
                {isSaving ? 'Saving...' : buttonText || 'Save'}
              </Button>
            )}
            
            {showBackButton && (
              <Button 
                type="button"
                onClick={onBack}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Back
              </Button>
            )}
            
            <Button 
              type="button"
              onClick={onCancel}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default HotspotForm; 
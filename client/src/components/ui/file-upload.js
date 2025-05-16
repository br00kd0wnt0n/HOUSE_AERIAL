import React, { useState, useRef } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

const FileUpload = React.forwardRef(({
  className,
  onChange,
  onFileSelect,
  accept,
  disabled,
  ...props
}, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length) {
      if (onChange) {
        // Create a synthetic event to pass to the onChange handler
        const syntheticEvent = { target: { files: files } };
        onChange(syntheticEvent);
      }
      
      if (onFileSelect) {
        onFileSelect(files[0]);
      }
    }
  };
  
  const handleBrowseClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileInputChange = (e) => {
    if (onChange) {
      onChange(e);
    }
    
    if (onFileSelect && e.target.files.length) {
      onFileSelect(e.target.files[0]);
    }
  };
  
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-6 transition-colors",
        isDragging 
          ? "border-netflix-red bg-netflix-red/5" 
          : "border-netflix-gray/30 hover:border-netflix-lightgray/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      <input
        type="file"
        ref={(node) => {
          // Set both refs
          fileInputRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        onChange={handleFileInputChange}
        accept={accept}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      
      <div className="flex flex-col items-center justify-center space-y-3 text-center">
        <div className="rounded-full bg-netflix-dark/40 p-3">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-netflix-lightgray"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        <div className="text-sm text-netflix-lightgray">
          <span className="font-medium">Drag media file</span> here to upload or
        </div>
        <Button 
          type="button" 
          variant="link"
          onClick={handleBrowseClick}
          disabled={disabled}
          className="text-netflix-red hover:text-netflix-darkred"
        >
          browse
        </Button>
        <div className="text-xs text-netflix-lightgray/70">
          MP4, JPG, PNG, GIF (max. 100MB)
        </div>
      </div>
    </div>
  );
});

FileUpload.displayName = "FileUpload";

export { FileUpload }; 
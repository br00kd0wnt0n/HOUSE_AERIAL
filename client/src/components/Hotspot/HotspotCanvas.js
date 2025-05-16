import React, { useEffect } from 'react';

const HotspotCanvas = ({
  videoRef,
  canvasRef,
  canvasContainerRef,
  aerialAsset,
  isLoadingAerial,
  useVideoFallback,
  videoLoaded,
  setVideoLoaded,
  handleVideoLoad,
  handleVideoError,
  videoKey,
  handleCanvasClick,
  handleCanvasHover,
  drawingMode,
  creationStep,
  getVideoUrl
}) => {
  // Set up canvas even if video doesn't load
  useEffect(() => {
    // Set a timeout to ensure canvas is initialized even if video fails to load
    const timeoutId = setTimeout(() => {
      if (!videoLoaded && canvasRef.current && canvasContainerRef.current) {
        console.log("Canvas initialization timeout triggered - video may not have loaded");
        const canvas = canvasRef.current;
        const container = canvasContainerRef.current;
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        setVideoLoaded(true);
      }
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timeoutId);
  }, [videoLoaded, canvasRef, canvasContainerRef, setVideoLoaded]);

  return (
    <div 
      className="relative w-full rounded-md overflow-hidden bg-netflix-dark h-[500px] flex items-center justify-center" 
      ref={canvasContainerRef}
    >
      {isLoadingAerial && (
        <div className="absolute inset-0 flex items-center justify-center bg-netflix-black/50 z-10">
          <div className="text-netflix-red text-lg">Loading aerial view...</div>
        </div>
      )}
      
      <div className="absolute inset-0 flex items-center justify-center">
        {aerialAsset && !useVideoFallback ? (
          <video 
            key={videoKey}
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            loop
            muted
            autoPlay
            playsInline
            controls={false}
          >
            <source src={getVideoUrl(aerialAsset.accessUrl)} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-netflix-black">
            {!isLoadingAerial && (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="p-4 rounded-md max-w-md">
                  <h3 className="text-netflix-red text-xl font-bold mb-2">No Aerial Video Available</h3>
                  <p className="text-white mb-4">Please upload an aerial video for this location in the Asset Management section.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
      />
      
      {/* Workflow progress indicator */}
      {creationStep > 0 && (
        <div className="absolute top-4 left-4 right-4 bg-netflix-black/80 p-2 rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 1 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>1</div>
            <div className={`w-16 h-1 ${creationStep >= 2 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 2 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>2</div>
            <div className={`w-16 h-1 ${creationStep >= 3 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${creationStep >= 3 ? 'bg-netflix-red' : 'bg-netflix-gray'}`}>3</div>
          </div>
          <div className="text-sm font-medium ml-4">
            {creationStep === 1 && 'Step 1: Enter Information'}
            {creationStep === 2 && 'Step 2: Draw Hotspot Shape'}
            {creationStep === 3 && 'Step 3: Review and Save'}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotspotCanvas; 
import React from 'react';

/**
 * LoadingScreen.jsx - Shows loading progress for initial content preloading
 * Will display progress information while all videos are being cached
 */
const LoadingScreen = ({ progress = 0, total = 0, isComplete = false, text = 'Loading Experience' }) => {
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
      <h2 className="text-2xl text-white font-bold mb-8">{text}</h2>
      
      <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-netflix-red transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      
      <p className="text-white">
        {isComplete ? 'Complete!' : `${percent}% (${progress} of ${total} assets)`}
      </p>
    </div>
  );
};

export default LoadingScreen; 
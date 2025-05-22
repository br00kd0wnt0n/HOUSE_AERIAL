import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * CSS-based transition effect component
 * 
 * This component provides a smooth fade transition between locations when
 * no transition video is available.
 */
const TransitionEffect = ({ 
  isActive, 
  onTransitionComplete, 
  duration = 1000, 
  sourceLocationName = '', 
  destinationLocationName = '' 
}) => {
  const [phase, setPhase] = useState(isActive ? 'fade-in' : 'inactive');
  
  // Handle the transition phases
  useEffect(() => {
    if (!isActive) {
      setPhase('inactive');
      return;
    }
    
    // Phase 1: Fade in
    setPhase('fade-in');
    
    // Phase 2: Hold at black screen with text
    const holdTimer = setTimeout(() => {
      setPhase('hold');
    }, duration / 3);
    
    // Phase 3: Fade out
    const fadeOutTimer = setTimeout(() => {
      setPhase('fade-out');
    }, duration * 2 / 3);
    
    // Phase 4: Complete
    const completeTimer = setTimeout(() => {
      setPhase('inactive');
      if (onTransitionComplete) {
        onTransitionComplete();
      }
    }, duration);
    
    // Clean up timers
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, duration, onTransitionComplete]);
  
  // If not active, don't render anything
  if (phase === 'inactive') {
    return null;
  }
  
  // Different styles based on the current phase
  const getStyles = () => {
    const baseStyles = 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity';
    
    switch (phase) {
      case 'fade-in':
        return `${baseStyles} opacity-0 animate-fade-in`;
      case 'hold':
        return `${baseStyles} opacity-100`;
      case 'fade-out':
        return `${baseStyles} opacity-100 animate-fade-out`;
      default:
        return `${baseStyles} opacity-0`;
    }
  };
  
  return (
    <div 
      className={getStyles()}
      style={{
        // Add custom animation styles for smoother transitions
        '--transition-duration': `${duration / 3}ms`
      }}
    >
      {/* Transition content */}
      <div className="text-white text-center px-8">
        <div className="mb-6">
          <div className="w-16 h-16 border-4 border-netflix-red border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        
        {/* Location names */}
        {(sourceLocationName || destinationLocationName) && (
          <div className="mb-8">
            {sourceLocationName && (
              <p className="text-xl font-medium text-netflix-lightgray mb-2">
                Leaving {sourceLocationName}
              </p>
            )}
            {destinationLocationName && (
              <p className="text-2xl font-bold">
                Traveling to {destinationLocationName}
              </p>
            )}
          </div>
        )}
        
        {/* Netflix branding */}
        <div className="text-netflix-red text-xl font-bold">
          NETFLIX HOUSE
        </div>
      </div>
    </div>
  );
};

TransitionEffect.propTypes = {
  isActive: PropTypes.bool.isRequired,
  onTransitionComplete: PropTypes.func,
  duration: PropTypes.number,
  sourceLocationName: PropTypes.string,
  destinationLocationName: PropTypes.string
};

export default TransitionEffect; 
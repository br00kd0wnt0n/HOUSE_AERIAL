import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import logger from '../../utils/logger';

/**
 * FadeToBlackEffect - Provides a smooth fade to black transition
 * 
 * Used before starting hotspot videos or location transitions
 * Fades the screen to black for a specified duration before calling onComplete
 */
const FadeToBlackEffect = ({ 
  isActive, 
  onComplete, 
  duration = 1000 
}) => {
  const MODULE = 'FadeToBlackEffect';
  const [phase, setPhase] = useState('inactive');
  
  // Handle the transition phases
  useEffect(() => {
    if (!isActive) {
      setPhase('inactive');
      return;
    }
    
    logger.info(MODULE, 'Starting fade to black effect');
    
    // Phase 1: Fade in to black
    setPhase('fade-in');
    
    // Phase 2: Complete after duration
    const completeTimer = setTimeout(() => {
      logger.info(MODULE, 'Fade to black complete, calling onComplete callback');
      if (onComplete) {
        onComplete();
      }
      // Keep the black screen until the parent component deactivates this component
    }, duration);
    
    // Clean up timer
    return () => {
      clearTimeout(completeTimer);
    };
  }, [isActive, duration, onComplete]);
  
  // If not active, don't render anything
  if (phase === 'inactive') {
    return null;
  }
  
  // Get the appropriate class based on the current phase
  const getClassName = () => {
    const baseClasses = 'fixed inset-0 bg-black z-[100]';
    
    switch (phase) {
      case 'fade-in':
        return `${baseClasses} animate-fade-in`;
      default:
        return `${baseClasses} opacity-100`;
    }
  };
  
  return (
    <div 
      className={getClassName()}
      style={{
        '--transition-duration': `${duration}ms`
      }}
    />
  );
};

FadeToBlackEffect.propTypes = {
  isActive: PropTypes.bool.isRequired,
  onComplete: PropTypes.func,
  duration: PropTypes.number
};

export default FadeToBlackEffect; 
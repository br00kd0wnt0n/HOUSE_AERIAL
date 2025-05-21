import { useState, useEffect } from 'react';
import logger from '../utils/logger';

const MODULE = 'HotspotDebug';

/**
 * Custom hook for managing debug functionality in hotspot components
 */
export function useHotspotDebug({ externalDebugMode = false }) {
  // Internal debug mode state - can be overridden by prop
  const [internalDebugMode, setInternalDebugMode] = useState(false);
  
  // Combine internal and external debug modes - either can enable it
  const debugMode = externalDebugMode || internalDebugMode;
  
  // Set up debug mode keyboard shortcut
  useEffect(() => {
    // Debug keyboard shortcut (Ctrl+Shift+D)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setInternalDebugMode(prev => {
          const newValue = !prev;
          logger.info(MODULE, `Debug mode ${newValue ? 'enabled' : 'disabled'} (internal)`);
          return newValue;
        });
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Only log in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.info(MODULE, 'Debug mode shortcuts are available with Ctrl+Shift+D');
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return {
    debugMode,
    setInternalDebugMode
  };
} 
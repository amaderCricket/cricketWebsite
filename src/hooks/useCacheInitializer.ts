// src/hooks/useCacheInitializer.ts
import { useEffect, useState } from 'react';
import { cacheService } from '../services/cacheService';

/**
 * Hook to initialize and manage the cache system
 * Use this in the top-level App component
 */
export const useCacheInitializer = () => {
 
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [hasInitializedUpdater, setHasInitializedUpdater] = useState(false);

  // Initialize the cache system
  useEffect(() => {
      const initialize = async () => {
        try {
          // Load data silently in background (no loading state)
          await Promise.all([
            cacheService.fetchSummaryData(),
            cacheService.fetchPlayers()
          ]);
          
          // Start the background updater
          if (!hasInitializedUpdater) {
            cacheService.initBackgroundUpdater();
            setHasInitializedUpdater(true);
          }
        } catch (error) {
          console.error("Failed to initialize cache system:", error);
        }
      };

      initialize();
    }, [hasInitializedUpdater]);

  // Listen for cache updates - only do this after initial load
 useEffect(() => {
    const removeListener = cacheService.onUpdate(() => {
      setIsUpdating(true);
      setLastUpdateTime(new Date());
      
      setTimeout(() => {
        setIsUpdating(false);
      }, 2000);
    });
    
    return () => removeListener();
  }, []);

  return {
    isInitialized: true, // Always return true
    isUpdating,
    lastUpdateTime
  };
};

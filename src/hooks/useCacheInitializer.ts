// src/hooks/useCacheInitializer.ts
import { useEffect, useState } from 'react';
import { cacheService } from '../services/cacheService';

/**
 * Hook to initialize and manage the cache system
 * Use this in the top-level App component
 */
export const useCacheInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [hasInitializedUpdater, setHasInitializedUpdater] = useState(false);

  // Initialize the cache system
  useEffect(() => {
    const initialize = async () => {
      try {
        // First load data (either from cache or API)
        await Promise.all([
          cacheService.fetchSummaryData(),
          cacheService.fetchPlayers()
        ]);
        
        setIsInitialized(true);
        
        // Only start the background updater after initial data load
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
    if (!isInitialized) return;
    
    console.log("Setting up cache update listener");
    
    // Setup listener for cache updates
    const removeListener = cacheService.onUpdate(() => {
      console.log("Cache update detected!");
      setIsUpdating(true);
      setLastUpdateTime(new Date());
      
      // Reset updating status after a delay (changed to 2 seconds)
      setTimeout(() => {
        setIsUpdating(false);
      }, 2000); // Changed from 2000ms to match the App.tsx timeout
    });
    
    // Cleanup listener on unmount
    return () => {
      console.log("Removing cache update listener");
      removeListener();
    };
  }, [isInitialized]);

  return {
    isInitialized,
    isUpdating,
    lastUpdateTime
  };
};
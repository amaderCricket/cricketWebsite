// Replace your entire useCacheInitializer.ts with this:

import { useEffect, useState } from 'react';
import { cacheService } from '../services/cacheService';

export const useCacheInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false); // Start with false
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Initialize the cache system and block until ready
  useEffect(() => {
    let isMounted = true;

    const initializeDataAndWait = async () => {
      try {
        console.log('Initializing critical data...');
        
        // Wait for critical data to load with timeout
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 15000)
        );
        
        const dataPromise = Promise.all([
          cacheService.fetchSummaryData(false), // Don't force refresh initially
          cacheService.fetchPlayers(false)
        ]);

        // Race between data loading and timeout
        await Promise.race([dataPromise, timeout]);
        
        if (isMounted) {
          console.log('Critical data loaded successfully');
          setIsInitialized(true);
          
          // Start background updater after successful initialization
          cacheService.initBackgroundUpdater();
        }
      } catch (error) {
        console.error('Failed to initialize critical data:', error);
        
        // Try to use any cached data as fallback
        const hasAnyCache = localStorage.getItem('cricket_data_summary') || 
                           localStorage.getItem('cricket_data_players');
        
        if (hasAnyCache && isMounted) {
          console.log('Using cached data as fallback');
          setIsInitialized(true);
        } else if (isMounted) {
          // Even on failure, allow the app to load after timeout
          setTimeout(() => {
            if (isMounted) {
              console.log('Allowing app to load despite initialization failure');
              setIsInitialized(true);
            }
          }, 3000);
        }
      }
    };

    initializeDataAndWait();

    // Page visibility handling
    const handlePageShow = () => {
      if (isInitialized) {
        cacheService.checkForUpdates(true).then(needsUpdate => {
          if (needsUpdate) {
            Promise.all([
              cacheService.fetchSummaryData(true),
              cacheService.fetchPlayers(true)
            ]);
          }
        });
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      isMounted = false;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isInitialized]); // Run when isInitialized changes

  // Listen for cache updates after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const removeListener = cacheService.onUpdate(() => {
      setIsUpdating(true);
      setLastUpdateTime(new Date());
      
      setTimeout(() => {
        setIsUpdating(false);
      }, 2000);
    });
    
    return () => removeListener();
  }, [isInitialized]);

  return {
    isInitialized,
    isUpdating,
    lastUpdateTime
  };
};
// src/utils/dataRefresher.ts
import { cacheService } from '../services/cacheService';
import { fetchLastMatchData } from '../services/matchDataService';
import { API_CONFIG } from '../config/apiConfig';

/**
 * Force all data to refresh by clearing specific caches
 * @param specificDataType Optional - only refresh specific data type
 */
export const forceDataRefresh = async (specificDataType?: 'match' | 'players' | 'summary' | 'all'): Promise<void> => {
  try {
    console.log(`Force refreshing data: ${specificDataType || 'all'}`);
    
    // Clear specific caches based on type
    if (!specificDataType || specificDataType === 'all' || specificDataType === 'match') {
      // Clear match data cache
      localStorage.removeItem(API_CONFIG.MATCH_KEY);
      localStorage.removeItem(`${API_CONFIG.MATCH_KEY}_timestamp`);
      localStorage.removeItem(API_CONFIG.MATCH_METADATA_KEY);
      
      // Reload match data
      await fetchLastMatchData(true);
    }
    
    if (!specificDataType || specificDataType === 'all' || specificDataType === 'players') {
      // Clear players cache
      localStorage.removeItem(API_CONFIG.PLAYERS_KEY);
      localStorage.removeItem(`${API_CONFIG.PLAYERS_KEY}_timestamp`);
      
      // The next access will reload players data
    }
    
    if (!specificDataType || specificDataType === 'all' || specificDataType === 'summary') {
      // Clear summary cache
      localStorage.removeItem(API_CONFIG.SUMMARY_KEY);
      localStorage.removeItem(`${API_CONFIG.SUMMARY_KEY}_timestamp`);
      
      // The next access will reload summary data
    }
    
    if (specificDataType === 'all') {
      // Clear all caches including metadata
      localStorage.removeItem(API_CONFIG.METADATA_KEY);
      
      // The next access will reload all data
    }
    
    // Check for updates from the server
    await cacheService.checkForUpdates();
    
    console.log('Data refresh complete');
  } catch (error) {
    console.error('Error during force data refresh:', error);
    throw error;
  }
};

/**
 * Check if any data needs to be refreshed
 * @returns Information about which caches need refreshing
 */
export const checkDataFreshness = (): { 
  matchNeedsRefresh: boolean; 
  playersNeedsRefresh: boolean;
  summaryNeedsRefresh: boolean;
} => {
  const matchTimestamp = localStorage.getItem(`${API_CONFIG.MATCH_KEY}_timestamp`);
  const playersTimestamp = localStorage.getItem(`${API_CONFIG.PLAYERS_KEY}_timestamp`);
  const summaryTimestamp = localStorage.getItem(`${API_CONFIG.SUMMARY_KEY}_timestamp`);
  
  // Match data has very short TTL (30 minutes)
  const MATCH_CACHE_TTL = 30 * 60 * 1000; 
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  
  const now = Date.now();
  
  return {
    matchNeedsRefresh: !matchTimestamp || now - parseInt(matchTimestamp, 10) > MATCH_CACHE_TTL,
    playersNeedsRefresh: !playersTimestamp || now - parseInt(playersTimestamp, 10) > CACHE_TTL,
    summaryNeedsRefresh: !summaryTimestamp || now - parseInt(summaryTimestamp, 10) > CACHE_TTL
  };
};
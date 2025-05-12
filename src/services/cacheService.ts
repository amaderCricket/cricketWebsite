// src/services/cacheService.ts
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

// Cache keys
const METADATA_KEY = API_CONFIG.METADATA_KEY;
const SUMMARY_KEY = API_CONFIG.SUMMARY_KEY;
const PLAYERS_KEY = API_CONFIG.PLAYERS_KEY;
const PLAYER_PREFIX = API_CONFIG.PLAYER_PREFIX;
const MATCH_KEY = API_CONFIG.MATCH_KEY;
const LAST_CHECK_KEY = 'cricket_last_check_time';

// Cache TTL (time-to-live)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
// Match data has very short TTL (30 minutes)
const MATCH_CACHE_TTL = 10 * 60 * 1000;
const UPDATE_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
const UPDATE_COOLDOWN = 30 * 1000; // 30 seconds - prevents too frequent API calls

// Event system for cache updates
const updateEvents = new EventTarget();
const UPDATE_EVENT = 'cache-updated';

// Define types for our data
interface CacheMetadata {
  lastUpdated: number;
  version: string;
}

interface SummaryData {
  teams?: Record<string, unknown>;
  matches?: Array<unknown>;
  lastUpdated?: string;
  [key: string]: unknown;
}

interface PlayersData {
  stats: Array<Array<string | number>>;
  lastUpdated?: string;
  [key: string]: unknown;
}

interface PlayerDetailsData {
  matches: Array<Array<string | number>>;
  stats: Record<string, unknown>;
  lastUpdated?: string;
  [key: string]: unknown;
}

// Initialize the background update checker
let updateCheckerInitialized = false;

export const cacheService = {
  // Listen for update events
  onUpdate(callback: () => void): () => void {
    const eventListener = () => callback();
    updateEvents.addEventListener(UPDATE_EVENT, eventListener);
    
    // Return a function to remove the listener
    return () => {
      updateEvents.removeEventListener(UPDATE_EVENT, eventListener);
    };
  },

  // Check if it's time to do an update check
  shouldCheckForUpdates(): boolean {
    const lastCheckTime = localStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheckTime) return true;
    
    const now = Date.now();
    const lastCheck = parseInt(lastCheckTime, 10);
    
    // Check if enough time has passed since last check
    return now - lastCheck > UPDATE_COOLDOWN;
  },

  // Record that we did an update check
  recordUpdateCheck(): void {
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  },

  // Check if data needs updating
  async checkForUpdates(bypassCooldown = false): Promise<boolean> {
    // Respect cooldown unless explicitly bypassed
    if (!bypassCooldown && !this.shouldCheckForUpdates()) {
      // console.log("Update check skipped due to cooldown");
      return false;
    }
    
    this.recordUpdateCheck();
    
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now().toString();
      // Get the latest metadata from server
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=checkUpdate&_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const serverMetadata: CacheMetadata = response.data;
      
      // Get our stored metadata
      const storedMetadataJson = localStorage.getItem(METADATA_KEY);
      
      if (!storedMetadataJson) {
        // No stored metadata, we need to update
        localStorage.setItem(METADATA_KEY, JSON.stringify(serverMetadata));
        return true;
      }
      
      const storedMetadata = JSON.parse(storedMetadataJson) as CacheMetadata;
      
      // Check if server data is newer
      if (serverMetadata.lastUpdated > storedMetadata.lastUpdated || 
          serverMetadata.version !== storedMetadata.version) {
        // Update metadata
        localStorage.setItem(METADATA_KEY, JSON.stringify(serverMetadata));
        return true; // Update needed
      }
      
      return false; // No update needed
    } catch (error) {
      console.error("Error checking for updates:", error);
      return false; // If error, don't trigger refresh - use existing cache
    }
  },

  // Check if cache is expired
  isCacheExpired(key: string): boolean {
    const timestampKey = `${key}_timestamp`;
    const timestampStr = localStorage.getItem(timestampKey);
    
    if (!timestampStr) return true;
    
    const savedTime = parseInt(timestampStr, 10);
    const currentTime = Date.now();
    
    // Use a shorter TTL for match data
    if (key === MATCH_KEY) {
      return currentTime - savedTime > MATCH_CACHE_TTL;
    }
    
    return currentTime - savedTime > CACHE_TTL;
  },
  
  // Start background update checker
  initBackgroundUpdater(): void {
    if (updateCheckerInitialized) return;
    
    const checkForUpdatesAndRefresh = async () => {
      // console.log("Running scheduled update check...");
      const needsUpdate = await this.checkForUpdates(true);
      
      if (needsUpdate) {
        // console.log("Updates found, refreshing data...");
        // Refresh main data
        await Promise.all([
          this.fetchSummaryData(true),
          this.fetchPlayers(true)
        ]);
        
        // Refresh match data
        await this.forceMatchDataRefresh();
        
        // Refresh player details for cached players
        this.refreshCachedPlayerDetails();
        
        // Notify subscribers that we've updated
        updateEvents.dispatchEvent(new Event(UPDATE_EVENT));
      }
    };
    
    // Run now and then schedule
    checkForUpdatesAndRefresh();
    
    // Setup interval
    setInterval(checkForUpdatesAndRefresh, UPDATE_CHECK_INTERVAL);
    
    updateCheckerInitialized = true;
  },
  
  // Fetch summary data (home page data)
  async fetchSummaryData(forceRefresh = false): Promise<SummaryData> {
    const cacheKey = SUMMARY_KEY;
    
    try {
      // Check if cache exists and is valid - use immediately if available
      const cachedData = localStorage.getItem(cacheKey);
      const isExpired = this.isCacheExpired(cacheKey);
      
      if (cachedData && !isExpired && !forceRefresh) {
        // console.log("Using cached summary data");
        return JSON.parse(cachedData) as SummaryData;
      }
      
      // Fetch fresh data
      return await this.fetchFromApiAndCache<SummaryData>(`${API_CONFIG.baseUrl}?type=summary`, cacheKey);
    } catch (error) {
      console.error("Error fetching summary data:", error);
      
      // Try to use cached data as fallback even if expired
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        // console.log("Using expired cached data as fallback");
        return JSON.parse(cachedData) as SummaryData;
      }
      
      // If no cache at all, return empty data
      return { teams: {}, matches: [] };
    }
  },
  
  // Fetch players list with stats
  async fetchPlayers(forceRefresh = false): Promise<PlayersData> {
    const cacheKey = PLAYERS_KEY;
    
    try {
      // Check if cache exists and is valid
      const cachedData = localStorage.getItem(cacheKey);
      const isExpired = this.isCacheExpired(cacheKey);
      
      if (cachedData && !isExpired && !forceRefresh) {
        // console.log("Using cached players data");
        return JSON.parse(cachedData) as PlayersData;
      }
      
      // Fetch fresh data
      return await this.fetchFromApiAndCache<PlayersData>(`${API_CONFIG.baseUrl}?type=players`, cacheKey);
    } catch (error) {
      console.error("Error fetching players:", error);
      
      // Try to use cached data as fallback even if expired
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        // console.log("Using expired cached data as fallback");
        return JSON.parse(cachedData) as PlayersData;
      }
      
      // If no cache at all, return empty data
      return { stats: [] };
    }
  },
  
  // Generic fetch and cache method
  async fetchFromApiAndCache<T>(url: string, cacheKey: string): Promise<T> {
    // Add timestamp to prevent caching
    const timestamp = Date.now().toString();
    const urlWithTimestamp = url.includes('?') ? 
      `${url}&_t=${timestamp}` : 
      `${url}?_t=${timestamp}`;
    
    // console.log(`Fetching data from ${urlWithTimestamp}`);
    const response = await axios.get(urlWithTimestamp, {
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    const data = response.data as T;
    
    // Cache the data with timestamp
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    
    return data;
  },
  
  // Fetch a specific player's details - optimized to handle updates
  async fetchPlayerDetails(playerName: string, forceRefresh = false): Promise<PlayerDetailsData> {
    if (!playerName) {
      throw new Error("Player name is required");
    }
    
    const cacheKey = `${PLAYER_PREFIX}${playerName}`;
    
    try {
      // First, check if we have cached data
      const cachedData = localStorage.getItem(cacheKey);
      const isExpired = this.isCacheExpired(cacheKey);
      
      if (cachedData && !isExpired && !forceRefresh) {
        // Return cached data immediately
        // console.log(`Using cached data for player ${playerName}`);
        return JSON.parse(cachedData) as PlayerDetailsData;
      }
      
      // Add timestamp to prevent caching
      const timestamp = Date.now().toString();
      
      // Fetch fresh data
      // console.log(`Fetching player details for ${playerName}`);
      const response = await axios.get(
        `${API_CONFIG.baseUrl}?type=playerDetails&name=${encodeURIComponent(playerName)}&_t=${timestamp}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      const data = response.data as PlayerDetailsData;
      
      // Cache the data with timestamp
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      
      return data;
    } catch (error) {
      console.error(`Error fetching player ${playerName}:`, error);
      
      // Try to use cached data as fallback even if expired
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        // console.log(`Using expired cache as fallback for player ${playerName}`);
        return JSON.parse(cachedData) as PlayerDetailsData;
      }
      
      // Return empty data if nothing in cache
      return { matches: [], stats: {} };
    }
  },
  
  // Background refresh cached player details
  async refreshCachedPlayerDetails(): Promise<void> {
    // Find all player caches
    const playerKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(PLAYER_PREFIX) && !key.includes("_timestamp")
    );
    
    // Only refresh a subset to avoid too many API calls
    const MAX_REFRESH = 3;
    const playerNames = playerKeys
      .map(key => key.replace(PLAYER_PREFIX, ""))
      .slice(0, MAX_REFRESH);
    
    // console.log(`Refreshing details for ${playerNames.length} players in background`);
    
    // Refresh each player's data with some spacing
    for (const playerName of playerNames) {
      try {
        await this.fetchPlayerDetails(playerName, true);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error refreshing player ${playerName}:`, error);
        // Continue with next player even if one fails
      }
    }
  },
  
  // Background fetch player details for all players - with improved throttling
  async prefetchAllPlayerDetails(playerNames: string[]): Promise<void> {
    if (!playerNames || playerNames.length === 0) return;
    
    // console.log("Starting background prefetch of player details");
    
    // We'll only prefetch a limited number of players to avoid slowing down the app
    const MAX_PREFETCH = 5;
    const playersToPrefetch = playerNames.slice(0, MAX_PREFETCH);
    
    // Use a small delay before starting to avoid competing with critical content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Use a small delay between requests to avoid overwhelming the server
    for (const playerName of playersToPrefetch) {
      try {
        const cacheKey = `${PLAYER_PREFIX}${playerName}`;
        const isExpired = this.isCacheExpired(cacheKey);
        
        // Only fetch if not already cached or expired
        if (!localStorage.getItem(cacheKey) || isExpired) {
          await this.fetchPlayerDetails(playerName);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error prefetching player ${playerName}:`, error);
        // Continue with next player even if one fails
      }
    }
    
    // console.log("Background prefetch complete");
  },
  
  // Force refresh of match data
  async forceMatchDataRefresh(): Promise<void> {
    try {
      // First clear existing match cache
      localStorage.removeItem(MATCH_KEY);
      localStorage.removeItem(`${MATCH_KEY}_timestamp`);
      localStorage.removeItem(API_CONFIG.MATCH_METADATA_KEY);
      
      // Then trigger reload via LastMatchCard component
      // This function just clears the cache,
      // the actual loading happens in the LastMatchCard component
      console.log("Match data cache cleared for forced refresh");
    } catch (error) {
      console.error("Error forcing match data refresh:", error);
    }
  },
  
  // Clear all cache data
  clearCache(): void {
    // Clear known keys
    localStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(SUMMARY_KEY);
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(MATCH_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    
    // Clear timestamps
    localStorage.removeItem(`${SUMMARY_KEY}_timestamp`);
    localStorage.removeItem(`${PLAYERS_KEY}_timestamp`);
    localStorage.removeItem(`${MATCH_KEY}_timestamp`);
    
    // Clear player-specific caches
    const playerKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(PLAYER_PREFIX)
    );
    
    playerKeys.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
    });
    
    console.log("Cache cleared");
  }
};
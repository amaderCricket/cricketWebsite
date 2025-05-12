// src/services/cacheService.ts
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

// Cache keys
const METADATA_KEY = API_CONFIG.METADATA_KEY;
const SUMMARY_KEY = API_CONFIG.SUMMARY_KEY;
const PLAYERS_KEY = API_CONFIG.PLAYERS_KEY;
const PLAYER_PREFIX = API_CONFIG.PLAYER_PREFIX;
const LAST_CHECK_KEY = 'cricket_last_check_time';

// Cache TTL (time-to-live)
const CACHE_TTL = 6 * 60 * 60 * 1000; // Reduced to 6 hours from 24 hours
const UPDATE_CHECK_INTERVAL = 2 * 60 * 1000; // Reduced to 2 minutes from 5 minutes
const UPDATE_COOLDOWN = 15 * 1000; // Reduced to 15 seconds from 30 seconds

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

// Add request timeout for all axios requests
axios.defaults.timeout = 10000; // 10 seconds timeout

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

  // Check if cache needs updating with improved error handling
  async checkForUpdates(bypassCooldown = false): Promise<boolean> {
    // Respect cooldown unless explicitly bypassed
    if (!bypassCooldown && !this.shouldCheckForUpdates()) {
      return false;
    }
    
    this.recordUpdateCheck();
    
    try {
      // Get the latest metadata from server
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=checkUpdate`);
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
    const timestamp = localStorage.getItem(timestampKey);
    
    if (!timestamp) return true;
    
    const savedTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    
    return currentTime - savedTime > CACHE_TTL;
  },
  
  // Start background update checker
  initBackgroundUpdater(): void {
    if (updateCheckerInitialized) return;
    
    const checkForUpdatesAndRefresh = async () => {
      try {
        const needsUpdate = await this.checkForUpdates(true);
        
        if (needsUpdate) {
          // Refresh main data
          await Promise.allSettled([
            this.fetchSummaryData(true),
            this.fetchPlayers(true)
          ]);
          
          // Refresh player details for cached players
          this.refreshCachedPlayerDetails();
          
          // Notify subscribers that we've updated
          updateEvents.dispatchEvent(new Event(UPDATE_EVENT));
        }
      } catch (error) {
        console.error("Error in background update:", error);
        // Don't re-throw, just log to avoid breaking the update cycle
      }
    };
    
    // Run now and then schedule
    setTimeout(() => {
      checkForUpdatesAndRefresh();
    }, 3000); // Delay initial check to allow page to load properly
    
    // Setup interval
    setInterval(checkForUpdatesAndRefresh, UPDATE_CHECK_INTERVAL);
    
    updateCheckerInitialized = true;
  },
  
  // Fetch summary data (home page data) with improved error handling
  async fetchSummaryData(forceRefresh = false): Promise<SummaryData> {
    const cacheKey = SUMMARY_KEY;
    
    try {
      // Check if cache exists and is valid - use immediately if available
      const cachedData = localStorage.getItem(cacheKey);
      const isExpired = this.isCacheExpired(cacheKey);
      
      if (cachedData && !isExpired && !forceRefresh) {
        return JSON.parse(cachedData) as SummaryData;
      }
      
      // Fetch fresh data
      return await this.fetchFromApiAndCache<SummaryData>(`${API_CONFIG.baseUrl}?type=summary`, cacheKey);
    } catch (error) {
      console.error("Error fetching summary data:", error);
      
      // Try to use cached data as fallback even if expired
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
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
        return JSON.parse(cachedData) as PlayersData;
      }
      
      // Fetch fresh data
      return await this.fetchFromApiAndCache<PlayersData>(`${API_CONFIG.baseUrl}?type=players`, cacheKey);
    } catch (error) {
      console.error("Error fetching players:", error);
      
      // Try to use cached data as fallback even if expired
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as PlayersData;
      }
      
      // If no cache at all, return empty data
      return { stats: [] };
    }
  },
  
  // Generic fetch and cache method with improved retry logic
  async fetchFromApiAndCache<T>(url: string, cacheKey: string): Promise<T> {
    // Function to attempt the fetch with retries
    const fetchWithRetry = async (retries = 2): Promise<T> => {
      try {
        const response = await axios.get(url);
        const data = response.data as T;
        
        // Cache the data with timestamp
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        
        return data;
      } catch (error) {
        if (retries > 0) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchWithRetry(retries - 1);
        }
        throw error;
      }
    };
    
    return fetchWithRetry();
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
        return JSON.parse(cachedData) as PlayerDetailsData;
      }
      
      // Fetch fresh data
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=playerDetails&name=${encodeURIComponent(playerName)}`);
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
        return JSON.parse(cachedData) as PlayerDetailsData;
      }
      
      // Return empty data if nothing in cache
      return { matches: [], stats: {} };
    }
  },
  
  // Optimized background refresh for cached player details
  async refreshCachedPlayerDetails(): Promise<void> {
    // Find all player caches
    const playerKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(PLAYER_PREFIX) && !key.includes("_timestamp")
    );
    
    // Only refresh a subset to avoid too many API calls
    const MAX_REFRESH = 2; // Reduced from 3
    const playerNames = playerKeys
      .map(key => key.replace(PLAYER_PREFIX, ""))
      .slice(0, MAX_REFRESH);
    
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
    
    // We'll only prefetch a limited number of players to avoid slowing down the app
    const MAX_PREFETCH = 3; // Reduced from 5
    const playersToPrefetch = playerNames.slice(0, MAX_PREFETCH);
    
    // Use a small delay before starting to avoid competing with critical content
    await new Promise(resolve => setTimeout(resolve, 2500));
    
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
  },
  
  // Clear all cache data
  clearCache(): void {
    // Clear known keys
    localStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(SUMMARY_KEY);
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    
    // Clear timestamps
    localStorage.removeItem(`${SUMMARY_KEY}_timestamp`);
    localStorage.removeItem(`${PLAYERS_KEY}_timestamp`);
    
    // Clear player-specific caches
    const playerKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(PLAYER_PREFIX)
    );
    
    playerKeys.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
    });
  }
};
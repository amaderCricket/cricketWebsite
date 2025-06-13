// src/services/cacheService.ts
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

// Cache keys - keeping your existing ones
const METADATA_KEY = API_CONFIG.METADATA_KEY;
const SUMMARY_KEY = API_CONFIG.SUMMARY_KEY;
const PLAYERS_KEY = API_CONFIG.PLAYERS_KEY;
const PLAYER_PREFIX = API_CONFIG.PLAYER_PREFIX;
const LAST_CHECK_KEY = 'cricket_last_check_time';

// Cache TTL Settings
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const UPDATE_CHECK_INTERVAL = 1 * 60 * 1000; // 1 minute
const UPDATE_COOLDOWN = 15 * 1000; // 15 seconds
const IMAGE_CACHE_TTL = 1 * 24 * 60 * 60 * 1000; // 1 day for images

// Session storage prefix for navigation cache
const SESSION_PREFIX = 'nav_cache_';

// Event system for cache updates - keeping your existing system
const updateEvents = new EventTarget();
const UPDATE_EVENT = 'cache-updated';

// Keep your existing interfaces
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

interface CacheItem<T> {
  data: T;
  timestamp: number;
  version?: string;
}

// Initialize the background update checker
let updateCheckerInitialized = false;
let lastLiveCheck = 0;

// Add request timeout for all axios requests
axios.defaults.timeout = 12000; // 12 seconds timeout

export const cacheService = {
  // Keep your existing onUpdate method
  onUpdate(callback: () => void): () => void {
    const eventListener = () => callback();
    updateEvents.addEventListener(UPDATE_EVENT, eventListener);
    
    return () => {
      updateEvents.removeEventListener(UPDATE_EVENT, eventListener);
    };
  },

  // Navigation Cache Methods (Session Storage)
  setNavigationCache<T>(key: string, data: T): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(`${SESSION_PREFIX}${key}`, JSON.stringify(cacheItem));
  },

  getNavigationCache<T>(key: string): T | null {
    try {
      const cached = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > CACHE_TTL;
      
      return isExpired ? null : cacheItem.data;
    } catch {
      return null;
    }
  },

  // Enhanced Image Cache Methods
  setImageCache(playerName: string, imageUrl: string): void {
    const cacheItem: CacheItem<string> = {
      data: imageUrl,
      timestamp: Date.now(),
    };
    localStorage.setItem(`player_image_${playerName}`, JSON.stringify(cacheItem));
  },

  getImageCache(playerName: string): string | null {
    try {
      const cached = localStorage.getItem(`player_image_${playerName}`);
      if (!cached) return null;

      const cacheItem: CacheItem<string> = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > IMAGE_CACHE_TTL;
      
      return isExpired ? null : cacheItem.data;
    } catch {
      return null;
    }
  },

  // Keep your existing shouldCheckForUpdates method
  shouldCheckForUpdates(): boolean {
    const lastCheckTime = localStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheckTime) return true;
    
    const now = Date.now();
    const lastCheck = parseInt(lastCheckTime, 10);
    
    return now - lastCheck > UPDATE_COOLDOWN;
  },

  // Keep your existing recordUpdateCheck method
  recordUpdateCheck(): void {
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  },

  // Enhanced checkForUpdates with live update capability
  async checkForUpdates(bypassCooldown = false): Promise<boolean> {
    if (!bypassCooldown && !this.shouldCheckForUpdates()) {
      return false;
    }
    
    this.recordUpdateCheck();
    
    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=checkUpdate`);
      const serverMetadata: CacheMetadata = response.data;
      
      const storedMetadataJson = localStorage.getItem(METADATA_KEY);
      
      if (!storedMetadataJson) {
        localStorage.setItem(METADATA_KEY, JSON.stringify(serverMetadata));
        return true;
      }
      
      const storedMetadata = JSON.parse(storedMetadataJson) as CacheMetadata;
      
      if (serverMetadata.lastUpdated > storedMetadata.lastUpdated || 
          serverMetadata.version !== storedMetadata.version) {
        localStorage.setItem(METADATA_KEY, JSON.stringify(serverMetadata));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking for updates:", error);
      return false;
    }
  },

  // Background live update checker
  async backgroundLiveCheck(): Promise<void> {
    const now = Date.now();
    if (now - lastLiveCheck < UPDATE_CHECK_INTERVAL) return;
    
    lastLiveCheck = now;
    
    try {
      const hasUpdates = await this.checkForUpdates(true);
      if (hasUpdates) {
        // Clear navigation cache to force fresh data
        this.clearNavigationCache();
        // Notify components
        updateEvents.dispatchEvent(new Event(UPDATE_EVENT));
      }
    } catch (error) {
      console.error('Background live check failed:', error);
    }
  },

  // Keep your existing isCacheExpired method
  isCacheExpired(key: string): boolean {
    const timestampKey = `${key}_timestamp`;
    const timestamp = localStorage.getItem(timestampKey);
    
    if (!timestamp) return true;
    
    const savedTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    
    return currentTime - savedTime > CACHE_TTL;
  },

  // Enhanced fetchSummaryData with navigation cache
  async fetchSummaryData(forceRefresh = false): Promise<SummaryData> {
    const sessionKey = 'summary';
    
    try {
      // Check navigation cache first (for back/forth navigation)
      if (!forceRefresh) {
        const navCached = this.getNavigationCache<SummaryData>(sessionKey);
        if (navCached) {
          // Start background update check
          setTimeout(() => this.backgroundLiveCheck(), 100);
          return navCached;
        }
      }

      // Fetch fresh data
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=summary`);
      const data = response.data as SummaryData;
      
      // Cache for navigation
      this.setNavigationCache(sessionKey, data);
      
      return data;
    } catch (error) {
      console.error("Error fetching summary data:", error);
      
      // Try navigation cache as fallback
      const navCached = this.getNavigationCache<SummaryData>(sessionKey);
      if (navCached) return navCached;
      
      // Try old localStorage fallback
      const cachedData = localStorage.getItem(SUMMARY_KEY);
      if (cachedData) {
        return JSON.parse(cachedData) as SummaryData;
      }
      
      return { teams: {}, matches: [] };
    }
  },

  // Enhanced fetchPlayers with navigation cache
  async fetchPlayers(forceRefresh = false): Promise<PlayersData> {
    const sessionKey = 'players';
    
    try {
      // Check navigation cache first
      if (!forceRefresh) {
        const navCached = this.getNavigationCache<PlayersData>(sessionKey);
        if (navCached) {
          setTimeout(() => this.backgroundLiveCheck(), 100);
          return navCached;
        }
      }

      // Fetch fresh data
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=players`);
      const data = response.data as PlayersData;
      
      // Cache for navigation
      this.setNavigationCache(sessionKey, data);
      
      return data;
    } catch (error) {
      console.error("Error fetching players:", error);
      
      // Try navigation cache as fallback
      const navCached = this.getNavigationCache<PlayersData>(sessionKey);
      if (navCached) return navCached;
      
      // Try old localStorage fallback
      const cachedData = localStorage.getItem(PLAYERS_KEY);
      if (cachedData) {
        return JSON.parse(cachedData) as PlayersData;
      }
      
      return { stats: [] };
    }
  },

  // Enhanced fetchPlayerDetails with navigation cache
  async fetchPlayerDetails(playerName: string, forceRefresh = false): Promise<PlayerDetailsData> {
    if (!playerName) {
      throw new Error("Player name is required");
    }
    
    const sessionKey = `player_${playerName}`;
    
    try {
      // Check navigation cache first
      if (!forceRefresh) {
        const navCached = this.getNavigationCache<PlayerDetailsData>(sessionKey);
        if (navCached) {
          setTimeout(() => this.backgroundLiveCheck(), 100);
          return navCached;
        }
      }

      // Fetch fresh data
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=playerDetails&name=${encodeURIComponent(playerName)}`);
      const data = response.data as PlayerDetailsData;
      
      // Cache for navigation
      this.setNavigationCache(sessionKey, data);
      
      return data;
    } catch (error) {
      console.error(`Error fetching player ${playerName}:`, error);
      
      // Try navigation cache as fallback
      const navCached = this.getNavigationCache<PlayerDetailsData>(sessionKey);
      if (navCached) return navCached;
      
      // Try old localStorage fallback
      const cachedData = localStorage.getItem(`${PLAYER_PREFIX}${playerName}`);
      if (cachedData) {
        return JSON.parse(cachedData) as PlayerDetailsData;
      }
      
      return { matches: [], stats: {} };
    }
  },

  // Enhanced fetchStatsData with navigation cache
  async fetchStatsData(forceRefresh = false): Promise<{stats: Array<Array<string | number>>}> {
    const sessionKey = 'stats';
    
    try {
      // Check navigation cache first
      if (!forceRefresh) {
        const navCached = this.getNavigationCache<{stats: Array<Array<string | number>>}>(sessionKey);
        if (navCached) {
          setTimeout(() => this.backgroundLiveCheck(), 100);
          return navCached;
        }
      }

      // Fetch fresh data
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=stats`);
      const data = response.data;
      
      // Cache for navigation
      this.setNavigationCache(sessionKey, data);
      
      return data;
    } catch (error) {
      console.error("Error fetching stats data:", error);
      
      // Try navigation cache as fallback
      const navCached = this.getNavigationCache<{stats: Array<Array<string | number>>}>(sessionKey);
      if (navCached) return navCached;
      
      // Try old localStorage fallback
      const cachedData = localStorage.getItem('cricket_stats_data');
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      return { stats: [] };
    }
  },

  // Smart image loading with retry
  async loadPlayerImage(playerName: string, getPlayerImageFn: (params: { name: string; playerNameForImage: string }) => Promise<string>): Promise<string> {
    // Check cache first
    const cachedImage = this.getImageCache(playerName);
    if (cachedImage) return cachedImage;

    try {
      // Load fresh image
      const imageUrl = await getPlayerImageFn({ 
        name: playerName, 
        playerNameForImage: playerName 
      });
      
      // Cache the image
      this.setImageCache(playerName, imageUrl);
      return imageUrl;
    } catch (error) {
      console.error(`Error loading image for ${playerName}:`, error);
      
      // Retry after 5 seconds
      setTimeout(() => {
        this.retryImageLoad(playerName, getPlayerImageFn);
      }, 5000);
      
      return '/placeholder-image.png';
    }
  },

  // Retry image loading
  async retryImageLoad(playerName: string, getPlayerImageFn: (params: { name: string; playerNameForImage: string }) => Promise<string>): Promise<void> {
    try {
      const imageUrl = await getPlayerImageFn({ 
        name: playerName, 
        playerNameForImage: playerName 
      });
      this.setImageCache(playerName, imageUrl);
      
      // Notify components
      updateEvents.dispatchEvent(new CustomEvent('image-loaded', { 
        detail: { playerName, imageUrl } 
      }));
    } catch (error) {
      console.error(`Retry failed for ${playerName}:`, error);
    }
  },

  // Listen for image load events
  onImageLoaded(callback: (detail: {playerName: string, imageUrl: string}) => void): () => void {
    const eventListener = (event: CustomEvent) => callback(event.detail);
    updateEvents.addEventListener('image-loaded', eventListener as EventListener);
    return () => updateEvents.removeEventListener('image-loaded', eventListener as EventListener);
  },

  // Clear navigation cache only
  clearNavigationCache(): void {
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith(SESSION_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  },

  // Keep your existing initBackgroundUpdater method (enhanced)
  initBackgroundUpdater(): void {
    if (updateCheckerInitialized) return;
    
    const checkForUpdatesAndRefresh = async () => {
      try {
        await this.backgroundLiveCheck();
      } catch (error) {
        console.error("Error in background update:", error);
      }
    };
    
    // Run after initial load
    setTimeout(() => {
      checkForUpdatesAndRefresh();
    }, 3000);
    
    // Setup interval for live updates
    setInterval(checkForUpdatesAndRefresh, UPDATE_CHECK_INTERVAL);
    
    updateCheckerInitialized = true;
  },

  // Enhanced refreshCachedPlayerDetails
  async refreshCachedPlayerDetails(): Promise<void> {
    // This now just clears navigation cache since we use live updates
    this.clearNavigationCache();
  },

  // Enhanced prefetchAllPlayerDetails
  async prefetchAllPlayerDetails(playerNames: string[]): Promise<void> {
    if (!playerNames || playerNames.length === 0) return;
    
    // Just prefetch a few for navigation cache
    const MAX_PREFETCH = 3;
    const playersToPrefetch = playerNames.slice(0, MAX_PREFETCH);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    for (const playerName of playersToPrefetch) {
      try {
        const sessionKey = `player_${playerName}`;
        const existing = this.getNavigationCache(sessionKey);
        
        if (!existing) {
          await this.fetchPlayerDetails(playerName);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error prefetching player ${playerName}:`, error);
      }
    }
  },

  // Force update method (clears navigation cache, forces fresh data)
  forceUpdate(): void {
    this.clearNavigationCache();
    localStorage.removeItem(METADATA_KEY);
    lastLiveCheck = 0;
    updateEvents.dispatchEvent(new Event(UPDATE_EVENT));
  },

  // Refresh method (clear all caches except images)
  refresh(): void {
    this.clearNavigationCache();
    
    // Clear old localStorage data cache (keep images)
    localStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(SUMMARY_KEY);
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.removeItem(`${SUMMARY_KEY}_timestamp`);
    localStorage.removeItem(`${PLAYERS_KEY}_timestamp`);
    
    // Clear player-specific caches (except images)
    const playerKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(PLAYER_PREFIX) && !key.includes('player_image_')
    );
    
    playerKeys.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
    });
    
    lastLiveCheck = 0;
    updateEvents.dispatchEvent(new Event(UPDATE_EVENT));
  },

  // Keep your existing clearCache method
  clearCache(): void {
    this.refresh();
  },

  // Initialize the enhanced cache system
  init(): void {
    if (updateCheckerInitialized) return;
    
    // Clear very old navigation cache on app start
    const lastActivity = localStorage.getItem('last_activity_timestamp');
    const currentTime = Date.now();
    
    if (lastActivity) {
      const timeSinceLastActivity = currentTime - parseInt(lastActivity, 10);
      if (timeSinceLastActivity > 24 * 60 * 60 * 1000) { // 24 hours
        this.refresh();
      }
    }
    
    localStorage.setItem('last_activity_timestamp', currentTime.toString());
    this.initBackgroundUpdater();
  }
};
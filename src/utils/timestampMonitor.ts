// src/utils/timeStampMonitor.ts

/**
 * A utility to monitor timestamps and detect when data is getting stale
 */

// Key for the last server check timestamp
const LAST_SERVER_CHECK_KEY = 'last_server_check_timestamp';
// Key for app open timestamp
const APP_OPEN_TIMESTAMP_KEY = 'app_opened_timestamp'; 
// Map of data keys to their refresh timestamps
const DATA_REFRESH_MAP_KEY = 'data_refresh_timestamps';

interface RefreshTimestamps {
  [key: string]: number;
}

/**
 * Record that the app has been opened (call on app init)
 */
export const recordAppOpen = (): void => {
  const timestamp = Date.now();
  localStorage.setItem(APP_OPEN_TIMESTAMP_KEY, timestamp.toString());
  console.log(`App opened at: ${new Date(timestamp).toISOString()}`);
};

/**
 * Record that we've checked the server for updates
 */
export const recordServerCheck = (): void => {
  const timestamp = Date.now();
  localStorage.setItem(LAST_SERVER_CHECK_KEY, timestamp.toString());
};

/**
 * Record that a specific data type has been refreshed
 * @param dataKey The key identifying the data type
 */
export const recordDataRefresh = (dataKey: string): void => {
  const timestamp = Date.now();
  const timestampsJson = localStorage.getItem(DATA_REFRESH_MAP_KEY) || '{}';
  const timestamps: RefreshTimestamps = JSON.parse(timestampsJson);
  
  timestamps[dataKey] = timestamp;
  localStorage.setItem(DATA_REFRESH_MAP_KEY, JSON.stringify(timestamps));
  console.log(`Data refreshed for ${dataKey} at: ${new Date(timestamp).toISOString()}`);
};

/**
 * Check if we need to refresh a specific data type
 * @param dataKey The key identifying the data type
 * @param maxAge Maximum age in milliseconds
 */
export const isDataStale = (dataKey: string, maxAge: number): boolean => {
  const timestampsJson = localStorage.getItem(DATA_REFRESH_MAP_KEY) || '{}';
  const timestamps: RefreshTimestamps = JSON.parse(timestampsJson);
  
  const lastRefresh = timestamps[dataKey];
  if (!lastRefresh) {
    // No record of refreshing this data
    return true;
  }
  
  const currentTime = Date.now();
  return (currentTime - lastRefresh) > maxAge;
};

/**
 * Check if it's been too long since we've checked the server
 * @param maxAge Maximum age in milliseconds
 */
export const isServerCheckStale = (maxAge: number): boolean => {
  const lastCheck = localStorage.getItem(LAST_SERVER_CHECK_KEY);
  if (!lastCheck) {
    // No record of checking the server
    return true;
  }
  
  const lastCheckTime = parseInt(lastCheck, 10);
  const currentTime = Date.now();
  return (currentTime - lastCheckTime) > maxAge;
};

/**
 * Get app session duration in minutes
 */
export const getAppSessionDuration = (): number => {
  const openTime = localStorage.getItem(APP_OPEN_TIMESTAMP_KEY);
  if (!openTime) {
    return 0;
  }
  
  const openTimestamp = parseInt(openTime, 10);
  const currentTime = Date.now();
  return Math.floor((currentTime - openTimestamp) / (60 * 1000)); // minutes
};

/**
 * Check if we've been in the app long enough that we should 
 * force a refresh of critical data
 * @param minDuration Minimum session duration in minutes
 */
export const shouldForceRefresh = (minDuration: number): boolean => {
  const duration = getAppSessionDuration();
  return duration >= minDuration;
};

/**
 * Reset all monitoring timestamps
 */
export const resetAllTimestamps = (): void => {
  localStorage.removeItem(LAST_SERVER_CHECK_KEY);
  localStorage.removeItem(APP_OPEN_TIMESTAMP_KEY);
  localStorage.removeItem(DATA_REFRESH_MAP_KEY);
};
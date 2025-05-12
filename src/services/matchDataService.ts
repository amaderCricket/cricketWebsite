// src/services/matchDataService.ts
import axios from 'axios';

import { API_CONFIG } from '../config/apiConfig';

export interface TeamResult {
  teamName: string;
  result: 'Won' | 'Lost';
  score: string;
}

export interface PlayerTeamInfo {
  playerName: string;
  teams: string[];
  isManOfMatch?: boolean;
}

export interface LastMatchInfo {
  date: string;
  teams: TeamResult[];
  players: PlayerTeamInfo[];
}

interface MatchDataResponse {
  _metadata?: {
    lastUpdated: number;
  };
  'Match Data': unknown[][];
  [key: string]: unknown;
}

const CACHE_KEY = API_CONFIG.MATCH_KEY;
const CACHE_TIMESTAMP_KEY = `${CACHE_KEY}_timestamp`;
const CACHE_METADATA_KEY = API_CONFIG.MATCH_METADATA_KEY;

// IMPORTANT: Set a very short cache TTL for match data (30 minutes)
const MATCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

// Helper function to convert column letter to index (A=0, B=1, etc.)
const columnToIndex = (column: string): number => {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return index - 1;
};

// Helper function to check if match data cache is expired
const isMatchCacheExpired = (): boolean => {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  
  if (!timestamp) return true;
  
  const savedTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  
  return currentTime - savedTime > MATCH_CACHE_TTL;
};

const parseMatchData = (matchData: unknown[][]): LastMatchInfo | null => {
  console.log('Parsing match data:', matchData);
  console.log('Total rows:', matchData.length);
  
  // Check if first row looks like a header
  const firstRow = matchData[0];
  let dataRows: unknown[][];
  
  // Check if the first row is a header by looking at the data types
  // If the first row has dates/numbers in expected positions, it's data, not a header
  if (firstRow && typeof firstRow[0] === 'string' && firstRow[0].includes('T')) {
    dataRows = matchData;
  } else {
    // First row is likely a header, skip it
    dataRows = matchData.slice(1);
  }
  
  console.log('Data rows to process:', dataRows.length);
  
  if (dataRows.length === 0) {
    console.error('No data rows found');
    return null;
  }
  
  // Column indices
  const dateIndex = columnToIndex('A');    // 0
  const playerIndex = columnToIndex('B');  // 1
  const momIndex = columnToIndex('U');    // 20
  const teamIndex = columnToIndex('V');    // 21
  const resultIndex = columnToIndex('W');  // 22
  const scoreIndex = columnToIndex('Y');   // 24
  
  // Extract date from first data row
  const firstDataRow = dataRows[0] as (string | number | unknown)[];
  const date = firstDataRow && firstDataRow[dateIndex] ? String(firstDataRow[dateIndex]) : 'Unknown Date';
  const teams: TeamResult[] = [];
  const players: PlayerTeamInfo[] = [];
  const playerMap = new Map<string, { teams: Set<string>; isManOfMatch: boolean }>();
  
  // Process each row
  dataRows.forEach((row: unknown[]) => {
    const rowData = row as (string | number | unknown)[];
    const teamName = rowData[teamIndex] ? String(rowData[teamIndex]).trim() : '';
    const playerName = rowData[playerIndex] ? String(rowData[playerIndex]).trim() : '';
    const result = rowData[resultIndex] ? String(rowData[resultIndex]).trim() : '';
    const score = rowData[scoreIndex] ? String(rowData[scoreIndex]).trim() : '';
    const momValue = rowData[momIndex] ? String(rowData[momIndex]).toLowerCase().trim() : '';
    
    // Process teams
    if (teamName && teamName !== 'Both Teams') {
      const existingTeam = teams.find(t => t.teamName === teamName);
      
      if (!existingTeam) {
        teams.push({
          teamName,
          result: result.toLowerCase() === 'won' ? 'Won' : 'Lost',
          score
        });
      }
    }
    
    // Track players and their teams
    if (playerName && !playerMap.has(playerName)) {
      playerMap.set(playerName, {
        teams: new Set(),
        isManOfMatch: false
      });
    }
    
    if (playerName) {
      const playerData = playerMap.get(playerName)!;
      
      // Check if this player is Man of the Match
      if (momValue === 'yes' || momValue === 'y' || momValue === '1') {
        playerData.isManOfMatch = true;
        console.log(`${playerName} is Man of the Match`);
      }
      
      // Assign player to team
      if (teamName === 'Both Teams') {
        teams.forEach(team => {
          playerData.teams.add(team.teamName);
        });
      } else if (teamName) {
        playerData.teams.add(teamName);
      }
    }
  });
  
  // Convert player map to array
  playerMap.forEach((playerData, playerName) => {
    players.push({
      playerName,
      teams: Array.from(playerData.teams),
      isManOfMatch: playerData.isManOfMatch
    });
  });
  
  const result = {
    date,
    teams,
    players
  };
  
  console.log('=== FINAL PARSED DATA ===');
  console.log('Teams:', teams);
  console.log('Players with teams:', players.map(p => ({
    name: p.playerName,
    teams: p.teams,
    mom: p.isManOfMatch
  })));
  
  return result;
};

// Main function to fetch match data
export const fetchLastMatchData = async (forceRefresh = false): Promise<LastMatchInfo | null> => {
  try {
    // Always check if we need to refresh the data first
    const needsUpdate = await checkForMatchDataUpdates();
    

    
    // Always refresh in these cases:
    // 1. forceRefresh flag is true
    // 2. Server has updates
    // 3. Cache is expired
    // 4. Random refresh (10% chance) for additional freshness
    const shouldRefresh = forceRefresh || 
                          needsUpdate || 
                          isMatchCacheExpired() || 
                          Math.random() < 0.1; // 10% chance of refresh
    
    // Check if we have valid cached data
    if (!shouldRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        console.log('Using cached match data');
        return JSON.parse(cachedData) as LastMatchInfo;
      }
    }
    
    console.log('Fetching fresh match data from API...');
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const API_URL = API_CONFIG.baseUrl;
    const response = await axios.get<MatchDataResponse>(
      `${API_URL}?type=all&_t=${timestamp.toString()}`, 
      {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
    
    if (!response.data || !response.data['Match Data']) {
      console.error('No match data found in API response');
      return null;
    }
    
    const matchData = response.data['Match Data'];
    
    // Check if any row has important player names for debugging
    console.log('Total rows in Match Data:', matchData.length);
    
    const parsedData = parseMatchData(matchData);
    
    if (parsedData) {
      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsedData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      // Store metadata for update checking
      const metadata = {
        lastUpdated: Date.now(),
        matchDate: parsedData.date
      };
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
      
      console.log('Match data cached successfully');
    } else {
      console.error('Failed to parse match data');
    }
    
    return parsedData;
    
  } catch (error) {
    console.error('Error fetching match data:', error);
    
    // Try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('Using cached data as fallback after error');
      return JSON.parse(cachedData) as LastMatchInfo;
    }
    
    return null;
  }
};

// Check if match data needs to be updated
export const checkForMatchDataUpdates = async (): Promise<boolean> => {
  try {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const API_URL = API_CONFIG.baseUrl;
    const response = await axios.get(
      `${API_URL}?type=checkUpdate&_t=${timestamp.toString()}`,
      {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
    const serverMetadata = response.data;
    
    // Get our stored metadata for match data
    const storedMetadataJson = localStorage.getItem(CACHE_METADATA_KEY);
    
    // If no stored metadata, we need to update
    if (!storedMetadataJson) {
      console.log('No stored match data metadata, refresh needed');
      return true;
    }
    
    const storedMetadata = JSON.parse(storedMetadataJson);
    
    // Check if cache is too old (30 minutes)
    if (isMatchCacheExpired()) {
      console.log('Match data cache has expired, refreshing...');
      return true;
    }
    
    // Check if cache is older than 5 minutes (to ensure frequent checks)
    const timestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (timestampStr) {
      const savedTime = parseInt(timestampStr, 10);
      const currentTime = Date.now();
      if (currentTime - savedTime > 5 * 60 * 1000) { // 5 minutes
        console.log('Match data cache is older than 5 minutes, checking server...');
        
        // Check if server data is newer
        if (serverMetadata.lastUpdated > storedMetadata.lastUpdated) {
          console.log('Server has newer match data, refreshing...');
          return true;
        }
      }
    }
    
    // Always check server timestamp against our stored metadata
    if (serverMetadata.lastUpdated > storedMetadata.lastUpdated) {
      console.log('Server has newer match data, refreshing...');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for match data updates:', error);
    // If there's an error, assume we need to update
    return true;
  }
};

// Prefetch match data (call this when app loads)
export const prefetchMatchData = async (): Promise<void> => {
  try {
    // Always fetch fresh data on app load
    console.log('Prefetching match data...');
    await fetchLastMatchData(true);
  } catch (error) {
    console.error('Error prefetching match data:', error);
  }
};
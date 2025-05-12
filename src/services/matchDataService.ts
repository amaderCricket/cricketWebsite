// src/services/matchDataService.ts
import axios from 'axios';
import { cacheService } from './cacheService';
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
const CACHE_METADATA_KEY = API_CONFIG.MATCH_METADATA_KEY;

// Just use the CORS proxy that works
const CORS_PROXY = "https://corsproxy.io/?";

// Helper function to convert column letter to index (A=0, B=1, etc.)
const columnToIndex = (column: string): number => {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return index - 1;
};

const parseMatchData = (matchData: unknown[][]): LastMatchInfo | null => {
  if (!matchData || !Array.isArray(matchData) || matchData.length === 0) {
    console.error('Invalid match data format:', matchData);
    return null;
  }
  
  // Debugging - log the structure of the first few rows
  console.log('Match data structure sample:', matchData.slice(0, 3));
  
  // Check if first row looks like a header
  const firstRow = matchData[0];
  let dataRows: unknown[][];
  
  // Check if the first row is a header by looking at the data types
  if (firstRow && typeof firstRow[0] === 'string' && firstRow[0].includes('T')) {
    dataRows = matchData;
  } else {
    // First row is likely a header, skip it
    dataRows = matchData.slice(1);
  }
  
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
  
  // Validate resulting data structure
  if (teams.length === 0) {
    console.error('No teams found in parsed data');
    return null;
  }
  
  console.log('Successfully parsed match data:', result);
  return result;
};

export const fetchLastMatchData = async (forceRefresh = false): Promise<LastMatchInfo | null> => {
  try {
    // First check if we have cached data
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData && !cacheService.isCacheExpired(CACHE_KEY)) {
        console.log('Using cached match data');
        
        // Check for updates in background
        setTimeout(() => {
          checkForUpdatesInBackground();
        }, 1000);
        
        return JSON.parse(cachedData) as LastMatchInfo;
      }
    }
    
    console.log('Fetching fresh match data from API...');
    
    let responseData;
    
    // First try direct API call with timeout
    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=all`, {
        timeout: 10000 // 10 second timeout
      });
      responseData = response.data;
      console.log('Direct API call succeeded');
    } catch (directError) {
      console.log("Direct API access failed, trying CORS proxy:", directError);
      
      // Try with CORS proxy
      try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(API_CONFIG.baseUrl)}?type=all`;
        console.log(`Trying proxy: ${proxyUrl}`);
        const response = await axios.get(proxyUrl, { 
          timeout: 15000, // 15 second timeout
          headers: {
            'Accept': 'application/json'
          }
        });
        responseData = response.data;
        console.log("Proxy success:", CORS_PROXY);
      } catch (proxyError) {
        console.error('CORS proxy also failed:', proxyError);
        throw new Error('Both direct and proxy API calls failed');
      }
    }
    
    // Now process the responseData
    console.log('API Response:', responseData);
    
    if (!responseData) {
      console.error('Empty response from API');
      throw new Error('Empty response from API');
    }
    
    // Handle potential XML response or other formats
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        console.error('Response is not valid JSON:', e);
        throw new Error('Response is not valid JSON');
      }
    }
    
    // Check if the data contains the Match Data
    if (!responseData['Match Data']) {
      console.error('No match data found in API response');
      
      // Check for other possible property names
      const possibleKeys = Object.keys(responseData);
      console.log('Available data keys:', possibleKeys);
      
      // Try to find any array that could be match data
      let matchData = null;
      for (const key of possibleKeys) {
        if (Array.isArray(responseData[key]) && responseData[key].length > 0) {
          console.log(`Found array in key ${key}, trying to use it`);
          matchData = responseData[key];
          break;
        }
      }
      
      if (!matchData) {
        throw new Error('Could not find match data in response');
      }
      
      const parsedData = parseMatchData(matchData);
      
      if (parsedData) {
        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsedData));
        localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
        return parsedData;
      } else {
        throw new Error('Failed to parse match data');
      }
    }
    
    // Process the match data
    const matchData = responseData['Match Data'];
    const parsedData = parseMatchData(matchData);
    
    if (parsedData) {
      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsedData));
      localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
      
      // Store metadata for update checking
      const metadata = {
        lastUpdated: Date.now(),
        matchDate: parsedData.date
      };
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
      
      console.log('Data cached successfully');
      return parsedData;
    } else {
      throw new Error('Failed to parse match data');
    }
    
  } catch (error) {
    console.error('Error fetching match data:', error);
    
    // Try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('Using cached data as fallback after error');
      return JSON.parse(cachedData) as LastMatchInfo;
    }
    
    return null; // Return null instead of fallback data
  }
};

// Background update check
const checkForUpdatesInBackground = async (): Promise<void> => {
  try {
    // Check if data needs update
    const needsUpdate = await cacheService.checkForUpdates();
    if (needsUpdate) {
      console.log('Match data needs update, fetching in background...');
      await fetchLastMatchData(true);
    }
  } catch (error) {
    console.error('Error checking for updates in background:', error);
  }
};

// Prefetch match data (call this when app loads)
export const prefetchMatchData = async (): Promise<void> => {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (!cachedData || cacheService.isCacheExpired(CACHE_KEY)) {
    console.log('Prefetching match data...');
    try {
      await fetchLastMatchData(true);
    } catch (error) {
      console.error('Error prefetching match data:', error);
    }
  } else {
    console.log('Match data already cached, skipping prefetch');
  }
};
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

const CACHE_KEY = 'last_match_data';
const CACHE_METADATA_KEY = 'last_match_metadata';

// Helper function to convert column letter to index (A=0, B=1, etc.)
const columnToIndex = (column: string): number => {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return index - 1;
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
  
//   console.log('First data row:', firstDataRow);
//   console.log('Extracted date:', date);
  
  // Process each row
  dataRows.forEach((row: unknown[]) => {
    const rowData = row as (string | number | unknown)[];
    const teamName = rowData[teamIndex] ? String(rowData[teamIndex]).trim() : '';
    const playerName = rowData[playerIndex] ? String(rowData[playerIndex]).trim() : '';
    const result = rowData[resultIndex] ? String(rowData[resultIndex]).trim() : '';
    const score = rowData[scoreIndex] ? String(rowData[scoreIndex]).trim() : '';
    const momValue = rowData[momIndex] ? String(rowData[momIndex]).toLowerCase().trim() : '';
    
    // Log first few rows for debugging
    // if (index < 5) {
    //   console.log(`Row ${index}:`, { 
    //     teamName, 
    //     playerName, 
    //     result, 
    //     score, 
    //     momValue 
    //   });
    // }
    
    // Skip if player name is empty
    // if (!playerName) {
    //   console.log(`Skipping row ${index} - empty player name`);
    //   return;
    // }
    
    // Process teams
    if (teamName && teamName !== 'Both Teams') {
      const existingTeam = teams.find(t => t.teamName === teamName);
      
      if (!existingTeam) {
        teams.push({
          teamName,
          result: result.toLowerCase() === 'won' ? 'Won' : 'Lost',
          score
        });
        // console.log(`Added team: ${teamName}`);
      }
    }
    
    // Track players and their teams
    if (!playerMap.has(playerName)) {
      playerMap.set(playerName, {
        teams: new Set(),
        isManOfMatch: false
      });
    //   console.log(`Added player: ${playerName}`);
    }
    
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
      console.log(`Added ${playerName} to team ${teamName}`);
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
  console.log('All player names:', players.map(p => p.playerName));
  console.log('Players with teams:', players.map(p => ({
    name: p.playerName,
    teams: p.teams,
    mom: p.isManOfMatch
  })));
  
  return result;
};
export const fetchLastMatchData = async (forceRefresh = false): Promise<LastMatchInfo | null> => {
  try {
    // First check if we have cached data
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(API_CONFIG.MATCH_KEY);
      if (cachedData && !cacheService.isCacheExpired(API_CONFIG.MATCH_KEY)) {
        console.log('Using cached match data');
        
        // Check for updates in background
        setTimeout(() => {
          checkForUpdatesInBackground();
        }, 1000);
        
        return JSON.parse(cachedData) as LastMatchInfo;
      }
    }
    
    console.log('Fetching fresh match data from API...');
    
    console.log('Fetching fresh match data from API...');
    
    const API_URL = API_CONFIG.baseUrl;
    const response = await axios.get<MatchDataResponse>(`${API_URL}?type=all`);
    
    console.log('API response:', response.data);
    
    if (!response.data || !response.data['Match Data']) {
      console.error('No match data found in API response');
      return null;
    }
    
    const matchData = response.data['Match Data'];
    
    // Add detailed logging to check for Imam
    console.log('=== RAW MATCH DATA FROM API ===');
    console.log('Total rows in Match Data:', matchData.length);
    
    // Check if any row has "Imam" as player name
    let imamFound = false;
    matchData.forEach((row, index) => {
      const playerName = row[1]; // Column B is index 1
      if (playerName === 'Imam') {
        console.log(`FOUND IMAM at row ${index}:`, row);
        imamFound = true;
      }
    });
    
    if (!imamFound) {
      console.log('IMAM NOT FOUND in raw data from API');
      console.log('First 5 rows of raw data:');
      matchData.slice(0, 5).forEach((row, index) => {
        console.log(`Row ${index}:`, row);
      });
    }
    
    
   
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
    await fetchLastMatchData(true);
  } else {
    console.log('Match data already cached, skipping prefetch');
  }
};
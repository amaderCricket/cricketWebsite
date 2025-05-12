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
  // Add individual player stats
  runsScored?: number | string;
  ballsFaced?: number | string;
  dismissals?: number | string;
  runsGiven?: number | string;
  ballsBowled?: number | string;
  wicketsTaken?: number | string;
}

export interface LastMatchInfo {
  date: string;
  teams: TeamResult[];
  players: PlayerTeamInfo[];
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
  
  if (dataRows.length === 0) {
    console.error('No data rows found');
    return null;
  }
  
  // Column indices
  const dateIndex = columnToIndex('A');      // 0
  const playerIndex = columnToIndex('B');    // 1
  const momIndex = columnToIndex('U');       // 20
  const teamIndex = columnToIndex('V');      // 21
  const resultIndex = columnToIndex('W');    // 22
  const scoreIndex = columnToIndex('Y');     // 24
  
  // Individual player stat indices
  const runsIndex = columnToIndex('D');      // 3
  const ballsFacedIndex = columnToIndex('E'); // 4
  const dismissalsIndex = columnToIndex('F'); // 5
  const runsGivenIndex = columnToIndex('G'); // 6
  const ballsBowledIndex = columnToIndex('H'); // 7
  const wicketsIndex = columnToIndex('I');   // 8
  
  // Extract date from first data row
  const firstDataRow = dataRows[0] as (string | number | unknown)[];
  const date = firstDataRow && firstDataRow[dateIndex] ? String(firstDataRow[dateIndex]) : 'Unknown Date';
  const teams: TeamResult[] = [];
  const players: PlayerTeamInfo[] = [];
  const playerMap = new Map<string, { 
    teams: Set<string>; 
    isManOfMatch: boolean;
    runsScored?: string | number;
    ballsFaced?: string | number;
    dismissals?: string | number;
    runsGiven?: string | number;
    ballsBowled?: string | number;
    wicketsTaken?: string | number;
  }>();
  
  // Process each row
  dataRows.forEach((row: unknown[]) => {
    const rowData = row as (string | number | unknown)[];
    const teamName = rowData[teamIndex] ? String(rowData[teamIndex]).trim() : '';
    const playerName = rowData[playerIndex] ? String(rowData[playerIndex]).trim() : '';
    const result = rowData[resultIndex] ? String(rowData[resultIndex]).trim() : '';
    const score = rowData[scoreIndex] ? String(rowData[scoreIndex]).trim() : '';
    const momValue = rowData[momIndex] ? String(rowData[momIndex]).toLowerCase().trim() : '';
    
    // Extract player stats
    const runsScored = typeof rowData[runsIndex] === 'string' || typeof rowData[runsIndex] === 'number' ? rowData[runsIndex] as string | number : undefined;
    const ballsFaced = typeof rowData[ballsFacedIndex] === 'string' || typeof rowData[ballsFacedIndex] === 'number' ? rowData[ballsFacedIndex] as string | number : undefined;
    const dismissals = typeof rowData[dismissalsIndex] === 'string' || typeof rowData[dismissalsIndex] === 'number' ? rowData[dismissalsIndex] as string | number : undefined;
    const runsGiven = typeof rowData[runsGivenIndex] === 'string' || typeof rowData[runsGivenIndex] === 'number' ? rowData[runsGivenIndex] as string | number : undefined;
    const ballsBowled = typeof rowData[ballsBowledIndex] === 'string' || typeof rowData[ballsBowledIndex] === 'number' ? rowData[ballsBowledIndex] as string | number : undefined;
    const wicketsTaken = typeof rowData[wicketsIndex] === 'string' || typeof rowData[wicketsIndex] === 'number' ? rowData[wicketsIndex] as string | number : undefined;
    
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
        teams: new Set<string>(),
        isManOfMatch: false,
        runsScored,
        ballsFaced,
        dismissals,
        runsGiven,
        ballsBowled,
        wicketsTaken
      });
    } else if (playerName) {
      // Update existing player with stats if not already set
      const existingPlayer = playerMap.get(playerName);
      if (existingPlayer) {
        if (runsScored !== undefined && existingPlayer.runsScored === undefined) {
          existingPlayer.runsScored = runsScored;
        }
        if (ballsFaced !== undefined && existingPlayer.ballsFaced === undefined) {
          existingPlayer.ballsFaced = ballsFaced;
        }
        if (dismissals !== undefined && existingPlayer.dismissals === undefined) {
          existingPlayer.dismissals = dismissals;
        }
        if (runsGiven !== undefined && existingPlayer.runsGiven === undefined) {
          existingPlayer.runsGiven = runsGiven;
        }
        if (ballsBowled !== undefined && existingPlayer.ballsBowled === undefined) {
          existingPlayer.ballsBowled = ballsBowled;
        }
        if (wicketsTaken !== undefined && existingPlayer.wicketsTaken === undefined) {
          existingPlayer.wicketsTaken = wicketsTaken;
        }
      }
    }
    
    if (playerName) {
      const playerData = playerMap.get(playerName);
      
      if (playerData) {
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
    }
  });
  
  // Convert player map to array
  playerMap.forEach((playerData, playerName) => {
    players.push({
      playerName,
      teams: Array.from(playerData.teams),
      isManOfMatch: playerData.isManOfMatch,
      runsScored: playerData.runsScored,
      ballsFaced: playerData.ballsFaced,
      dismissals: playerData.dismissals,
      runsGiven: playerData.runsGiven,
      ballsBowled: playerData.ballsBowled,
      wicketsTaken: playerData.wicketsTaken
    });
  });
  
  return {
    date,
    teams,
    players
  };
};

export const fetchLastMatchData = async (forceRefresh = false): Promise<LastMatchInfo | null> => {
  try {
    // First check if we have cached data
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData && !cacheService.isCacheExpired(CACHE_KEY)) {
        
        // Check for updates in background
        setTimeout(() => {
          checkForUpdatesInBackground();
        }, 1000);
        
        return JSON.parse(cachedData) as LastMatchInfo;
      }
    }
    
    let responseData;
    
    // First try direct API call with timeout
    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=all`, {
        timeout: 10000 // 10 second timeout
      });
      responseData = response.data;
    } catch (directError) {
      console.log("Direct API access failed, trying CORS proxy:", directError);
      
      // Try with CORS proxy
      try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(API_CONFIG.baseUrl)}?type=all`;
        const response = await axios.get(proxyUrl, { 
          timeout: 15000 // 15 second timeout
        });
        responseData = response.data;
      } catch (proxyError) {
        console.error('CORS proxy also failed:', proxyError);
        throw new Error('Both direct and proxy API calls failed');
      }
    }
    
    if (!responseData || !responseData['Match Data']) {
      console.error('No match data found in API response');
      return null;
    }
    
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
      
      return parsedData;
    } else {
      return null;
    }
    
  } catch (error) {
    console.error('Error fetching match data:', error);
    
    // Try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
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
      await fetchLastMatchData(true);
    }
  } catch (error) {
    console.error('Error checking for updates in background:', error);
  }
};

// Prefetch match data (call this when app loads)
export const prefetchMatchData = async (): Promise<void> => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData || cacheService.isCacheExpired(CACHE_KEY)) {
      await fetchLastMatchData(true);
    }
  } catch (error) {
    console.error('Error prefetching match data:', error);
  }
};
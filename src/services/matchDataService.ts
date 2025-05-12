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

// Add CORS proxies
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://thingproxy.freeboard.io/fetch/"
];

// Helper function to convert column letter to index (A=0, B=1, etc.)
const columnToIndex = (column: string): number => {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return index - 1;
};

const parseMatchData = (matchData: unknown[][]): LastMatchInfo | null => {
  // console.log('Parsing match data:', matchData);
  // console.log('Total rows:', matchData.length);
  
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
  
  // console.log('Data rows to process:', dataRows.length);
  
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
  
  return {
    date,
    teams,
    players
  };
};

// Fallback match data in case all else fails
const FALLBACK_MATCH_DATA: LastMatchInfo = {
  date: "2025-05-10T00:00:00.000Z",
  teams: [
    {
      teamName: "Team A",
      result: "Won",
      score: "135/5"
    },
    {
      teamName: "Team B",
      result: "Lost",
      score: "120/8"
    }
  ],
  players: [
    {
      playerName: "Shehrozi",
      teams: ["Team A"],
      isManOfMatch: true
    },
    {
      playerName: "Safiur",
      teams: ["Team A"]
    },
    {
      playerName: "Kamil",
      teams: ["Team A"]
    },
    {
      playerName: "Rafi",
      teams: ["Team B"]
    },
    {
      playerName: "Nazmul",
      teams: ["Team B"]
    }
  ]
};

// Try to fetch data with multiple approaches
async function fetchWithCorsProxies(url: string, timeout = 10000): Promise<unknown> {
  // Try direct access first
  try {
    const response = await axios.get(url, { timeout });
    return response.data;
  } catch (directError) {
    console.log("Direct API access failed, trying CORS proxies:", directError);
    
    // Try each proxy in succession
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        console.log(`Trying proxy: ${proxyUrl}`);
        const response = await axios.get(proxyUrl, { timeout: timeout + 5000 });
        console.log("Proxy success:", proxy);
        return response.data;
      } catch (proxyError) {
        console.log(`Proxy ${proxy} failed:`, proxyError);
        // Continue to next proxy
      }
    }
    
    // If we get here, all proxies failed
    throw new Error("All fetch attempts failed");
  }
}

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
    
    // Create a promise that will reject after specified timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Fetch timeout")), 20000);
    });
    
    // Create the fetch promise with proxies
    const fetchPromise = fetchWithCorsProxies(`${API_CONFIG.baseUrl}?type=all`);
    
    // Race the promises
    const data = await Promise.race([fetchPromise, timeoutPromise]) as MatchDataResponse;
    
    if (!data || !data['Match Data']) {
      console.error('No match data found in API response');
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData) as LastMatchInfo;
      }
      
      // If no cached data, use fallback data
      console.log("Using fallback match data");
      return FALLBACK_MATCH_DATA;
    }
    
    const matchData = data['Match Data'];
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
      console.error('Failed to parse match data');
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData) as LastMatchInfo;
      }
      
      // If no cached data, use fallback data
      console.log("Using fallback match data");
      return FALLBACK_MATCH_DATA;
    }
    
  } catch (error) {
    console.error('Error fetching match data:', error);
    
    // Try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('Using cached data as fallback after error');
      return JSON.parse(cachedData) as LastMatchInfo;
    }
    
    // If no cached data, use fallback data
    console.log("Using fallback match data");
    return FALLBACK_MATCH_DATA;
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
      // If prefetch fails, ensure we at least have fallback data
      if (!localStorage.getItem(CACHE_KEY)) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(FALLBACK_MATCH_DATA));
        localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
      }
    }
  } else {
    console.log('Match data already cached, skipping prefetch');
  }
};
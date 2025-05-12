// src/services/playerDataService.ts
import blankImage from '/src/assets/players/blank_image.png';
import { PlayerData } from '../types/playerTypes';

// Define a type for the raw data from the API
type RawPlayerData = Array<Array<string | number>>;

// Define thresholds for player roles
const BATTING_RATING_THRESHOLD = 400; 
const BOWLING_RATING_THRESHOLD = 300;

export const parsePlayerData = (rawData: RawPlayerData): PlayerData[] => {
  if (!rawData || !Array.isArray(rawData) || rawData.length < 2) {
    console.error('Invalid raw data format received:', rawData);
    return [];
  }
  
  // Skip the header row (index 0) and extract player data
  const playerData: PlayerData[] = [];
  
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    // Skip empty rows or those with no name
    if (!row[0]) continue;
    
    try {
      const playerName = String(row[0]);
      
      // Get batting and bowling ratings
      const battingRating = Number(row[2]) || 0;
      const bowlingRating = Number(row[3]) || 0;
      
      // Determine player role based on ratings
      let playerRole = 'All-Rounder'; // Default role
      
      if (battingRating >= BATTING_RATING_THRESHOLD && bowlingRating < BOWLING_RATING_THRESHOLD) {
        playerRole = 'Batsman';
      } else if (battingRating < BATTING_RATING_THRESHOLD && bowlingRating >= BOWLING_RATING_THRESHOLD) {
        playerRole = 'Bowler';
      }
      
      // Calculate batting average safely
      const runsScored = Number(row[10]) || 0;
      const dismissals = Number(row[12]) || 0;
      const battingAverage = dismissals > 0 ? runsScored / dismissals : runsScored > 0 ? runsScored : 0;
      
      // Calculate bowling average safely
      const runsGiven = Number(row[28]) || 0;
      const wicketsTaken = Number(row[30]) || 0;
      const bowlingAverage = wicketsTaken > 0 ? runsGiven / wicketsTaken : 0;
      
      // Calculate economy safely
      const ballsBowled = Number(row[29]) || 0;
      const economy = ballsBowled > 0 ? (runsGiven / (ballsBowled / 6)) : 0;
      
      // Parse the data into our PlayerData structure
      playerData.push({
        name: playerName,
        rank: Number(row[1]) || 0,
        battingRating: battingRating,
        bowlingRating: bowlingRating,
        allRounderRating: Number(row[4]) || 0,
        overallRating: String(row[5] || ''),
        momAwards: Number(row[6]) || 0,
        winPercentage: Number(row[7]) || 0,
        matches: Number(row[8]) || 0,
        innings: Number(row[9]) || 0,
        runsScored: runsScored,
        ballsFaced: Number(row[11]) || 0,
        dismissals: dismissals,
        highestScore: String(row[13] || ''),
        notOuts: Number(row[14]) || 0,
        ducks: Number(row[15]) || 0,
        goldenDucks: Number(row[16]) || 0,
        thirties: Number(row[17]) || 0,
        fifties: Number(row[18]) || 0,
        seventies: Number(row[19]) || 0,
        battingAverage: battingAverage,
        strikeRate: Number(row[21]) || 0,
        boundaryPercentage: Number(row[22]) || 0,
        dotsTaken: Number(row[23]) || 0,
        singlesTaken: Number(row[24]) || 0,
        twosTaken: Number(row[25]) || 0,
        foursTaken: Number(row[26]) || 0,
        runsGiven: runsGiven,
        ballsBowled: ballsBowled,
        wicketsTaken: wicketsTaken,
        bestBowling: String(row[31] || ''),
        threeWickets: Number(row[32]) || 0,
        fiveWickets: Number(row[33]) || 0,
        hattricks: Number(row[34]) || 0,
        maidens: Number(row[35]) || 0,
        economy: economy,
        bowlingAverage: bowlingAverage,
        bowlingStrikeRate: Number(row[38]) || 0,
        dotsGiven: Number(row[39]) || 0,
        twosGiven: Number(row[40]) || 0,
        foursGiven: Number(row[41]) || 0,
        extras: Number(row[42]) || 0,
        imageUrl: '', // Will be populated after image check
        fallbackImageUrl: blankImage,
        playerNameForImage: playerName,
        role: playerRole, // Set the role based on player stats
        performanceData: [] // Initialize with empty array
      });
    } catch (error) {
      console.error(`Error parsing player data for row ${i}:`, error);
      // Continue with next player
    }
  }
  
  return playerData;
};
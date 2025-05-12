// src/types/playerTypes.ts
// Define performance data type
export interface PerformanceData {
  date: string;
  match: string;
  runs: number;
  balls: number;
  wickets: number;
  economy?: number | string;
}

// Match data from API
export interface MatchData {
  Date?: string;
  'Runs Scored'?: number | string;
  'Balls Faced'?: number | string;
  'Wickets Taken'?: number | string;
  'Runs Given'?: number | string;
  'Balls Bowled'?: number | string;
  Result?: string;
  [key: string]: string | number | undefined; // Allow for additional properties
}

export interface PlayerData {
  name: string;
  rank: number;
  battingRating: number;
  bowlingRating: number;
  allRounderRating: number;
  overallRating: string;
  momAwards: number;
  winPercentage: number;
  matches: number;
  innings: number;
  runsScored: number;
  ballsFaced: number;
  dismissals: number;
  highestScore: string;
  notOuts: number;
  ducks: number;
  goldenDucks: number;
  thirties: number;
  fifties: number;
  seventies: number;
  battingAverage: number;
  strikeRate: number;
  boundaryPercentage: number;
  dotsTaken: number;
  singlesTaken: number;
  twosTaken: number;
  foursTaken: number;
  runsGiven: number;
  ballsBowled: number;
  wicketsTaken: number;
  bestBowling: string;
  threeWickets: number;
  fiveWickets: number;
  hattricks: number;
  maidens: number;
  economy: number;
  bowlingAverage: number;
  bowlingStrikeRate: number;
  dotsGiven: number;
  twosGiven: number;
  foursGiven: number;
  extras: number;
  imageUrl: string;
  fallbackImageUrl: string;
  playerNameForImage: string;
  role: string;
  performanceData?: PerformanceData[];
}
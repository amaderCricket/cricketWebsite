// src/utils/playerUtils.ts

export const formatNumber = (value: number, decimals: number = 2): string => {
  if (isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
};

export const getPerformanceTrend = (data: number[]): 'improving' | 'declining' | 'stable' => {
  if (data.length < 3) return 'stable';
  
  const recent = data.slice(-3);
  const average = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAverage = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
  
  const change = ((average - previousAverage) / previousAverage) * 100;
  
  if (change > 10) return 'improving';
  if (change < -10) return 'declining';
  return 'stable';
};

interface MatchData {
  'Runs Scored'?: string | number;
  'Wickets Taken'?: string | number;
  'Result'?: string;
}

export const calculateFormIndex = (recentMatches: MatchData[]): number => {
  if (!recentMatches || recentMatches.length === 0) return 0;
  
  const recentFive = recentMatches.slice(-5);
  let formPoints = 0;
  
  recentFive.forEach(match => {
    const runs = Number(match['Runs Scored'] || 0);
    const wickets = Number(match['Wickets Taken'] || 0);
    const result = match['Result'];
    
    // Points for runs
    if (runs >= 50) formPoints += 3;
    else if (runs >= 30) formPoints += 2;
    else if (runs >= 15) formPoints += 1;
    
    // Points for wickets
    if (wickets >= 3) formPoints += 3;
    else if (wickets >= 2) formPoints += 2;
    else if (wickets >= 1) formPoints += 1;
    
    // Points for result
    if (result === 'Won') formPoints += 2;
  });
  
  return (formPoints / (recentFive.length * 8)) * 100; // Max 8 points per match
};
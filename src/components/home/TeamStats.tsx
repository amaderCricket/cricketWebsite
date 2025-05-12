// src/components/home/TeamStats.tsx
import { useEffect, useState } from 'react';
import { cacheService } from '../../services/cacheService';

// Define proper types
interface StatsData {
  totalMatches: number;
  totalRunsScored: number;
  totalBallsBowled: number;
  allTimeHighestScore: number;
  totalWickets: number;  // Changed from highestScorePlayer to totalWickets
}

type DataRow = Array<string | number>;
type PlayersData = Array<DataRow>;

function TeamStats() {
  // All-time stats from player data
  const [allTimeStats, setAllTimeStats] = useState<StatsData>({
    totalMatches: 0,
    totalRunsScored: 0,
    totalBallsBowled: 0,
    allTimeHighestScore: 0,
    totalWickets: 0  // Changed from highestScorePlayer to totalWickets
  });
  
  const [, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // console.log("Fetching player statistics...");
        
        // Get player data for all-time stats
        const playersData = await cacheService.fetchPlayers();
        
        // Calculate all-time statistics from player data
        if (playersData && playersData.stats && Array.isArray(playersData.stats)) {
          const allTimeStats = calculateAllTimeStats(playersData.stats);
          setAllTimeStats(allTimeStats);
          // console.log("All-time stats calculated:", allTimeStats);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching stats data:", error);
        setLoading(false);
      }
    }
    
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Calculate all-time statistics from player data
  const calculateAllTimeStats = (playersData: PlayersData): StatsData => {
    const stats: StatsData = {
      totalMatches: 0,
      totalRunsScored: 0,
      totalBallsBowled: 0,
      allTimeHighestScore: 0,
      totalWickets: 0  // Changed from highestScorePlayer to totalWickets
    };
    
    if (!playersData || playersData.length < 2) {
      console.error("Invalid players data format");
      return stats;
    }
    
    try {
      // Get headers to find column indices
      const headers = playersData[0];
      // console.log("Stats headers:", headers);
      
      // Find the indices of the required columns
      const matchesIndex = findColumnIndex(headers, ['Matches', 'matches']);
      const runsIndex = findColumnIndex(headers, ['Runs Scored', 'runs scored', 'runs']);
      const ballsBowledIndex = findColumnIndex(headers, ['Balls Bowled', 'balls bowled']);
      const highestScoreIndex = findColumnIndex(headers, ['Highest Score', 'highest score']);
      const wicketsIndex = findColumnIndex(headers, ['Wickets Taken', 'wickets taken', 'wickets']);  // Add wickets column
      
      // Extract stats data
      const dataRows = playersData.slice(1); // Skip header row
      
      // Calculate stats
      let maxMatches = 0;
      let totalRuns = 0;
      let totalBallsBowled = 0;
      let maxHighScore = 0;
      let totalWickets = 0;  // Changed from highScorePlayer string to totalWickets number
      
      for (const row of dataRows) {
        // Process matches count (find highest value)
        if (matchesIndex !== -1 && row[matchesIndex] !== undefined) {
          const matches = Number(row[matchesIndex]);
          if (!isNaN(matches) && matches > maxMatches) {
            maxMatches = matches;
          }
        }
        
        // Sum total runs scored
        if (runsIndex !== -1 && row[runsIndex] !== undefined) {
          const runs = Number(row[runsIndex]);
          if (!isNaN(runs)) {
            totalRuns += runs;
          }
        }
        
        // Sum total balls bowled
        if (ballsBowledIndex !== -1 && row[ballsBowledIndex] !== undefined) {
          const balls = Number(row[ballsBowledIndex]);
          if (!isNaN(balls)) {
            totalBallsBowled += balls;
          }
        }
        
        // Find highest score
        if (highestScoreIndex !== -1 && row[highestScoreIndex] !== undefined) {
          // Highest score might be in format like "76*" or "76 (50)" - extract the number
          const scoreStr = String(row[highestScoreIndex]);
          const scoreMatch = scoreStr.match(/^\d+/);
          if (scoreMatch) {
            const score = Number(scoreMatch[0]);
            if (!isNaN(score) && score > maxHighScore) {
              maxHighScore = score;
            }
          }
        }
        
        // Sum total wickets taken
        if (wicketsIndex !== -1 && row[wicketsIndex] !== undefined) {
          const wickets = Number(row[wicketsIndex]);
          if (!isNaN(wickets)) {
            totalWickets += wickets;
          }
        }
      }
      
      return {
        totalMatches: maxMatches,
        totalRunsScored: totalRuns,
        totalBallsBowled: totalBallsBowled,
        allTimeHighestScore: maxHighScore,
        totalWickets: totalWickets  // Return totalWickets
      };
    } catch (error) {
      console.error("Error calculating all-time stats:", error);
      return stats;
    }
  };
  
  // Helper to find column index in header row
  const findColumnIndex = (headers: DataRow, possibleNames: string[]): number => {
    // First try exact match
    for (const name of possibleNames) {
      const index = headers.findIndex(
        (header) => 
          typeof header === 'string' && 
          header.toLowerCase() === name.toLowerCase()
      );
      if (index !== -1) return index;
    }
    
    // If exact match not found, try partial match
    for (const name of possibleNames) {
      const index = headers.findIndex(
        (header) => 
          typeof header === 'string' && 
          header.toLowerCase().includes(name.toLowerCase())
      );
      if (index !== -1) return index;
    }
    
    // Return -1 to indicate not found (rather than defaulting to first column)
    return -1;
  };

  return (
    <section className="team-stats" id="team-stats">
      <h2 className="section-title">Legacy of Matches</h2>
      
      {/* All-time statistics from player data */}
      <div className="season-stats">
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">Total Matches</span>
            <span className="stat-value">{allTimeStats.totalMatches}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Runs</span>
            <span className="stat-value">{allTimeStats.totalRunsScored}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Balls Bowled</span>
            <span className="stat-value">{allTimeStats.totalBallsBowled}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Wickets</span>
            <span className="stat-value">{allTimeStats.totalWickets}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TeamStats;
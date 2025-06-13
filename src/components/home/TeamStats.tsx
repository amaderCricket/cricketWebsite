// src/components/home/TeamStats.tsx
import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../../services/cacheService';

interface StatsData {
  totalMatches: number;
  totalRunsScored: number;
  totalBallsBowled: number;
  allTimeHighestScore: number;
  totalWickets: number;
}

type DataRow = Array<string | number>;

function TeamStats() {
  const [allTimeStats, setAllTimeStats] = useState<StatsData>({
    totalMatches: 0,
    totalRunsScored: 0,
    totalBallsBowled: 0,
    allTimeHighestScore: 0,
    totalWickets: 0
  });

  // NEW: Get stats from Hall of Fame Legendary Records section
  const calculateAllTimeStats = async (hallOfFameData: DataRow[]): Promise<StatsData> => {
    const stats: StatsData = {
      totalMatches: 0,
      totalRunsScored: 0,
      totalBallsBowled: 0,
      allTimeHighestScore: 0,
      totalWickets: 0
    };
    
    if (!hallOfFameData || hallOfFameData.length < 5) {
      console.error("Invalid Hall of Fame data format");
      return stats;
    }
    
    try {
      // Legendary Records section - all in row 1, different column positions
      const legendaryRecordsRow = hallOfFameData[1];
      
      if (legendaryRecordsRow && legendaryRecordsRow.length >= 14) {
        // Total Matches: index 12 = label, index 13 = value
        stats.totalMatches = Number(legendaryRecordsRow[13]) || 0;
      }
      
      // Row 2: Total Runs Scored  
      const totalRunsRow = hallOfFameData[2];
      if (totalRunsRow && totalRunsRow.length >= 14) {
        // Find "Total Runs Scored" and get the next value
        const totalRunsIndex = totalRunsRow.findIndex(cell => 
          typeof cell === 'string' && cell.includes('Total Runs')
        );
        if (totalRunsIndex !== -1 && totalRunsRow[totalRunsIndex + 1]) {
          stats.totalRunsScored = Number(totalRunsRow[totalRunsIndex + 1]) || 0;
        }
      }
      
      // Row 3: Total Balls Bowled
      const totalBallsRow = hallOfFameData[3];
      if (totalBallsRow && totalBallsRow.length >= 14) {
        // Find "Total Balls Bowled" and get the next value
        const totalBallsIndex = totalBallsRow.findIndex(cell => 
          typeof cell === 'string' && cell.includes('Total Balls')
        );
        if (totalBallsIndex !== -1 && totalBallsRow[totalBallsIndex + 1]) {
          stats.totalBallsBowled = Number(totalBallsRow[totalBallsIndex + 1]) || 0;
        }
      }
      
      // Row 4: Total Wickets Taken
      const totalWicketsRow = hallOfFameData[4];
      if (totalWicketsRow && totalWicketsRow.length >= 14) {
        // Find "Total Wickets" and get the next value
        const totalWicketsIndex = totalWicketsRow.findIndex(cell => 
          typeof cell === 'string' && cell.includes('Total Wickets')
        );
        if (totalWicketsIndex !== -1 && totalWicketsRow[totalWicketsIndex + 1]) {
          stats.totalWickets = Number(totalWicketsRow[totalWicketsIndex + 1]) || 0;
        }
      }
      
      // You can also get highest score from Hall of Fame if needed
      // For now, keeping it as 0 or you can extract from appropriate row
      stats.allTimeHighestScore = 0;
      
      return stats;
    } catch (error) {
      console.error("Error extracting Hall of Fame stats:", error);
      return stats;
    }
  };

  const fetchStats = useCallback(async (forceRefresh = false) => {
    try {
      // Fetch Hall of Fame data instead of player stats
      const summaryData = await cacheService.fetchSummaryData(forceRefresh);
      
      if (summaryData && summaryData.hallOfFame && Array.isArray(summaryData.hallOfFame)) {
        const stats = await calculateAllTimeStats(summaryData.hallOfFame);
        setAllTimeStats(stats);
      } else {
        console.error("Hall of Fame data not found");
      }
    } catch (error) {
      console.error("Error fetching Hall of Fame data:", error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for cache updates
  useEffect(() => {
    const removeListener = cacheService.onUpdate(() => {
      fetchStats(true); // Force refresh when cache updates
    });
    
    return () => removeListener();
  }, [fetchStats]);

  return (
    <section className="team-stats" id="team-stats">
      <h2 className="section-title">Legacy of Matches</h2>
      
      {/* All-time statistics from Hall of Fame data */}
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
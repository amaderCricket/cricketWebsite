// src/components/CricketStatsCalculator.tsx
import { useEffect, useState } from 'react';
import { cacheService } from '../../services/cacheService';

function CricketStatsCalculator() {
  const [isLoading, setIsLoading] = useState(true);
  const [calculatedStats, setCalculatedStats] = useState({
    totalMatches: 0,
    totalRunsScored: 0,
    totalBallsBowled: 0,
    allTimeHighestScore: 0,
    highestScorePlayer: ''
  });
  
  useEffect(() => {
    async function calculateStats() {
      try {
        setIsLoading(true);
        // console.log("-------------- CALCULATING CRICKET STATISTICS --------------");
        
        // Fetch players data
        const playersData = await cacheService.fetchPlayers();
        // console.log("Fetched players data for stats calculation:", playersData);
        
        if (!playersData.stats || !Array.isArray(playersData.stats) || playersData.stats.length < 2) {
          console.error("Invalid player stats data format");
          setIsLoading(false);
          return;
        }
        
        // Get headers to find column indices
        const headers = playersData.stats[0];
        // console.log("Stats headers:", headers);
        
        // Find the indices of the required columns
        const matchesIndex = findColumnIndex(headers, ['Matches', 'matches']);
        const runsIndex = findColumnIndex(headers, ['Runs Scored', 'runs scored', 'runs']);
        const ballsBowledIndex = findColumnIndex(headers, ['Balls Bowled', 'balls bowled']);
        const highestScoreIndex = findColumnIndex(headers, ['Highest Score', 'highest score']);
        const playerNameIndex = findColumnIndex(headers, ['Player Name', 'player name', 'name']);
        
        // console.log("Column indices found:", {
        //   matches: matchesIndex,
        //   runs: runsIndex,
        //   ballsBowled: ballsBowledIndex,
        //   highestScore: highestScoreIndex,
        //   playerName: playerNameIndex
        // });
        
        // Extract stats data
        const dataRows = playersData.stats.slice(1); // Skip header row
        
        // Calculate stats
        let maxMatches = 0;
        let totalRuns = 0;
        let totalBallsBowled = 0;
        let maxHighScore = 0;
        let highScorePlayer = '';
        
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
                // Get player name if available
                if (playerNameIndex !== -1 && row[playerNameIndex] !== undefined) {
                  highScorePlayer = String(row[playerNameIndex]);
                }
              }
            }
          }
        }
        
        // Store calculated stats
        const calculatedStats = {
          totalMatches: maxMatches,
          totalRunsScored: totalRuns,
          totalBallsBowled: totalBallsBowled,
          allTimeHighestScore: maxHighScore,
          highestScorePlayer: highScorePlayer
        };
        
        setCalculatedStats(calculatedStats);
        
        // // Log the calculated stats
        // console.log("-------------- CALCULATED CRICKET STATISTICS --------------");
        // console.log("Total Matches (highest value):", maxMatches);
        // console.log("Total Runs Scored (sum):", totalRuns);
        // console.log("Total Balls Bowled (sum):", totalBallsBowled);
        // console.log("All Time Highest Score:", maxHighScore);
        // if (highScorePlayer) {
        //   console.log("Highest Score by:", highScorePlayer);
        // }
        // console.log("----------------------------------------------------------");
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error calculating stats:", error);
        setIsLoading(false);
      }
    }
    
    calculateStats();
  }, []);
  
  // Helper to find column index in header row
  const findColumnIndex = (headers: Array<string | number>, possibleNames: string[]): number => {
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
    return -1; // Not found
  };
  
  return (
    <div style={{
      padding: '20px',
      margin: '20px 0',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      {isLoading ? (
        <div>
          <h3>Calculating cricket statistics...</h3>
          <p>Check console for detailed logs</p>
        </div>
      ) : (
        <div>
          <h3>Cricket Statistics</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            margin: '1rem 0',
            textAlign: 'center'
          }}>
            <div>
              <h4>Total Matches</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{calculatedStats.totalMatches}</p>
            </div>
            <div>
              <h4>Total Runs Scored</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{calculatedStats.totalRunsScored}</p>
            </div>
            <div>
              <h4>Total Balls Bowled</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{calculatedStats.totalBallsBowled}</p>
            </div>
            <div>
              <h4>Highest Score</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{calculatedStats.allTimeHighestScore}</p>
              {calculatedStats.highestScorePlayer && (
                <p style={{ fontSize: '0.9rem' }}>by {calculatedStats.highestScorePlayer}</p>
              )}
            </div>
          </div>
          <p>All calculations logged to console</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2D7783',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Recalculate Stats
          </button>
        </div>
      )}
    </div>
  );
}

export default CricketStatsCalculator;
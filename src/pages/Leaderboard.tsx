// Updated Leaderboard.tsx with 9 tables in 3 rows (4+4+1 layout)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cacheService } from '../services/cacheService';
import Preloader from '../components/common/PreLoader';
import { AnimatePresence } from 'framer-motion';
import { getPlayerImage } from '../utils/imageUtils';

interface LeaderboardPlayer {
  name: string;
  score: number | string;
  rank: number;
}

interface LeaderboardTable {
  title: string;
  icon: string;
  players: LeaderboardPlayer[];
}

function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTables, setAllTables] = useState<LeaderboardTable[]>([]);
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});

  // Define all 9 tables with their configurations
  const tableConfigs = [
    { name: "Leading Run Scorers", icon: "sports_cricket", startRow: 1, endRow: 10, startCol: 0, endCol: 2 },
    { name: "Leading Wicket Takers", icon: "sports_baseball", startRow: 1, endRow: 10, startCol: 4, endCol: 6 },
    { name: "High Scores", icon: "emoji_events", startRow: 1, endRow: 10, startCol: 8, endCol: 10 },
    { name: "Best Bowling Figures", icon: "track_changes", startRow: 1, endRow: 10, startCol: 12, endCol: 14 },
    { name: "Most Fours", icon: "sports_tennis", startRow: 1, endRow: 10, startCol: 16, endCol: 18 },
    { name: "Highest Batting Average", icon: "trending_up", startRow: 14, endRow: 23, startCol: 0, endCol: 2 },
    { name: "Highest Strike Rate", icon: "speed", startRow: 14, endRow: 23, startCol: 4, endCol: 6 },
    { name: "Best Economy", icon: "shield", startRow: 14, endRow: 23, startCol: 8, endCol: 10 },
    { name: "Most 30s Scored", icon: "stars", startRow: 14, endRow: 23, startCol: 12, endCol: 14 }
  ];

  const fetchLeaderboardData = async (forceRefresh = false) => {
    try {
      if (!allTables.length && !forceRefresh) {
        setLoading(true);
      }
      
      const summaryData = await cacheService.fetchSummaryData(forceRefresh);
      const data = summaryData.leaderboards;
      
      if (data && Array.isArray(data)) {
        const extractedTables: LeaderboardTable[] = [];
        
        // Extract each table according to its configuration
        tableConfigs.forEach((config) => {
          const tableData: LeaderboardPlayer[] = [];
          
          for (let row = config.startRow; row <= config.endRow; row++) {
            if (data[row]) {
              const rank = data[row][config.startCol];
              const name = data[row][config.startCol + 1];
              const score = data[row][config.startCol + 2];
              
              if (rank && name && score !== undefined) {
                tableData.push({
                  rank: Number(rank),
                  name: String(name).trim(),
                  score: score
                });
              }
            }
          }
          
          extractedTables.push({
            title: config.name,
            icon: config.icon,
            players: tableData
          });
        });
        
        setAllTables(extractedTables);
        
        // Load player images for all players
        const allPlayers = extractedTables.flatMap(table => table.players);
        await loadPlayerImages(allPlayers);
        
      } else {
        setError('Leaderboard data not found');
      }
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      if (!allTables.length && !forceRefresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const removeListener = cacheService.onUpdate(() => {
      fetchLeaderboardData(true);
    });
    
    return () => removeListener();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlayerImages = async (players: LeaderboardPlayer[]) => {
    const images: Record<string, string> = {};
    
    for (const player of players) {
      try {
        const imageUrl = await cacheService.loadPlayerImage(player.name, getPlayerImage);
        images[player.name] = imageUrl;
      } catch (error) {
        console.error(`Error loading image for ${player.name}:`, error);
      }
    }
    
    setPlayerImages(images);
  };

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="container section">
          <AnimatePresence>
            {loading && <Preloader />}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <div className="container section">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  // Split tables into rows: 4 + 4 + 1
  const tableRows = [
    allTables.slice(0, 4),   // First 4 tables
    allTables.slice(4, 8),   // Next 4 tables  
    allTables.slice(8, 9)    // Last 1 table
  ];

  const formatScore = (score: number | string, tableTitle: string): string => {
    if (typeof score === 'number') {
      // For averages and rates, show 2 decimal places
      if (tableTitle.includes('Average') || tableTitle.includes('Rate') || tableTitle.includes('Economy')) {
        return score.toFixed(2);
      }
      // For whole numbers, show as is
      return Math.round(score).toString();
    }
    return String(score);
  };

  return (
    <div className="leaderboard-page">
      <div className="container">
        <h1 className="section-title">LEADERBOARD</h1>
        <p className="section-description">
          "Recognizing our top performers across all formats"
        </p>

        <div className="leaderboard-sections">
          {tableRows.map((row, rowIndex) => (
            <div key={rowIndex} className={`leaderboard-row row-${rowIndex + 1}`}>
              {row.map((table, tableIndex) => (
                <div key={tableIndex} className="category-section">
                  <div className="category-header">
                    <i className="material-icons category-icon">{table.icon}</i>
                    <h2 className="category-title">{table.title}</h2>
                  </div>
                  
                  <div className="table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th className="rank-column">#</th>
                          <th className="player-column">Player</th>
                          <th className="score-column">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.players.map((player, playerIndex) => (
                          <tr key={playerIndex} className="player-row">
                            <td className="rank-cell">
                              <div className={`rank-badge ${player.rank <= 3 ? `top-${player.rank}` : ''}`}>
                                {player.rank}
                              </div>
                            </td>
                            <td className="player-cell">
                              <Link to={`/players/${player.name}`} className="player-link">
                                <div className="player-info">
                                  <div 
                                    className="player-image"
                                    style={{ backgroundImage: `url(${playerImages[player.name]})` }}
                                  />
                                  <span className="player-name">{player.name}</span>
                                </div>
                              </Link>
                            </td>
                            <td className="score-cell">
                              <span className="score-value">
                                {formatScore(player.score, table.title)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="notes-section">
          <div className="note-item">
            <i className="material-icons">info_outline</i>
            <p>Rankings are based on overall performance throughout the season.</p>
          </div>
          <div className="note-item">
            <i className="material-icons">trending_up</i>
            <p>Top 10 players in each category are displayed.</p>
          </div>
          <div className="note-item">
            <i className="material-icons">star</i>
            <p>* Minimum 25 matches played for batting and bowling averages.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
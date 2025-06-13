// src/pages/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cacheService } from '../services/cacheService';
import Preloader from '../components/common/PreLoader';
import { AnimatePresence } from 'framer-motion';
import { getPlayerImage } from '../utils/imageUtils';

interface LeaderboardPlayer {
  name: string;
  runs?: number;
  wickets?: number;
  rank: number;
  image?: string;
}

interface CategoryType {
  title: string;
  icon: string;
  dataKey: 'runs' | 'wickets';
  scoreLabel: string;
}

interface PlayersData {
  stats: Array<Array<string | number>>;
  [key: string]: unknown;
}

function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runScorers, setRunScorers] = useState<LeaderboardPlayer[]>([]);
  const [wicketTakers, setWicketTakers] = useState<LeaderboardPlayer[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});

  // Categories with Material icons
  const categories: CategoryType[] = [
    { 
      title: 'Top Run Scorers', 
      icon: 'sports_cricket',
      dataKey: 'runs',
      scoreLabel: 'Runs'
    },
    { 
      title: 'Top Wicket Takers', 
      icon: 'sports_baseball',
      dataKey: 'wickets',
      scoreLabel: 'Wickets'
    }
  ];

 const fetchLeaderboardData = async (forceRefresh = false) => {
    try {
      if (!runScorers.length && !wicketTakers.length && !forceRefresh) {
      setLoading(true);
    }
      
      // Fetch players data - now with the forceRefresh parameter
      const playersData = await cacheService.fetchPlayers(forceRefresh) as PlayersData;
      
      if (playersData && playersData.stats && Array.isArray(playersData.stats)) {
        const headers = playersData.stats[0];
        
        // Find column indices
        const nameIndex = headers.findIndex(
          (header: string | number) => typeof header === 'string' && 
            header.toLowerCase().includes('name')
        );
        
        const runsIndex = headers.findIndex(
          (header: string | number) => typeof header === 'string' && 
            (header.toLowerCase().includes('runs scored') || header.toLowerCase() === 'runs')
        );
        
        const wicketsIndex = headers.findIndex(
          (header: string | number) => typeof header === 'string' && 
            header.toLowerCase().includes('wicket')
        );
        
        if (nameIndex !== -1) {
          const playerData = playersData.stats.slice(1);
          
          // Process run scorers
          if (runsIndex !== -1) {
            const tempRunScorers: LeaderboardPlayer[] = playerData
              .filter((player: (string | number)[]) => player[nameIndex] && player[runsIndex])
              .map((player: (string | number)[]) => ({
                name: String(player[nameIndex]),
                runs: Number(player[runsIndex]) || 0,
                rank: 0
              }))
              .sort((a, b) => (b.runs || 0) - (a.runs || 0))
              .map((player, index) => ({ ...player, rank: index + 1 }))
              .slice(0, 10);
            
            setRunScorers(tempRunScorers);
          }
          
          // Process wicket takers
          if (wicketsIndex !== -1) {
            const tempWicketTakers: LeaderboardPlayer[] = playerData
              .filter((player: (string | number)[]) => player[nameIndex] && player[wicketsIndex])
              .map((player: (string | number)[]) => ({
                name: String(player[nameIndex]),
                wickets: Number(player[wicketsIndex]) || 0,
                rank: 0
              }))
              .sort((a, b) => (b.wickets || 0) - (a.wickets || 0))
              .map((player, index) => ({ ...player, rank: index + 1 }))
              .slice(0, 10);
            
            setWicketTakers(tempWicketTakers);
            
            // Load player images
            await loadPlayerImages([...runScorers, ...tempWicketTakers]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data');
    } finally {
       if (!runScorers.length && !wicketTakers.length && !forceRefresh) {
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
      // console.log("Leaderboard: Cache update detected, refreshing data");
      fetchLeaderboardData(true); // Now we can call this with forceRefresh=true
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

  const handleSort = (data: LeaderboardPlayer[], key: 'runs' | 'wickets') => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    
    const sorted = [...data].sort((a, b) => {
      const aValue = key === 'runs' ? (a.runs || 0) : (a.wickets || 0);
      const bValue = key === 'runs' ? (b.runs || 0) : (b.wickets || 0);
      
      return newOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    
    // Update ranks after sorting
    const withRanks = sorted.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
    
    if (key === 'runs') {
      setRunScorers(withRanks);
    } else {
      setWicketTakers(withRanks);
    }
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

  const getPlayerData = (categoryIndex: number) => {
    return categoryIndex === 0 ? runScorers : wicketTakers;
  };

  return (
    <div className="leaderboard-page">
      <div className="container">
        <h1 className="section-title">LEADERBOARD</h1>
        <p className="section-description">
          "Recognizing our top performers across all formats"
        </p>

        <div className="leaderboard-sections">
          {categories.map((category, index) => {
            const players = getPlayerData(index);
            
            return (
              <div key={index} className="category-section">
                <div className="category-header">
                  <i className="material-icons category-icon">{category.icon}</i>
                  <h2 className="category-title">{category.title}</h2>
                </div>
                
                <div className="table-wrapper">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="rank-column">#</th>
                        <th className="player-column">Player</th>
                        <th 
                          className="score-column sortable"
                          onClick={() => handleSort(players, category.dataKey)}
                        >
                          {category.scoreLabel}
                          <i className="material-icons sort-icon">
                            {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                          </i>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player, playerIndex) => (
                        <tr 
                          key={playerIndex}
                          className="player-row"
                        >
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
                              {category.dataKey === 'runs' ? player.runs : player.wickets}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
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
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
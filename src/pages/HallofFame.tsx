// src/pages/HallOfFame.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cacheService } from '../services/cacheService';
import Preloader from '../components/common/PreLoader';
import { AnimatePresence } from 'framer-motion';
import { getPlayerImage } from '../utils/imageUtils';

interface CategoryType {
  title: string;
  icon: string;
  isShame?: boolean;
}

interface AchievementItem {
  criteria: string;
  playerName: string;
  score: string;
  playerImage?: string;
}

function HallOfFame() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hallOfFameData, setHallOfFameData] = useState<string[][]>([]);
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // All achievements and shames based on your criteria
  const categories: CategoryType[] = [
    { title: 'Batting Excellence', icon: 'sports_cricket' },
    { title: 'Bowling Mastery', icon: 'sports_baseball' },
    { title: 'All-Round Glory', icon: 'stars' },
    { title: 'Legendary Records', icon: 'emoji_events' }
  ];

  // Criteria that are considered "Hall of Shame"
  const shameCriteria = [
    'Most Ducks',
    'Most Golden Ducks',
    'Most Dot balls Faced',
    'Most Penalty Taken',
    'Most Dismissals',
    'Most Runs Given',
    'Most 2s Given',
    'Most 4s Given',
    'Most Extras Given'
  ];
  
    const fetchHallOfFameData = useCallback(async (forceRefresh = false) =>{
    try {
        setLoading(true);
        const summaryData = await cacheService.fetchSummaryData(forceRefresh);
        
        if (summaryData && summaryData.hallOfFame && Array.isArray(summaryData.hallOfFame)) {
          const relevantData = summaryData.hallOfFame.slice(0, 19);
          setHallOfFameData(relevantData);
          
          // Load player images
          await loadPlayerImages(relevantData);
        } else {
          setError('Hall of Fame data not found or in unexpected format');
        }
      } catch (err) {
        console.error('Error fetching Hall of Fame data:', err);
        setError('Failed to load Hall of Fame data');
      } finally {
        setLoading(false);
      }
    }, []);


    useEffect(() => {
      const removeListener = cacheService.onUpdate(() => {
      // console.log("HallOfFame: Cache update detected, refreshing data");
      fetchHallOfFameData(true); // Force refresh
  });
      
      return () => removeListener();
    }, [fetchHallOfFameData]);


  useEffect(() => {
    fetchHallOfFameData();
  }, [fetchHallOfFameData]);

  const loadPlayerImages = async (data: string[][]) => {
    const images: Record<string, string> = {};
    
    for (let row = 1; row < data.length; row++) {
      for (let col = 1; col < data[row].length; col += 4) {
        const playerName = data[row][col];
        if (playerName && playerName !== '') {
          try {
            const imageUrl = await getPlayerImage({ 
              name: playerName, 
              playerNameForImage: playerName 
            });
            images[playerName] = imageUrl;
          } catch (error) {
            console.error(`Error loading image for ${playerName}:`, error);
          }
        }
      }
    }
    
    setPlayerImages(images);
  };

 const getCategoryData = (categoryIndex: number): AchievementItem[] => {
  const data: AchievementItem[] = [];
  const cols = getCategoryColumns(categoryIndex);
  const [criteriaCol, playerCol, scoreCol] = cols;
  
  for (let row = 1; row < hallOfFameData.length; row++) {
    if (hallOfFameData[row][criteriaCol] && hallOfFameData[row][criteriaCol] !== '') {
      // Special handling for Legendary Records (index 3)
      if (categoryIndex === 3) {
        data.push({
          criteria: hallOfFameData[row][criteriaCol],
          playerName: '', // No player for all-time stats
          score: hallOfFameData[row][playerCol], // Value is in the player column
          playerImage: ''
        });
      } else {
        // Regular handling for other categories
        data.push({
          criteria: hallOfFameData[row][criteriaCol],
          playerName: hallOfFameData[row][playerCol],
          score: hallOfFameData[row][scoreCol],
          playerImage: playerImages[hallOfFameData[row][playerCol]]
        });
      }
    }
  }
  
  return data;
};

  const getCategoryColumns = (categoryIndex: number) => {
    switch (categoryIndex) {
      case 0: return [0, 1, 2];
      case 1: return [4, 5, 6];
      case 2: return [8, 9, 10];
      case 3: return [12, 13, 14];
      default: return [0, 0, 0];
    }
  };

  const handlePlayerClick = (playerName: string) => {
    navigate(`/players/${playerName}`);
  };

  // Format score to 2 decimal places if it's a float
  const formatScore = (score: string): string => {
    const numericScore = parseFloat(score);
    if (isNaN(numericScore)) return score;
    
    // Check if it's a float
    if (numericScore % 1 !== 0) {
      return numericScore.toFixed(2);
    }
    
    return score;
  };

  // Check if criteria is a "shame"
  const isShame = (criteria: string): boolean => {
    return shameCriteria.some(shame => criteria.includes(shame));
  };

  if (loading) {
    return (
      <div className="hall-of-fame-page">
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
      <div className="hall-of-fame-page">
        <div className="container section">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hall-of-fame-page">
      <div className="container">
        <h1 className="section-title">HALL OF FAME</h1>
        <p className="section-description">
          "Celebrating the extraordinary achievements and memorable moments"
        </p>

        {/* First Row: Batting and Bowling side by side */}
        <div className="hall-of-fame-sections top-row">
          {categories.slice(0, 2).map((category, index) => {
            const achievements = getCategoryData(index);
            
            return (
              <div key={index} className="category-section">
                <div className="category-header">
                  <i className="material-icons category-icon">{category.icon}</i>
                  <h2 className="category-title">{category.title}</h2>
                </div>
                
                <div className="table-wrapper">
                  <table className="achievements-table">
                    <thead>
                      <tr>
                        <th className="rank-column">#</th>
                        <th className="criteria-column">Achievement</th>
                        <th className="player-column">Player</th>
                        <th className="score-column">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {achievements.map((achievement, achievementIndex) => (
                        <tr 
                          key={achievementIndex}
                          className={`achievement-row ${isShame(achievement.criteria) ? 'shame-row' : ''}`}
                          onClick={() => handlePlayerClick(achievement.playerName)}
                        >
                          <td className="rank-cell">
                            <div className={`rank-badge ${isShame(achievement.criteria) ? 'shame-badge' : ''}`}>
                              {achievementIndex + 1}
                            </div>
                          </td>
                          <td className="criteria-cell">
                            {achievement.criteria}
                          </td>
                          <td className="player-cell">
                            <div className="player-info">
                              <div 
                                className="player-image"
                                style={{ backgroundImage: `url(${achievement.playerImage})` }}
                              />
                              <span className="player-name">{achievement.playerName}</span>
                            </div>
                          </td>
                          <td className="score-cell">
                            <span className={`score-value ${isShame(achievement.criteria) ? 'shame-score' : ''}`}>
                              {formatScore(achievement.score)}
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

        {/* Second Row: All-Round and Legendary Records side by side */}
        <div className="hall-of-fame-sections bottom-row">
          {categories.slice(2).map((category, index) => {
            const achievements = getCategoryData(index + 2);
            
            // Special handling for Legendary Records (index 3)
            if (index + 2 === 3) {
              return (
                <div key={index + 2} className="category-section">
                  <div className="category-header">
                    <i className="material-icons category-icon">{category.icon}</i>
                    <h2 className="category-title">{category.title}</h2>
                  </div>
                  
                  <div className="table-wrapper">
                    <table className="achievements-table legendary-table">
                      <thead>
                        <tr>
                          <th className="stat-column">All-Time Statistic</th>
                          <th className="value-column"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {achievements.map((achievement, achievementIndex) => (
                          <tr key={achievementIndex} className="stat-row">
                            <td className="stat-cell">
                              <div className="stat-info">
                                <span className="stat-name">{achievement.criteria}</span>
                              </div>
                            </td>
                            <td className="value-cell">
                              <span className="stat-value">
                                {formatScore(achievement.score)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }
            
            // Regular rendering for All-Round Glory
            return (
              <div key={index + 2} className="category-section">
                <div className="category-header">
                  <i className="material-icons category-icon">{category.icon}</i>
                  <h2 className="category-title">{category.title}</h2>
                </div>
                
                <div className="table-wrapper">
                  <table className="achievements-table">
                    <thead>
                      <tr>
                        <th className="rank-column">#</th>
                        <th className="criteria-column">Achievement</th>
                        <th className="player-column">Player</th>
                        <th className="score-column">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {achievements.map((achievement, achievementIndex) => (
                        <tr 
                          key={achievementIndex}
                          className={`achievement-row ${isShame(achievement.criteria) ? 'shame-row' : ''}`}
                          onClick={() => handlePlayerClick(achievement.playerName)}
                        >
                          <td className="rank-cell">
                            <div className={`rank-badge ${isShame(achievement.criteria) ? 'shame-badge' : ''}`}>
                              {achievementIndex + 1}
                            </div>
                          </td>
                          <td className="criteria-cell">
                            {achievement.criteria}
                          </td>
                          <td className="player-cell">
                            <div className="player-info">
                              <div 
                                className="player-image"
                                style={{ backgroundImage: `url(${achievement.playerImage})` }}
                              />
                              <span className="player-name">{achievement.playerName}</span>
                            </div>
                          </td>
                          <td className="score-cell">
                            <span className={`score-value ${isShame(achievement.criteria) ? 'shame-score' : ''}`}>
                              {formatScore(achievement.score)}
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
            <p>Stats are recorded starting from 10/04/2025.</p>
          </div>
          <div className="note-item">
            <i className="material-icons">priority_high</i>
            <p>For ties, the player with the better overall rank is given preference.</p>
          </div>
          <div className="note-item">
            <i className="material-icons">warning</i>
            <p>Red highlighted entries represent "Hall of Shame" records.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HallOfFame;
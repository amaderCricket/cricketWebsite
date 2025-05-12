// src/pages/Players.tsx
import { Link } from 'react-router-dom'
import { usePlayerData } from '../hooks/usePlayerData';
import { useState, useEffect } from 'react';
import { getPlayerImage } from '../utils/imageUtils';
import { PlayerData } from '../types/playerTypes';
import Preloader from '../components/common/PreLoader';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from '../components/common/layout/AnimatedPage'
import { cacheService } from '../services/cacheService';

function Players() {
  const { players, loading, error, refreshData } = usePlayerData();
  const [playersWithImages, setPlayersWithImages] = useState<PlayerData[]>([]);

  // Function to determine player role based on the correct thresholds
  const determinePlayerRole = (playerData: PlayerData): string => {
    // Define thresholds as per your requirements
    const BATTING_RATING_THRESHOLD = 150; 
    const BOWLING_RATING_THRESHOLD = 50;
    
    // Check if player meets both criteria for an all-rounder
    if (playerData.battingRating >= BATTING_RATING_THRESHOLD && 
        playerData.bowlingRating >= BOWLING_RATING_THRESHOLD) {
      return 'All-Rounder';
    }
    
    // Check if player is primarily a batsman
    if (playerData.battingRating >= BATTING_RATING_THRESHOLD) {
      return 'Batsman';
    }
    
    // Check if player is primarily a bowler
    if (playerData.bowlingRating >= BOWLING_RATING_THRESHOLD) {
      return 'Bowler';
    }
    
    // When nothing meets the criteria, return N/A instead of a default
    return 'N/A';
  };


   useEffect(() => {
    // Subscribe to cache updates
    const removeListener = cacheService.onUpdate(() => {
      console.log("Players: Cache updated, refreshing data");
      refreshData(); // Refresh the players data when an update occurs
    });
    
    // Clean up listener on unmount
    return () => removeListener();
  }, [refreshData]);

  // Snippet for Players.tsx - update the useEffect for loading images:
  useEffect(() => {
    const loadImages = async () => {
      if (players.length > 0) {
        const updatedPlayers = await Promise.all(
          players.map(async (player) => {
            const imageUrl = await getPlayerImage({ 
              name: player.name, 
              playerNameForImage: player.playerNameForImage 
            });
            
            // Calculate the correct role using our threshold function
            const role = determinePlayerRole(player);
            
            // Add both the image URL and the calculated role
            return { ...player, imageUrl, role };
          })
        );
        setPlayersWithImages(updatedPlayers);
      }
    };
  
    loadImages();
  }, [players]);

  if (loading) {
    return (
      <div className="players-page">
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
      <div className="players-page">
        <div className="container section">
          <div className="error">Error loading player data: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage>
    <div className="players-page">
      <section className="section">
        <div className="container">
          <h1 className="section-title">Our Players</h1>
          <p className="section-subtitle"></p>
          
          <div className="players-grid">
            {playersWithImages.map(player => (
              <Link to={`/players/${player.name}`} key={player.name} className="player-card">
                <div className="player-image-container">
                <div 
                    className="player-image" 
                    style={{ backgroundImage: `url(${player.imageUrl})` }}
                ></div>
                <div className="player-rank-badge">Rank #{player.rank}</div>
                </div>
                <div className="player-info">
                  <h3 className="player-name">{player.name}</h3>
                  <p className="player-role">{player.role}</p>
                  <div className="player-stats">
                    <div className="stat">
                      <span className="stat-label">Highest</span>
                      <span className="stat-value">{player.highestScore && player.highestScore.split('(')[0]}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Bat Avg</span>
                      <span className="stat-value">{player.battingAverage.toFixed(1)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Wickets</span>
                      <span className="stat-value">{player.wicketsTaken}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
    </AnimatedPage>
  )
}

export default Players
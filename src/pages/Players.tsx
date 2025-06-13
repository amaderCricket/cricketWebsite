// src/pages/Players.tsx
import { Link } from 'react-router-dom'
import { usePlayerData } from '../hooks/usePlayerData';
import { useState, useEffect } from 'react';
import { getPlayerImage } from '../utils/imageUtils';
import { PlayerData } from '../types/playerTypes';
import AnimatedPage from '../components/common/layout/AnimatedPage'
import { cacheService } from '../services/cacheService';

// Empty placeholder component - no preloader
const EmptyPlaceholder = () => (
  <div className="players-page">
    <div className="container section" style={{ minHeight: '60vh' }}>
      {/* Intentionally empty */}
    </div>
  </div>
);

function Players() {
  const { players, loading, error, refreshData } = usePlayerData();
  const [playersWithImages, setPlayersWithImages] = useState<PlayerData[]>([]);
  const [imgLoaded, setImgLoaded] = useState<{[key: string]: boolean}>({});

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
      refreshData(); // Refresh the players data when an update occurs
    });
    
    // Clean up listener on unmount
    return () => removeListener();
  }, [refreshData]);

  // Manage image loading status
  const handleImageLoad = (playerName: string) => {
    setImgLoaded(prev => ({
      ...prev,
      [playerName]: true
    }));
  };

  // Snippet for Players.tsx - update the useEffect for loading images:
  useEffect(() => {
    // Store initial set of players with blank images
    const initialPlayers = players.map(player => ({
      ...player,
      imageUrl: '/src/assets/players/blank_image.png',
      role: determinePlayerRole(player)
    }));
    
    // Set the initial list immediately
    if (initialPlayers.length > 0) {
      setPlayersWithImages(initialPlayers);
    }
    
    // Then load real images in the background
    const loadImages = async () => {
      if (players.length === 0) return;
  
      const updatedPlayers = [...initialPlayers];
      
      // Process players in batches to prevent UI freeze
      for (let i = 0; i < players.length; i += 3) {
        const batch = players.slice(i, i + 3);
        
        // Process batch in parallel
        await Promise.all(batch.map(async (player, batchIndex) => {
          try {
            // Check localStorage cache first
           const imageUrl = await cacheService.loadPlayerImage(player.name, getPlayerImage);

          const index = i + batchIndex;
          if (index < updatedPlayers.length) {
            updatedPlayers[index].imageUrl = imageUrl;
            // Update state with this one loaded image
            setPlayersWithImages([...updatedPlayers]);
            handleImageLoad(player.name);
          }
          } catch (error) {
            console.error(`Error loading image for ${player.name}:`, error);
          }
        }));
        
        // Small delay between batches to let UI breathe
        if (i + 3 < players.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };
  
    loadImages();
  }, [players]);

  if (loading && players.length === 0) {
    return <EmptyPlaceholder />;
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
                    style={{ 
                        backgroundImage: `url(${player.imageUrl})`,
                        transition: 'opacity 0.3s ease-in',
                        opacity: imgLoaded[player.name] ? 1 : 0.5
                    }}
                    onLoad={() => handleImageLoad(player.name)}
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
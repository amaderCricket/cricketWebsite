// src/components/home/LastMatchCard.tsx
import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { fetchLastMatchData, LastMatchInfo, PlayerTeamInfo } from '../../services/matchDataService';
import { getPlayerImage } from '../../utils/imageUtils';
import { cacheService } from '../../services/cacheService';

// Enhanced interface to include individual stats
interface PlayerWithImage extends PlayerTeamInfo {
  imageUrl: string;
  runsScored?: number | string;
  ballsFaced?: number | string;
  dismissals?: number | string;
  runsGiven?: number | string;
  ballsBowled?: number | string;
  wicketsTaken?: number | string;
}

// Format player stats into a readable string
const formatPlayerStats = (player: PlayerWithImage): string => {
  let stats = '';
  
  // Batting stats
  if (player.runsScored !== undefined && player.ballsFaced !== undefined) {
    // Add asterisk for not out
    const notOut = player.dismissals === 0 || player.dismissals === '0';
    stats += `${player.runsScored}${notOut ? '*' : ''}(${player.ballsFaced})`;
  }
  
  // Bowling stats - only add if wickets were taken
  if (player.wicketsTaken !== undefined && 
      Number(player.wicketsTaken) > 0) {
    // Add separator if we already have batting stats
    if (stats) stats += ' ';
    stats += `/ W (${player.wicketsTaken})`;
  }
  
  return stats;
};

// Memoized player item component to prevent re-renders
const PlayerItem = memo(({ player }: { player: PlayerWithImage }) => {
  // Format the player stats
  const statsString = formatPlayerStats(player);
  
  return (
    <li className="player-item">
      <Link to={`/players/${player.playerName}`} className="player-link">
        <div 
          className="player-avatar"
          style={{ backgroundImage: `url(${player.imageUrl})` }}
        />
        <div className="player-info">
          <span className="player-name">{player.playerName}</span>
          {statsString && (
            <span className="player-match-stats">
              {statsString}
            </span>
          )}
          {player.isManOfMatch && (
            <span className="mom-badge">
              <i className="material-icons">star</i>
              MoM
            </span>
          )}
        </div>
      </Link>
    </li>
  );
});

PlayerItem.displayName = 'PlayerItem';

function LastMatchCard() {
  const [matchData, setMatchData] = useState<LastMatchInfo | null>(null);
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false); // Changed to false initially
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Memoize player lists with enhanced stats
  const { winnerPlayers, loserPlayers } = useMemo(() => {
    if (!matchData || !matchData.players) {
      return { winnerPlayers: [], loserPlayers: [] };
    }
    
    const winner = matchData.teams.find(team => team.result === 'Won');
    const loser = matchData.teams.find(team => team.result === 'Lost');
    
    if (!winner || !loser) {
      return { winnerPlayers: [], loserPlayers: [] };
    }
    
    // Create enhanced player objects with stats and image URLs
    const playersWithImgs = matchData.players.map((player): PlayerWithImage => ({
      ...player,
      imageUrl: playerImages[player.playerName] || '/src/assets/players/blank_image.png',
      runsScored: player.runsScored,
      ballsFaced: player.ballsFaced,
      dismissals: player.dismissals,
      runsGiven: player.runsGiven,
      ballsBowled: player.ballsBowled,
      wicketsTaken: player.wicketsTaken
    }));
    
    const winnerPlayersList = playersWithImgs.filter(player => 
      player.teams.includes(winner.teamName)
    );
    
    const loserPlayersList = playersWithImgs.filter(player => 
      player.teams.includes(loser.teamName)
    );
       
    return {
      winnerPlayers: winnerPlayersList,
      loserPlayers: loserPlayersList
    };
  }, [matchData, playerImages]);
  
  // Load match data
  useEffect(() => {
    // Get cached data immediately (don't set loading state)
    const loadCachedData = () => {
      const cachedDataString = localStorage.getItem('cached_last_match');
      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString);
          setMatchData(cachedData);
          return true;
        } catch (e) {
          console.error('Error parsing cached data:', e);
          return false;
        }
      }
      return false;
    };
    
    // Try to load cached data first
    const hasCachedData = loadCachedData();
    
    // Then fetch fresh data in background without showing loading state
    const loadFreshData = async () => {
      try {
        // Only show loading state if we don't have cached data
        if (!hasCachedData) {
          setIsLoading(true);
        }
        
        const data = await fetchLastMatchData(true);
        
        if (data) {
          localStorage.setItem('cached_last_match', JSON.stringify(data));
          setMatchData(data);
          setError(null);
        } else if (!hasCachedData) {
          // Only show error if we don't have cached data
          setError('No match data available');
        }
      } catch (err) {
        console.error('Error loading fresh match data:', err);
        if (!hasCachedData) {
          // Only show error if we don't have cached data
          setError('Failed to load match data');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFreshData();
    
    // Set up interval to periodically check for updates without showing loading state
    const refreshInterval = setInterval(() => {
      fetchLastMatchData(true)
        .then(freshData => {
          if (freshData) {
            localStorage.setItem('cached_last_match', JSON.stringify(freshData));
            setMatchData(freshData);
          }
        })
        .catch(err => {
          console.error('Error in periodic refresh:', err);
          // Don't update UI on background refresh errors
        });
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);
  
  // Load player images separately with lower priority
  useEffect(() => {
    if (!matchData || !matchData.players) return;
    
    const loadPlayerImages = async () => {
      for (let i = 0; i < matchData.players.length; i++) {
        const player = matchData.players[i];
        
        try {
          // USE NEW METHOD:
         const imageUrl = await cacheService.loadPlayerImage(player.playerName, getPlayerImage);
          
          setPlayerImages(prev => ({ 
            ...prev, 
            [player.playerName]: imageUrl 
          }));
          
        } catch (error) {
          console.error(`Error loading image:`, error);
        }
      }
    };
    
    // Start loading images after a short delay
    const timer = setTimeout(() => {
      loadPlayerImages();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [matchData]);
  
  // Manual refresh function for refresh button
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true); // Show small indicator only for manual refresh
      const data = await fetchLastMatchData(true);
      
      if (data) {
        localStorage.setItem('cached_last_match', JSON.stringify(data));
        setMatchData(data);
        setError(null);
      } else {
        setError('No match data available');
      }
    } catch (err) {
      console.error('Error refreshing match data:', err);
      setError('Failed to refresh match data');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Calculate run difference
  const calculateRunDifference = (winnerScore: string, loserScore: string): number => {
    try {
      const winnerRuns = parseInt(winnerScore.split('/')[0]);
      const loserRuns = parseInt(loserScore.split('/')[0]);
      return winnerRuns - loserRuns;
    } catch {
      return 0;
    }
  };
  
  // If we have an error and no data, show error state
  if ((error && !matchData) || (!matchData && !isLoading)) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Last Match</h2>
        <div className="last-match-error">
          <p>{error || 'No match data available'}</p>
          <button 
            onClick={handleRefresh}
            className="refresh-button"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--primaryColor)',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            {isRefreshing ? 'Refreshing...' : 'Try Again'}
          </button>
        </div>
      </section>
    );
  }
  
  // No data yet, but we're loading - show minimal UI
  if (!matchData && isLoading) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Last Match</h2>
        <div className="last-match-card" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--textSecondary)', fontStyle: 'italic' }}>Loading match information...</p>
        </div>
      </section>
    );
  }
  
  // We have data, render normally
  const winner = matchData?.teams.find(team => team.result === 'Won');
  const loser = matchData?.teams.find(team => team.result === 'Lost');
  
  if (!winner || !loser) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Last Match</h2>
        <div className="last-match-error">
          <p>Invalid match data</p>
          <button 
            onClick={handleRefresh}
            className="refresh-button"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--primaryColor)',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </section>
    );
  }
  
  return (
    <section className="last-match-section">
      <h2 className="section-title">
        Last Match
        <button 
          onClick={handleRefresh}
          className="refresh-icon"
          title="Refresh match data"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginLeft: '0.5rem',
            padding: '0.25rem',
            color: 'var(--primaryColor)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}
        >
          <i className="material-icons" style={{ 
            fontSize: '1.25rem', 
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none' 
          }}>
            {isRefreshing ? 'sync' : 'refresh'}
          </i>
        </button>
      </h2>
      
      <div className="last-match-card">
        {/* Match date */}
        <div className="match-date-header">
          <span className="date-label">Played on</span>
          <span className="date-value">{matchData ? formatDate(matchData.date) : 'N/A'}</span>
        </div>
        
        {/* Teams container */}
        <div className="teams-container">
          {/* Winner Team */}
          <div className="team-card winner">
            <div className="team-header">
              <h3 className="team-name">{winner.teamName}</h3>
              <div className="result-badge winner">
                <i className="material-icons">emoji_events</i>
                Won
              </div>
            </div>
            
            <div className="team-score">
              <span className="score">{winner.score}</span>
            </div>
            
            <div className="team-players">
              <h4>Players</h4>
              <ul>
                {winnerPlayers.map((player) => (
                  <PlayerItem key={player.playerName} player={player} />
                ))}
              </ul>
            </div>
          </div>
          
          {/* VS Divider */}
          <div className="vs-divider">
            <span>VS</span>
          </div>
          
          {/* Loser Team */}
          <div className="team-card loser">
            <div className="team-header">
              <h3 className="team-name">{loser.teamName}</h3>
              <div className="result-badge loser">
                Lost
              </div>
            </div>
            
            <div className="team-score">
              <span className="score">{loser.score}</span>
            </div>
            
            <div className="team-players">
              <h4>Players</h4>
              <ul>
                {loserPlayers.map((player) => (
                  <PlayerItem key={player.playerName} player={player} />
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Match summary */}
        <div className="match-summary">
          <p>
            <strong>{winner.teamName}</strong> won by{' '}
            <strong>{calculateRunDifference(winner.score, loser.score)} runs</strong>
          </p>
        </div>
      </div>
      
      <style >{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

export default LastMatchCard;
// src/components/home/LastMatchCard.tsx
import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { fetchLastMatchData, prefetchMatchData, LastMatchInfo, PlayerTeamInfo } from '../../services/matchDataService';
import { getPlayerImage } from '../../utils/imageUtils';
import Preloader from '../common/PreLoader';

interface PlayerWithImage extends PlayerTeamInfo {
  imageUrl: string;
}

// Memoized player item component to prevent re-renders
const PlayerItem = memo(({ player }: { player: PlayerWithImage }) => (
  <li className="player-item">
    <Link to={`/players/${player.playerName}`} className="player-link">
      <div 
        className="player-avatar"
        style={{ backgroundImage: `url(${player.imageUrl})` }}
      />
      <div className="player-info">
        <span className="player-name">{player.playerName}</span>
        {player.isManOfMatch && (
          <span className="mom-badge">
            <i className="material-icons">star</i>
            MoM
          </span>
        )}
      </div>
    </Link>
  </li>
));

PlayerItem.displayName = 'PlayerItem';

function LastMatchCard() {
  const [matchData, setMatchData] = useState<LastMatchInfo | null>(null);
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Memoize player lists - moved BEFORE any early returns
  const { winnerPlayers, loserPlayers } = useMemo(() => {
    if (!matchData || !matchData.players) {
      return { winnerPlayers: [], loserPlayers: [] };
    }
    
    const winner = matchData.teams.find(team => team.result === 'Won');
    const loser = matchData.teams.find(team => team.result === 'Lost');
    
    if (!winner || !loser) {
      return { winnerPlayers: [], loserPlayers: [] };
    }
    
    const playersWithImgs = matchData.players.map((player): PlayerWithImage => ({
      ...player,
      imageUrl: playerImages[player.playerName] || '/src/assets/players/blank_image.png'
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
    // Force refresh data when component mounts
    const loadMatchData = async () => {
      try {
        setLoading(true);
        // Always force a refresh when component mounts
        await prefetchMatchData();
        const data = await fetchLastMatchData(true);
        
        setMatchData(data);
      } catch (err) {
        console.error('Error loading match data:', err);
        setError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };
    
    loadMatchData();
    
    // Set up a periodic refresh every 30 minutes
    const refreshInterval = setInterval(() => {
      console.log('Refreshing match data (periodic refresh)...');
      fetchLastMatchData(true)
        .then(data => {
          if (data) {
            setMatchData(data);
          }
        })
        .catch(err => console.error('Error in periodic match data refresh:', err));
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);
  
  // Load player images separately with lower priority
  useEffect(() => {
    if (!matchData || !matchData.players) return;
    
    const loadPlayerImages = async () => {
      const images: Record<string, string> = {};
      
      // Load images progressively
      for (const player of matchData.players) {
        try {
          const imageUrl = await getPlayerImage({
            name: player.playerName,
            playerNameForImage: player.playerName
          });
          images[player.playerName] = imageUrl;
          setPlayerImages(prev => ({ ...prev, [player.playerName]: imageUrl }));
        } catch (error) {
          console.error(`Error loading image for ${player.playerName}:`, error);
        }
      }
    };
    
    // Start loading images after a short delay
    setTimeout(() => {
      loadPlayerImages();
    }, 100);
  }, [matchData]);
  
  // Manual refresh function for refresh button
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const data = await fetchLastMatchData(true);
      setMatchData(data);
      setError(null);
    } catch (err) {
      console.error('Error refreshing match data:', err);
      setError('Failed to refresh match data');
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Last Match</h2>
        <div className="last-match-loading">
          <Preloader/>
        </div>
      </section>
    );
  }
  
  if (error || !matchData) {
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
            Try Again
          </button>
        </div>
      </section>
    );
  }
  
  const winner = matchData.teams.find(team => team.result === 'Won');
  const loser = matchData.teams.find(team => team.result === 'Lost');
  
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
            Refresh Data
          </button>
        </div>
      </section>
    );
  }
  
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
          <i className="material-icons" style={{ fontSize: '1.25rem' }}>refresh</i>
        </button>
      </h2>
      
      <div className="last-match-card">
        {/* Match date */}
        <div className="match-date-header">
          <span className="date-label">Played on</span>
          <span className="date-value">{formatDate(matchData.date)}</span>
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
    </section>
  );
}

// Helper function to calculate run difference
function calculateRunDifference(winnerScore: string, loserScore: string): number {
  try {
    const winnerRuns = parseInt(winnerScore.split('/')[0]);
    const loserRuns = parseInt(loserScore.split('/')[0]);
    return winnerRuns - loserRuns;
  } catch {
    return 0;
  }
}

export default LastMatchCard;
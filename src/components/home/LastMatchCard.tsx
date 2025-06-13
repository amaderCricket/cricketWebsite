// src/components/home/LastMatchCard.tsx
import { useEffect, useState, useMemo, memo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getPlayerImage } from '../../utils/imageUtils';
import { API_CONFIG } from '../../config/apiConfig';

// Enhanced interfaces for recent matches data
interface PlayerStats {
  playerName: string;
  runsScored?: number | string;
  ballsFaced?: number | string;
  dismissals?: number | string;
  runsGiven?: number | string;
  ballsBowled?: number | string;
  wicketsTaken?: number | string;
  isManOfMatch?: boolean;
  imageUrl: string;
}

interface TeamData {
  teamName: string;
  score: string;
  result: 'Won' | 'Lost';
  players: PlayerStats[];
}

interface MatchData {
  matchNo: number;
  teamA: TeamData;
  teamB: TeamData;
  mom: string;
  result: string;
}

interface PlayerWithImage extends PlayerStats {
  imageUrl: string;
}

// Format player stats for display
const formatPlayerStats = (player: PlayerWithImage): string => {
  let stats = '';
  
  // Batting stats first
  if (player.runsScored !== undefined && player.runsScored !== '') {
    stats += `${player.runsScored}`;
    // Add not out indicator if needed
    if (player.dismissals === '' || player.dismissals === undefined || player.dismissals === 0) {
      stats += '*';
    }
    stats += `(${player.ballsFaced || 0})`;
  }
  
  // Bowling stats - only add if wickets were taken
  if (player.wicketsTaken !== undefined && Number(player.wicketsTaken) > 0) {
    if (stats) stats += ', ';
    stats += `${player.wicketsTaken}-${player.runsGiven}`;
  }
  
  return stats;
};

// Memoized player item component
const PlayerItem = memo(({ player }: { player: PlayerWithImage }) => {
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
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // FIX 2: Add navigation timeout ref for debouncing
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch recent matches data
  const fetchRecentMatches = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isRefreshing) return;
    
    try {
      console.log('🔄 Starting fetchRecentMatches, forceRefresh:', forceRefresh);
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch(`${API_CONFIG.baseUrl}?type=recentmatches`);
      console.log('📡 API Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Raw API Response:', data);
      console.log('📈 Data keys available:', Object.keys(data));
      
      if (!data.stats || !Array.isArray(data.stats)) {
        console.error('❌ No stats array found. Data structure:', data);
        throw new Error('No stats array found in response');
      }

      console.log('📋 Stats array length:', data.stats.length);
      console.log('📋 First few rows:', data.stats.slice(0, 5));

      // Find header rows (they contain "Match No" in first column)
      const headerRows: number[] = [];
      data.stats.forEach((row: unknown[], index: number) => {
        if (row[0] === "Match No") {
          headerRows.push(index);
          console.log(`🎯 Found "Match No" header at row ${index}:`, row);
        }
      });

      console.log('📍 Header rows found at indices:', headerRows);

      if (headerRows.length === 0) {
        console.warn('⚠️ No "Match No" headers found. Searching for alternative patterns...');
        // Try to find any row that might be a match header
        data.stats.forEach((row: unknown[], index: number) => {
          if (row && row.length > 0) {
            console.log(`Row ${index}:`, row.slice(0, 3));
          }
        });
      }

      const extractedMatches: MatchData[] = [];

      // Extract each match (limit to 5 most recent)
      for (let i = 0; i < Math.min(headerRows.length, 5); i++) {
        const headerIndex = headerRows[i];
        const nextHeaderIndex = headerRows[i + 1] || data.stats.length;
        const matchRows = data.stats.slice(headerIndex, nextHeaderIndex);
        
        console.log(`🏏 Processing Match ${i + 1} (rows ${headerIndex} to ${nextHeaderIndex}):`);
        console.log('Match rows length:', matchRows.length);
        console.log('First 3 match rows:', matchRows.slice(0, 3));
        
        if (matchRows.length < 2) {
          console.warn(`⚠️ Skipping match ${i + 1} - insufficient rows`);
          continue;
        }

        // Extract match info from the data rows
        const matchInfo = extractMatchInfo(matchRows);
        console.log(`🎯 Extracted match info for Match ${i + 1}:`, matchInfo);
        
        if (matchInfo) {
          extractedMatches.push(matchInfo);
        } else {
          console.warn(`⚠️ Failed to extract match info for Match ${i + 1}`);
        }
      }

      console.log('✅ Total matches extracted:', extractedMatches.length);
      console.log('📋 Extracted matches:', extractedMatches);

      setMatches(extractedMatches);
      
      // Load player images for all players using the correct format
      const allPlayers = extractedMatches.flatMap(match => [
        ...match.teamA.players,
        ...match.teamB.players
      ]);
      
      console.log('👥 Loading images for players:', allPlayers.map(p => p.playerName));
      
      // Use the same pattern as other components in the project
      const imagePromises = allPlayers.map(async (player) => {
        const imageUrl = await getPlayerImage({ 
          name: player.playerName, 
          playerNameForImage: player.playerName 
        });
        return { name: player.playerName, url: imageUrl };
      });
      
      const imageResults = await Promise.all(imagePromises);
      const imageMap: Record<string, string> = {};
      imageResults.forEach(({ name, url }) => {
        imageMap[name] = url;
      });
      
      console.log('🖼️ Player images loaded:', Object.keys(imageMap));
      setPlayerImages(imageMap);

    } catch (err) {
      console.error('❌ Error fetching recent matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load match data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract match information from raw data rows
  const extractMatchInfo = (matchRows: unknown[][]): MatchData | null => {
    try {
      console.log('🔍 Starting extractMatchInfo with rows:', matchRows.length);
      console.log('🔍 First 5 rows for debugging:', matchRows.slice(0, 5));
      
      // Get match number from row 1 (since row 0 is header)
      const headerRow = matchRows[0];
      const dataRow = matchRows[1];
      console.log('📋 Header row:', headerRow);
      console.log('📊 Data row:', dataRow);
      
      const matchNo = dataRow ? dataRow[0] : 0;
      console.log('🎯 Extracted match number:', matchNo);

      // Extract team names from the actual team values, not the header
      // From your screenshot: Row 1 has "Abrar" in column B and "Shipun" in column G
      const teamAName = dataRow[1] || 'Team A';  // Actual team name from data row
      const teamBName = dataRow[6] || 'Team B';  // Actual team name from data row
      
      console.log('👥 Team names from data - A:', teamAName, 'B:', teamBName);

      // Extract players and their stats
      const teamAPlayers: PlayerStats[] = [];
      const teamBPlayers: PlayerStats[] = [];
      
      let mom = '';
      let result = '';

      // Process data rows (skip header row)
      for (let i = 1; i < matchRows.length; i++) {
        const row = matchRows[i];
        if (!row || row.length === 0) continue;

        console.log(`Row ${i}:`, row);

        // Get MoM from column L (index 11)
        if (i === 1 && row[11]) { // MoM is usually in the first data row
          mom = String(row[11]);
          console.log('⭐ Man of the Match found:', mom);
        }

        // Get result from column M (index 12) 
        if (i === 1 && row[12]) { // Result is usually in the first data row
          result = String(row[12]);
          console.log('🏆 Result found:', result);
        }

        // Extract Team A player data (columns B, C, D, E)
        // GENERALIZED: Extract from ALL rows including first data row
        if (i >= 1 && row[2] && typeof row[2] === 'string' && row[2].trim() !== '' && row[2] !== 'Player Name' && row[2] !== '#N/A') {
          const playerName = row[2].trim();
          console.log(`🔍 Team A - Row ${i}, Column C: "${playerName}"`);
          const player: PlayerStats = {
            playerName,
            runsScored: row[3] ? String(row[3]) : '',
            ballsFaced: '', // Not available in this format
            dismissals: '',
            runsGiven: '',
            ballsBowled: '',
            wicketsTaken: row[4] ? String(row[4]) : '',
            isManOfMatch: playerName === mom,
            imageUrl: ''
          };

          console.log(`👤 Added Team A player:`, player);
          teamAPlayers.push(player);
        }

        // Extract Team B player data (columns G, H, I, J)
        // GENERALIZED: Extract from ALL rows including first data row
        if (i >= 1 && row[7] && typeof row[7] === 'string' && row[7].trim() !== '' && row[7] !== 'Player Name' && row[7] !== '#N/A') {
          const playerName = row[7].trim();
          console.log(`🔍 Team B - Row ${i}, Column H: "${playerName}"`);
          const player: PlayerStats = {
            playerName,
            runsScored: row[8] ? String(row[8]) : '',
            ballsFaced: '', // Not available in this format
            dismissals: '',
            runsGiven: '',
            ballsBowled: '',
            wicketsTaken: row[9] ? String(row[9]) : '',
            isManOfMatch: playerName === mom,
            imageUrl: ''
          };

          console.log(`👤 Added Team B player:`, player);
          teamBPlayers.push(player);
        }
      }

      console.log('👥 Team A players:', teamAPlayers.length, teamAPlayers);
      console.log('👥 Team B players:', teamBPlayers.length, teamBPlayers);

      // Determine winner and scores from result
      let teamAResult: 'Won' | 'Lost' = 'Lost';
      let teamBResult: 'Won' | 'Lost' = 'Lost';
      
      // Get team totals from first data row (columns F and K)
      const teamAScore = String(dataRow[5] || '0/0'); // Column F (Team Total)
      const teamBScore = String(dataRow[10] || '0/0'); // Column K (Team Total)

      if (result && result.toLowerCase().includes(String(teamAName).toLowerCase())) {
        teamAResult = 'Won';
        teamBResult = 'Lost';
      } else if (result && result.toLowerCase().includes(String(teamBName).toLowerCase())) {
        teamAResult = 'Lost';
        teamBResult = 'Won';
      }

      console.log('🏆 Results - Team A:', teamAResult, 'Team B:', teamBResult);
      console.log('📊 Scores - Team A:', teamAScore, 'Team B:', teamBScore);

      const finalMatch = {
        matchNo: Number(matchNo) || 0,
        teamA: {
          teamName: String(teamAName),
          score: teamAScore,
          result: teamAResult,
          players: teamAPlayers
        },
        teamB: {
          teamName: String(teamBName),
          score: teamBScore,
          result: teamBResult,
          players: teamBPlayers
        },
        mom,
        result
      };

      console.log('✅ Final extracted match:', finalMatch);
      return finalMatch;

    } catch (error) {
      console.error('❌ Error extracting match info:', error);
      return null;
    }
  };

  // FIX 2: Add debounced navigation function
  const debouncedSetIndex = useCallback((newIndex: number) => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    navigationTimeoutRef.current = setTimeout(() => {
      setCurrentMatchIndex(newIndex);
    }, 50);
  }, []);
    // FIX 1: Pre-compute all matches with images (replaces the heavy currentMatch useMemo)
  const enhancedMatches = useMemo(() => {
    if (!matches.length || !Object.keys(playerImages).length) return [];
    
    return matches.map(match => ({
      ...match,
      teamA: {
        ...match.teamA,
        players: match.teamA.players.map(player => ({
          ...player,
          imageUrl: playerImages[player.playerName] || '/default-avatar.png'
        }))
      },
      teamB: {
        ...match.teamB,
        players: match.teamB.players.map(player => ({
          ...player,
          imageUrl: playerImages[player.playerName] || '/default-avatar.png'
        }))
      }
    }));
  }, [matches, playerImages]); // Only recalculates when data changes, NOT on navigation

  // FIX 2: Update navigation controls to use debouncing
  const goToNextMatch = useCallback(() => {
    if (enhancedMatches.length <= 1) return;
    const newIndex = currentMatchIndex === enhancedMatches.length - 1 ? 0 : currentMatchIndex + 1;
    debouncedSetIndex(newIndex);
  }, [currentMatchIndex, enhancedMatches.length, debouncedSetIndex]);

  const goToPrevMatch = useCallback(() => {
    if (enhancedMatches.length <= 1) return;
    const newIndex = currentMatchIndex === 0 ? enhancedMatches.length - 1 : currentMatchIndex - 1;
    debouncedSetIndex(newIndex);
  }, [currentMatchIndex, enhancedMatches.length, debouncedSetIndex]);

  // Navigate to specific match - SIMPLIFIED
  const goToMatch = useCallback((index: number) => {
    if (index >= 0 && index < enhancedMatches.length) {
      debouncedSetIndex(index);
    }
  }, [enhancedMatches.length, debouncedSetIndex]);

  // FIX 3: Update useEffect to include cleanup
  useEffect(() => {
    console.log('🚀 Component mounted, fetching initial data...');
    fetchRecentMatches(true);
    
    // Cleanup navigation timeout on unmount
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

 



  // FIX 1: Simple access to current match (no heavy computation)
  const currentMatch = enhancedMatches[currentMatchIndex] || null;

  // Error state
  if (error && matches.length === 0) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Recent Matches</h2>
        <div className="last-match-error">
          <p>Error loading match data: {error}</p>

        </div>
      </section>
    );
  }

  // Loading state
  if (isLoading && matches.length === 0) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Recent Matches</h2>
        <div className="last-match-card" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--textSecondary)', fontStyle: 'italic' }}>Loading match information...</p>
        </div>
      </section>
    );
  }

  if (!currentMatch) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Recent Matches</h2>
        <div className="last-match-card" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--textSecondary)', fontStyle: 'italic' }}>No match data available</p>
        </div>
      </section>
    );
  }

  const winner = currentMatch.teamA.result === 'Won' ? currentMatch.teamA : currentMatch.teamB;
  const loser = currentMatch.teamA.result === 'Lost' ? currentMatch.teamA : currentMatch.teamB;

  return (
    <section className="last-match-section">
      <h2 className="section-title">
        Recent Matches

      </h2>

      <div className="match-navigation">
        {/* Previous button */}
        <button 
          onClick={goToPrevMatch}
          className="nav-button prev"
          disabled={matches.length <= 1}
          title="Previous match"
        >
          <i className="material-icons">chevron_left</i>
        </button>

        {/* Match indicators */}
        {matches.length > 1 && (
          <div className="match-indicators">
            {matches.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentMatchIndex ? 'active' : ''}`}
                onClick={() => goToMatch(index)}
                title={`Match ${matches[index]?.matchNo || index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Next button */}
        <button 
          onClick={goToNextMatch}
          className="nav-button next"
          disabled={matches.length <= 1}
          title="Next match"
        >
          <i className="material-icons">chevron_right</i>
        </button>
      </div>
      
      <div className="last-match-card">
        {/* Match info header */}
        <div className="match-date-header">
          <span className="date-label">Match #{currentMatch.matchNo}</span>
          <span className="date-value">{currentMatch.result}</span>
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
                {winner.players.map((player) => (
                  <PlayerItem key={player.playerName} player={player as PlayerWithImage} />
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
                {loser.players.map((player) => (
                  <PlayerItem key={player.playerName} player={player as PlayerWithImage} />
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Match summary */}
        <div className="match-summary">
          <p>
            <strong>{currentMatch.mom}</strong> was the Man of the Match
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .match-navigation {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .nav-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 2px solid var(--borderColor);
          background: var(--surfaceColor);
          border-radius: 50%;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          color: var(--textPrimary);
        }

        .nav-button:hover:not(:disabled) {
          border-color: var(--primaryColor);
          background: var(--primaryColor);
          color: white;
        }

        .nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        [data-theme="dark"] .nav-button {
          border-color: var(--borderColor);
          background: var(--backgroundColor);
        }

        [data-theme="dark"] .nav-button:hover:not(:disabled) {
          border-color: var(--accentColor);
          background: var(--accentColor);
        }

        .match-indicators {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .match-indicators .indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--borderColor);
          background: transparent;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .match-indicators .indicator.active {
          background: var(--primaryColor);
          border-color: var(--primaryColor);
        }

        .match-indicators .indicator:hover {
          border-color: var(--primaryColor);
        }

        [data-theme="dark"] .match-indicators .indicator.active {
          background: var(--accentColor);
          border-color: var(--accentColor);
        }

        [data-theme="dark"] .match-indicators .indicator:hover {
          border-color: var(--accentColor);
        }
      `}</style>
    </section>
  );
}

export default LastMatchCard;
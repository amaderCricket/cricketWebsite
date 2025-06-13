import React, { useState, useEffect } from 'react';

import { API_CONFIG } from '../../config/apiConfig';

interface MatchData {
  matchNo: number;
  teamA: {
    name: string;
    total: string;
    players: Array<{
      name: string;
      runs: string;
      wickets: string;
    }>;
  };
  teamB: {
    name: string;
    total: string;
    players: Array<{
      name: string;
      runs: string;
      wickets: string;
    }>;
  };
  mom: string;
  result: string;
}

interface PlayerWithImage {
  name: string;
  runs: string;
  wickets: string;
  imageUrl: string;
  isManOfMatch: boolean;
}

const PlayerItem: React.FC<{ player: PlayerWithImage }> = ({ player }) => {
  return (
    <li className="player-item">
      <div className="player-link">
        <div 
          className="player-avatar"
          style={{ backgroundImage: `url(${player.imageUrl})` }}
        />
        <div className="player-info">
          <span className="player-name">{player.name}</span>
          {player.isManOfMatch && (
            <span className="mom-badge">
              <i className="material-icons">star</i>
              MoM
            </span>
          )}
        </div>
        <div className="player-match-stats">
          {player.runs}, {player.wickets}
        </div>
      </div>
    </li>
  );
};

const MatchCard: React.FC<{ match: MatchData; playerImages: Record<string, string> }> = ({ match, playerImages }) => {
  // Determine which team batted first based on result
  const isTeamAWinner = match.result.toLowerCase().includes(match.teamA.name.toLowerCase());
  const teamABattedFirst = match.result.includes('wickets'); // If won by wickets, the winning team batted second
  
  const leftTeam = teamABattedFirst ? match.teamA : match.teamB;
  const rightTeam = teamABattedFirst ? match.teamB : match.teamA;
  
  const leftPlayers: PlayerWithImage[] = leftTeam.players.map(player => ({
    ...player,
    imageUrl: playerImages[player.name] || '/src/assets/players/blank_image.png',
    isManOfMatch: player.name === match.mom
  }));
  
  const rightPlayers: PlayerWithImage[] = rightTeam.players.map(player => ({
    ...player,
    imageUrl: playerImages[player.name] || '/src/assets/players/blank_image.png',
    isManOfMatch: player.name === match.mom
  }));

  // Calculate match date (you can modify this logic based on your data)
  const matchDate = new Date().toLocaleDateString(); // Placeholder

  return (
    <div className="last-match-card">
      {/* Match date header */}
      <div className="match-date-header">
        <span className="date-label">Played on</span>
        <span className="date-value">{matchDate}</span>
      </div>
      
      {/* Teams Container */}
      <div className="teams-container">
        {/* Left Team */}
        <div className={`team-card ${(teamABattedFirst ? isTeamAWinner : !isTeamAWinner) ? 'winner' : 'loser'}`}>
          <div className="team-header">
            <h3 className="team-name">{leftTeam.name}</h3>
            {(teamABattedFirst ? isTeamAWinner : !isTeamAWinner) && (
              <div className="result-badge winner">
                <i className="material-icons">emoji_events</i>
                Won
              </div>
            )}
            {!(teamABattedFirst ? isTeamAWinner : !isTeamAWinner) && (
              <div className="result-badge loser">
                Lost
              </div>
            )}
          </div>
          
          <div className="team-score">
            <span className="score">{leftTeam.total}</span>
          </div>
          
          <div className="team-players">
            <h4>Players</h4>
            <ul>
              {leftPlayers.map((player, idx) => (
                <PlayerItem key={idx} player={player} />
              ))}
            </ul>
          </div>
        </div>
        
        {/* VS Divider */}
        <div className="vs-divider">
          <span>VS</span>
        </div>
        
        {/* Right Team */}
        <div className={`team-card ${(teamABattedFirst ? !isTeamAWinner : isTeamAWinner) ? 'winner' : 'loser'}`}>
          <div className="team-header">
            <h3 className="team-name">{rightTeam.name}</h3>
            {(teamABattedFirst ? !isTeamAWinner : isTeamAWinner) && (
              <div className="result-badge winner">
                <i className="material-icons">emoji_events</i>
                Won
              </div>
            )}
            {!(teamABattedFirst ? !isTeamAWinner : isTeamAWinner) && (
              <div className="result-badge loser">
                Lost
              </div>
            )}
          </div>
          
          <div className="team-score">
            <span className="score">{rightTeam.total}</span>
          </div>
          
          <div className="team-players">
            <h4>Players</h4>
            <ul>
              {rightPlayers.map((player, idx) => (
                <PlayerItem key={idx} player={player} />
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Match summary */}
      <div className="match-summary">
        <p>
          <strong>{match.result}</strong>
        </p>
      </div>
    </div>
  );
};

const LastMatchCard: React.FC = () => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});

  // Fetch recent matches data
  const fetchRecentMatches = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_CONFIG.baseUrl}?type=recentmatches`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200) + '...');
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text that failed to parse:', responseText.substring(0, 100));
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!data.stats || !Array.isArray(data.stats)) {
        throw new Error('Invalid data format');
      }
      
      // Find header rows
      const headerRows: number[] = [];
      data.stats.forEach((row: (string | number)[], index: number) => {
        if (row[0] === "Match No") {
          headerRows.push(index);
        }
      });
      
      // Extract matches (limit to last 5)
      const extractedMatches: MatchData[] = [];
      headerRows.slice(0, 5).forEach((headerIndex, matchIndex) => {
        const nextHeaderIndex = headerRows[matchIndex + 1] || data.stats.length;
        const matchRows = data.stats.slice(headerIndex, nextHeaderIndex);
        
        const firstDataRow = matchRows[1];
        if (!firstDataRow) return;
        
        const matchInfo: MatchData = {
          matchNo: firstDataRow[0],
          teamA: {
            name: firstDataRow[1],
            total: firstDataRow[5],
            players: []
          },
          teamB: {
            name: firstDataRow[6], 
            total: firstDataRow[10],
            players: []
          },
          mom: firstDataRow[11],
          result: firstDataRow[12]
        };
        
        // Extract players
        for (let i = 1; i < matchRows.length; i++) {
          const row = matchRows[i];
          if (!row[2] || row[2] === "#N/A" || row[2] === "") continue;
          
          if (row[2]) {
            matchInfo.teamA.players.push({
              name: row[2],
              runs: row[3],
              wickets: row[4]
            });
          }
          
          if (row[7]) {
            matchInfo.teamB.players.push({
              name: row[7],
              runs: row[8],
              wickets: row[9] 
            });
          }
        }
        
        extractedMatches.push(matchInfo);
      });
      
      setMatches(extractedMatches);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setIsLoading(false);
    }
  };

  // Load player images
  useEffect(() => {
    const loadPlayerImages = async () => {
      const imageMap: Record<string, string> = {};
      const allPlayers = new Set<string>();
      
      matches.forEach(match => {
        match.teamA.players.forEach(p => allPlayers.add(p.name));
        match.teamB.players.forEach(p => allPlayers.add(p.name));
      });
      
      for (const playerName of allPlayers) {
        imageMap[playerName] = '/src/assets/players/blank_image.png';
      }
      
      setPlayerImages(imageMap);
    };
    
    if (matches.length > 0) {
      loadPlayerImages();
    }
  }, [matches]);

  useEffect(() => {
    fetchRecentMatches();
  }, []);

  const handlePrevMatch = () => {
    setCurrentMatchIndex(prev => (prev > 0 ? prev - 1 : matches.length - 1));
  };

  const handleNextMatch = () => {
    setCurrentMatchIndex(prev => (prev < matches.length - 1 ? prev + 1 : 0));
  };

  if (isLoading) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Recent Matches</h2>
        <div className="last-match-loading">
          <div className="spinner"></div>
          <div>Loading recent matches...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Recent Matches</h2>
        <div className="last-match-error">
          <div>Error: {error}</div>
        </div>
      </section>
    );
  }

  if (matches.length === 0) {
    return (
      <section className="last-match-section">
        <h2 className="section-title">Recent Matches</h2>
        <div className="last-match-loading">
          <div>No recent matches found</div>
        </div>
      </section>
    );
  }

  return (
    <section className="last-match-section">
      <h2 className="section-title">Recent Matches</h2>
      
      <div className="max-w-4xl">
        {/* Match Slider */}
        <div className="relative">
          <div className="overflow-hidden rounded-xl">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentMatchIndex * 100}%)` }}
            >
              {matches.map((match, index) => (
                <MatchCard key={index} match={match} playerImages={playerImages} />
              ))}
            </div>
          </div>
          
          {/* Navigation Arrows */}
          {matches.length > 1 && (
            <>
              <button
                onClick={handlePrevMatch}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-lg border hover:bg-gray-50 transition-colors"
                aria-label="Previous match"
              >
                
              </button>
              
              <button
                onClick={handleNextMatch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-lg border hover:bg-gray-50 transition-colors"
                aria-label="Next match"
              >
                
              </button>
            </>
          )}
        </div>
        
        {/* Match Indicators */}
        {matches.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {matches.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentMatchIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentMatchIndex 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to match ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LastMatchCard;
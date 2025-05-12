// src/components/player/PlayerForm.tsx
import React from 'react';

interface Match {
  'Runs Scored': string | number;
  'Wickets Taken': string | number;
  'Result': string;
  'Date': string;
}

interface PlayerFormProps {
  recentMatches: Match[];
}

const PlayerForm: React.FC<PlayerFormProps> = ({ recentMatches }) => {
  const getMatchResult = (match: Match) => {
    const runs = Number(match['Runs Scored'] || 0);
    const wickets = Number(match['Wickets Taken'] || 0);
    const result = match['Result'];
    
    let score = 0;
    if (runs >= 50 || wickets >= 3) score = 3;
    else if (runs >= 30 || wickets >= 2) score = 2;
    else if (runs >= 15 || wickets >= 1) score = 1;
    
    return {
      score,
      result,
      runs,
      wickets,
      date: match['Date'] ? new Date(match['Date']).toLocaleDateString() : 'Unknown'
    };
  };
  
  const recentFive = recentMatches.slice(-5).reverse();
  
  return (
    <div className="player-form">
      <h3>Recent Form</h3>
      <div className="form-indicators">
        {recentFive.map((match, index) => {
          const matchData = getMatchResult(match);
          const isGoodPerformance = matchData.score >= 2;
          const isWin = matchData.result === 'Won';
          
          return (
            <div 
              key={index} 
              className={`form-indicator ${isGoodPerformance ? 'good' : ''} ${isWin ? 'win' : 'loss'}`}
              title={`${matchData.date}: ${matchData.runs} runs, ${matchData.wickets} wickets`}
            >
              <div className="indicator-dot"></div>
              <div className="indicator-info">
                <span className="runs">{matchData.runs}</span>
                <span className="wickets">{matchData.wickets}w</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerForm;
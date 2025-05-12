// src/components/player/MatchModal.tsx

import { MatchData } from '../../types/playerTypes';

interface MatchModalProps {
  match: MatchData;
  index: number;
  openModalIndex: number | null;
  setOpenModalIndex: (index: number | null) => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ 
  match, 
  index, 
  openModalIndex, 
  setOpenModalIndex 
}) => {
  const expanded = openModalIndex === index;
  
  const toggleExpand = () => {
    if (expanded) {
      setOpenModalIndex(null);
    } else {
      setOpenModalIndex(index);
    }
  };
  
  const isManOfTheMatch = match['Man of the Match'] === 'Y' || 
    match['Man of the Match'] === match['Player Name'] ||
    (match['Man of the Match'] && String(match['Man of the Match']).toLowerCase() === 'yes');

  // Format date to remove time component
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Determine if it's a good performance
  const isHighScore = Number(match['Runs Scored'] || 0) >= 30;
  const isGoodBowling = Number(match['Wickets Taken'] || 0) >= 2;

  return (
    <div className={`match-item ${expanded ? 'expanded' : ''}`}>
      <div className="match-summary" onClick={toggleExpand}>
        <div className="match-header">
          <span className="match-number">Match #{index + 1}</span>
          <span className="match-date">{formatDate(match.Date as string)}</span>
        </div>
        <div className="match-stats">
          <span className={`match-runs ${isHighScore ? 'high-score' : ''}`}>
            Runs - {match['Runs Scored'] || 0}({match['Balls Faced'] || 0})
          </span>
          <span className={`match-wickets ${isGoodBowling ? 'good-bowling' : ''}`}>
            Wickets - {match['Wickets Taken'] || 0}
          </span>
          {isManOfTheMatch && (
            <span className="match-mom">
              <i className="material-icons">star</i>
              MoM
            </span>
          )}
        </div>
        <div className="arrow-icon">
          <i className="material-icons">
            keyboard_arrow_down
          </i>
        </div>
      </div>
      
      {expanded && (
        <div className="match-details">
          <div className="detail-columns">
            <div className="detail-column">
              <h4>Batting Performance</h4>
              <div className="detail-item">
                <span className="detail-label">Runs:</span>
                <span className={`detail-value ${isHighScore ? 'high-score' : ''}`}>
                  {match['Runs Scored'] || 0}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Balls Faced:</span>
                <span className="detail-value">{match['Balls Faced'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dismissals:</span>
                <span className="detail-value">{match['Dismissals'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dots Taken:</span>
                <span className="detail-value">{match['Dots Taken'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Twos Taken:</span>
                <span className="detail-value">{match['Twos Taken'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fours Taken:</span>
                <span className="detail-value">{match['Fours Taken'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Strike Rate:</span>
                <span className="detail-value">
                  {match['Balls Faced'] && Number(match['Balls Faced']) > 0 
                    ? ((Number(match['Runs Scored'] || 0) / Number(match['Balls Faced'])) * 100).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
            </div>
            
            <div className="detail-column">
              <h4>Bowling Performance</h4>
              <div className="detail-item">
                <span className="detail-label">Wickets:</span>
                <span className={`detail-value ${isGoodBowling ? 'good-bowling' : ''}`}>
                  {match['Wickets Taken'] || 0}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Runs Given:</span>
                <span className="detail-value">{match['Runs Given'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Balls Bowled:</span>
                <span className="detail-value">{match['Balls Bowled'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dots Given:</span>
                <span className="detail-value">{match['Dots Given'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Twos Given:</span>
                <span className="detail-value">{match['Twos Given'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fours Given:</span>
                <span className="detail-value">{match['Fours Given'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Economy:</span>
                <span className="detail-value">
                  {match['Balls Bowled'] && Number(match['Balls Bowled']) > 0 
                    ? ((Number(match['Runs Given'] || 0) / Number(match['Balls Bowled'])) * 6).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="match-footer">
            <div className="detail-item">
              <span className="detail-label">Match Score:</span>
              <span className="detail-value">{match['Match Score'] || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Result:</span>
              <span className={`detail-value ${match['Result'] === 'Won' ? 'won' : 'lost'}`}>
                {match['Result'] || 'N/A'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Team:</span>
              <span className="detail-value">{match['Team Name'] || 'N/A'}</span>
            </div>
            {isManOfTheMatch && (
            <div className="detail-item mom-badge">
              <span>
                <i className="material-icons">star</i>
                Man of the Match
              </span>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchModal;
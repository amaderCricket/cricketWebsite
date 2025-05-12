/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/PlayerDetail.tsx
import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell
} from 'recharts';
import { usePlayerData } from '../hooks/usePlayerData';
import { getPlayerImage } from '../utils/imageUtils';
import { PlayerData } from '../types/playerTypes';
import Preloader from '../components/common/PreLoader';
import { AnimatePresence } from 'framer-motion';
import { cacheService } from '../services/cacheService';
import MatchHistory from '../components/player/MatcHistory';

const currentTheme = document.documentElement.getAttribute('data-theme');
const isDarkTheme = currentTheme === 'dark';

// Define type for match data
interface MatchData {
  Date?: string;
  'Player Name'?: string;
  'Matches'?: number | string;
  'Runs Scored'?: number | string;
  'Balls Faced'?: number | string;
  'Dismissals'?: number | string;
  'Runs Given'?: number | string;
  'Balls Bowled'?: number | string;
  'Wickets Taken'?: number | string;
  'Dots Taken'?: number | string;
  'Singles Taken'?: number | string;
  'Twos Taken'?: number | string;
  'Fours Taken'?: number | string;
  'Penalty'?: number | string;
  'Dots Given'?: number | string;
  'Twos Given'?: number | string;
  'Fours Given'?: number | string;
  'Extras'?: number | string;
  'Hattricks'?: number | string;
  'Maidens'?: number | string;
  'Match Score'?: string;
  'Man of the Match'?: string;
  'Team Name'?: string;
  'Result'?: string;
  [key: string]: string | number | undefined;
}

// Define performance data type
interface PerformanceData {
  date: string;
  match: string;
  runs: number;
  balls: number;
  wickets: number;
  economy?: number | string;
}

// Define thresholds for determining good/bad stats
type ThresholdMetric = {
  good: number;
  bad: number;
};

type ThresholdCategory = {
  [key: string]: ThresholdMetric;
};

const THRESHOLDS: {
  batting: ThresholdCategory;
  bowling: ThresholdCategory;
  overall: ThresholdCategory;
} = {
  batting: {
    average: { good: 40, bad: 15 },
    strikeRate: { good: 120, bad: 80 },
    thirties: { good: 3, bad: 0 },
    fifties: { good: 1, bad: 0 },
    seventies: { good: 1, bad: 0 },
    ducks: { good: 0, bad: 1 },
    goldenDucks: { good: 0, bad: 1 },
    penalty: { good: 0, bad: 1 },
    boundaryPercentage: { good: 40, bad: 5 },
    dotsTaken: { good: 10, bad: 20 },
  },
  bowling: {
    average: { good: 25, bad: 40 },
    economy: { good: 6, bad: 8 },
    strikeRate: { good: 20, bad: 35 },
    threeWickets: { good: 1, bad: 0 },
    fiveWickets: { good: 1, bad: 0 },
    hattricks: { good: 1, bad: 0 },
    maidens: { good: 1, bad: 0 },
    extras: { good: 5, bad: 15 },
    dotsGiven: { good: 20, bad: 0 },
  },
  overall: {
    winPercentage: { good: 50, bad: 30 },
    momAwards: { good: 3, bad: 0 }
  }
};

function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const { players, loading: playersLoading, error: playersError } = usePlayerData();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [playerMatches, setPlayerMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'batting' | 'bowling' | 'overall'>('batting');

  useEffect(() => {
  // Only set up listener if we have a player ID and loaded player data
    if (id && player) {
      const removeListener = cacheService.onUpdate(() => {
        console.log("PlayerDetail: Cache update detected, refreshing data");
        loadPlayerMatches(id, true); // Force refresh with true parameter
      });
      
      return () => removeListener();
    }
  }, [id, player]);
  
  // Determine player role based on stats
  const determinePlayerRole = (playerData: PlayerData): string => {
    const BATTING_RATING_THRESHOLD = 150; 
    const BOWLING_RATING_THRESHOLD = 50;
    
    if (playerData.battingRating >= BATTING_RATING_THRESHOLD && 
        playerData.bowlingRating >= BOWLING_RATING_THRESHOLD) {
      return 'All-Rounder';
    }
    
    if (playerData.battingRating >= BATTING_RATING_THRESHOLD) {
      return 'Batsman';
    }
    
    if (playerData.bowlingRating >= BOWLING_RATING_THRESHOLD) {
      return 'Bowler';
    }
    
    return 'N/A';
  };
  
  // First find the player and set basic data
  useEffect(() => {
    if (!id) return;
    
    if (player && player.name === id && playerMatches.length === 0) {
      loadPlayerMatches(id);
      return;
    }
    
    if (!playersLoading && players.length > 0) {
      const foundPlayer = players.find(p => p.name === id);
      
      if (foundPlayer) {
        const playerRole = determinePlayerRole(foundPlayer);
        
        setPlayer({
          ...foundPlayer,
          role: playerRole
        });
        
        loadPlayerImageAndMatches(foundPlayer);
      } else {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, players, playersLoading]);
  
  // Function to load player image
  const loadPlayerImageAndMatches = useCallback(async (playerData: PlayerData) => {
    try {
      const imageUrl = await getPlayerImage({
        name: playerData.name,
        playerNameForImage: playerData.playerNameForImage
      });
      
      setPlayer(prevPlayer => {
        if (!prevPlayer) return null;
        return {
          ...prevPlayer,
          imageUrl
        };
      });
      
      loadPlayerMatches(playerData.name);
    } catch (error) {
      console.error("Error loading player image:", error);
      loadPlayerMatches(playerData.name);
    }
  }, []);
  
  // Load match data
  const loadPlayerMatches = async (playerName: string, forceRefresh = false) => {
    try {
      const playerDetails = await cacheService.fetchPlayerDetails(playerName, forceRefresh);
      
      
      if (playerDetails && playerDetails.matches && Array.isArray(playerDetails.matches)) {
        if (playerDetails.matches.length > 0) {
          const headerRow = playerDetails.matches[0]; 
          const headers = headerRow.map(item => String(item));
          
          const matchData = playerDetails.matches.slice(1).map((row: Array<string | number>) => {
            const match: MatchData = {};
            headers.forEach((header: string, index: number) => {
              match[header] = row[index];
            });
            return match;
          });
          
          setPlayerMatches(matchData);
          
          setPlayer(prevPlayer => {
            if (!prevPlayer) return null;
            
            const performanceData: PerformanceData[] = matchData.map(match => ({
              date: String(match['Date'] || 'Unknown'),
              match: match['Date'] ? new Date(String(match['Date'])).toLocaleDateString() : 'Unknown',
              runs: Number(match['Runs Scored'] || 0),
              balls: Number(match['Balls Faced'] || 0),
              wickets: Number(match['Wickets Taken'] || 0),
              economy: match['Balls Bowled'] && Number(match['Balls Bowled']) > 0 ? 
                (Number(match['Runs Given'] || 0) / Number(match['Balls Bowled']) * 6).toFixed(2) : 0
            }));
            
            return {...prevPlayer, performanceData};
          });
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading player matches:", error);
      setLoading(false);
    }
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.payload.color || entry.color || 'var(--textPrimary)' }}>
              {entry.name}: {entry.value}%
              {entry.payload.actualValue && ` (${entry.payload.actualValue})`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Function to determine stat quality
  const getStatQuality = (value: number, category: 'batting' | 'bowling' | 'overall', metric: string): 'good' | 'bad' | 'normal' => {
    const threshold = THRESHOLDS[category][metric];
    if (!threshold) return 'normal';
    
    // For stats where lower is better
    const lowerIsBetter = ['ducks', 'goldenDucks', 'penalty', 'extras', 'dotsTaken'].includes(metric) && category === 'batting' ||
                          ['economy', 'average', 'extras', 'dotsGiven'].includes(metric) && category === 'bowling';
     if (metric === 'penalty') {
    const absValue = Math.abs(value);
    if (absValue <= threshold.good) return 'good';
    if (absValue >= threshold.bad) return 'bad';
    return 'normal';
  }
    if (lowerIsBetter) {
      if (value <= threshold.good) return 'good';
      if (value >= threshold.bad) return 'bad';
    } else {
      if (value >= threshold.good) return 'good';
      if (value <= threshold.bad) return 'bad';
    }
    
    return 'normal';
  };

  // Calculate penalty from match data
  const calculateTotalPenalty = () => {
    if (!playerMatches || playerMatches.length === 0) return 0;
    
    return playerMatches.reduce((total, match) => {
      return total + Number(match['Penalty'] || 0);
    }, 0);
  };

  // Prepare data for radar chart
  const prepareRadarData = () => {
    if (!player) return [];
    
    return [
      {
        stat: 'Batting Avg',
        value: Math.round(player.battingAverage),
        fullMark: 50,
      },
      {
        stat: 'Strike Rate',
        value: Math.round(player.strikeRate),
        fullMark: 150,
      },
      {
        stat: 'Bowling Avg',
        value: Math.round(player.bowlingAverage),
        fullMark: 50,
      },
      {
        stat: 'Economy',
        value: parseFloat(player.economy.toFixed(1)),
        fullMark: 10,
      },
      {
        stat: 'Win %',
        value: Math.round(player.winPercentage),
        fullMark: 100,
      }
    ];
  };

  // Prepare data for pie chart (shot distribution)
  const prepareShotDistribution = () => {
    if (!player) return [];
    
    const total = player.dotsTaken + player.singlesTaken + player.twosTaken + player.foursTaken;
    if (total === 0) return []; // Avoid division by zero
    
    return [
      { 
        name: 'Dots', 
        value: Math.round((player.dotsTaken / total) * 100),
        actualValue: player.dotsTaken,
        color: '#FF6B6B' 
      },
      { 
        name: 'Singles', 
        value: Math.round((player.singlesTaken / total) * 100),
        actualValue: player.singlesTaken,
        color: '#4ECDC4' 
      },
      { 
        name: 'Twos', 
        value: Math.round((player.twosTaken / total) * 100),
        actualValue: player.twosTaken,
        color: '#45B7D1' 
      },
      { 
        name: 'Fours', 
        value: Math.round((player.foursTaken / total) * 100),
        actualValue: player.foursTaken,
        color: '#96CEB4' 
      }
    ];
  };
  
  if (playersLoading || loading) {
    return (
      <div className="player-detail-page">
        <div className="container section">
        <AnimatePresence>
          {loading && <Preloader />}
        </AnimatePresence>
        </div>
      </div>
    );
  }
  
  if (playersError) {
    return (
      <div className="player-detail-page">
        <div className="container section">
          <div className="error">Error loading player data: {playersError.message}</div>
        </div>
      </div>
    );
  }
  
  if (!player) {
    return (
      <div className="player-detail-page">
        <div className="container section">
          <div className="error">Player not found</div>
        </div>
      </div>
    );
  }
  
  const performanceData = player.performanceData || [];
  const radarData = prepareRadarData();
  const shotDistribution = prepareShotDistribution();
  
  return (
    <div className="player-detail-page">
      <div className="container">
        {/* Hero Section */}
        <section className="player-hero">
          <div className="hero-background">
            <div className="hero-pattern"></div>
          </div>
          <div className="hero-content">
            <div className="player-image-wrapper">
              <div 
                className="player-image" 
                style={{ backgroundImage: `url(${player.imageUrl || player.fallbackImageUrl})` }}
              />
              <div className="player-rank">#{player.rank}</div>
            </div>
            <div className="player-info">
              <h1 className="player-name">{player.name}</h1>
              <p className="player-role">{player.role}</p>
              <div className="player-quick-stats">
                <div className="quick-stat">
                  <span className="stat-value">{player.matches}</span>
                  <span className="stat-label">Matches</span>
                </div>
                <div className={`quick-stat ${getStatQuality(player.winPercentage, 'overall', 'winPercentage')}`}>
                  <span className="stat-value">{player.winPercentage.toFixed(1)}%</span>
                  <span className="stat-label">Win Rate</span>
                </div>
                <div className={`quick-stat ${getStatQuality(player.momAwards, 'overall', 'momAwards')}`}>
                  <span className="stat-value">{player.momAwards}</span>
                  <span className="stat-label">MoM Awards</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Overview */}
        <section className="performance-overview">
          <h2 className="section-title">Performance Overview</h2>
          <div className="overview-grid">
            <div className="overview-card radar-card">
              <h3>Player Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="stat" tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }} />
                   <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }}/>
                  <Radar
                    name={player.name}
                    dataKey="value"
                    stroke={isDarkTheme ? 'var(--accentColor)' : 'var(--primaryColor)'}
                    fill={isDarkTheme ? 'var(--accentColor)' : 'var(--primaryColor)'}
                    fillOpacity={0.6}
                  />
                  <Tooltip content={CustomTooltip}  contentStyle={{
                        fontFamily: 'var(--fontMono)',
                        backgroundColor: 'var(--surfaceColor)',
                        border: '1px solid var(--borderColor)'
                      }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="overview-card pie-card">
              <h3>Shot Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={shotDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({name, value}) => `${name} ${value.toFixed(1)}%`}
                    labelLine={false}
                    >
                    {shotDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={CustomTooltip}  contentStyle={{
                            fontFamily: 'var(--fontMono)',
                            backgroundColor: 'var(--surfaceColor)',
                            border: '1px solid var(--borderColor)'
                          }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Tabbed Statistics */}
        <section className="player-statistics">
          <div className="stats-tabs">
            <button 
              className={`tab-button ${selectedTab === 'batting' ? 'active' : ''}`}
              onClick={() => setSelectedTab('batting')}
            >
              Batting
            </button>
            <button 
              className={`tab-button ${selectedTab === 'bowling' ? 'active' : ''}`}
              onClick={() => setSelectedTab('bowling')}
            >
              Bowling
            </button>
            <button 
              className={`tab-button ${selectedTab === 'overall' ? 'active' : ''}`}
              onClick={() => setSelectedTab('overall')}
            >
              Overall
            </button>
          </div>

          <div className="tab-content">
            {selectedTab === 'batting' && (
              <div className="stats-content batting-stats">
                <div className="stats-grid">
                  {/* Row 1: Basic Stats */}
                  <div className="stat-card">
                    <div className="stat-value">{player.matches}</div>
                    <div className="stat-label">Matches</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.innings}</div>
                    <div className="stat-label">Innings</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.runsScored}</div>
                    <div className="stat-label">Runs</div>
                  </div>
                  <div className="stat-card highest-score-card">
                    <div className="stat-value">{player.highestScore}</div>
                    <div className="stat-label">Highest Score</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.battingAverage, 'batting', 'average')}`}>
                    <div className="stat-value">{player.battingAverage.toFixed(2)}</div>
                    <div className="stat-label">Average</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.strikeRate, 'batting', 'strikeRate')}`}>
                    <div className="stat-value">{player.strikeRate.toFixed(2)}</div>
                    <div className="stat-label">Strike Rate</div>
                  </div>
                  
                  {/* Row 2: Milestones */}
                  <div className={`stat-card ${getStatQuality(player.thirties, 'batting', 'thirties')}`}>
                    <div className="stat-value">{player.thirties}</div>
                    <div className="stat-label">30s</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.fifties, 'batting', 'fifties')}`}>
                    <div className="stat-value">{player.fifties}</div>
                    <div className="stat-label">50s</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.seventies, 'batting', 'seventies')}`}>
                    <div className="stat-value">{player.seventies}</div>
                    <div className="stat-label">70s</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.boundaryPercentage, 'batting', 'boundaryPercentage')}`}>
                    <div className="stat-value">{player.boundaryPercentage.toFixed(1)}%</div>
                    <div className="stat-label">Boundary %</div>
                  </div>
                  
                  {/* Row 3: Shot Distribution */}
                  <div className={`stat-card ${getStatQuality(player.dotsTaken, 'batting', 'dotsTaken')}`}>
                    <div className="stat-value">{player.dotsTaken}</div>
                    <div className="stat-label">Dots</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.singlesTaken}</div>
                    <div className="stat-label">Singles</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.twosTaken}</div>
                    <div className="stat-label">Twos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.foursTaken}</div>
                    <div className="stat-label">Fours</div>
                  </div>
                  
                  {/* Row 4: Negatives */}
                  <div className={`stat-card ${getStatQuality(calculateTotalPenalty(), 'batting', 'penalty')}`}>
                    <div className="stat-value">{calculateTotalPenalty()}</div>
                    <div className="stat-label">Penalty</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.ducks, 'batting', 'ducks')}`}>
                    <div className="stat-value">{player.ducks}</div>
                    <div className="stat-label">Ducks</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.goldenDucks, 'batting', 'goldenDucks')}`}>
                    <div className="stat-value">{player.goldenDucks}</div>
                    <div className="stat-label">Golden Ducks</div>
                  </div>
                </div>

                {/* Batting Performance Chart */}
                <div className="performance-chart">
                  <h3>Runs Progression</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primaryColor)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--primaryColor)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="match" angle={-45} textAnchor="end" height={60} tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }}  />
                      <YAxis  tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }}/>
                      <Tooltip content={CustomTooltip} />
                      <Area 
                        type="monotone" 
                        dataKey="runs" 
                        stroke="var(--primaryColor)" 
                        fillOpacity={1} 
                        fill="url(#runsGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedTab === 'bowling' && (
              <div className="stats-content bowling-stats">
                <div className="stats-grid">
                  {/* Row 1: Basic Bowling Stats */}
                  <div className="stat-card">
                    <div className="stat-value">{player.wicketsTaken}</div>
                    <div className="stat-label">Total Wickets</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.bowlingAverage, 'bowling', 'average')}`}>
                    <div className="stat-value">{player.bowlingAverage > 0 ? player.bowlingAverage.toFixed(2) : 'N/A'}</div>
                    <div className="stat-label">Average</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.economy, 'bowling', 'economy')}`}>
                    <div className="stat-value">{player.economy.toFixed(2)}</div>
                    <div className="stat-label">Economy</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.bowlingStrikeRate, 'bowling', 'strikeRate')}`}>
                    <div className="stat-value">{player.bowlingStrikeRate.toFixed(2)}</div>
                    <div className="stat-label">Strike Rate</div>
                  </div>
                  <div className="stat-card best-bowling-card">
                    <div className="stat-value">{player.bestBowling || 'N/A'}</div>
                    <div className="stat-label">Best Bowling</div>
                  </div>
                  
                  {/* Row 2: Additional Stats */}
                  <div className="stat-card">
                    <div className="stat-value">{player.runsGiven}</div>
                    <div className="stat-label">Runs Given</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.ballsBowled}</div>
                    <div className="stat-label">Balls Bowled</div>
                  </div>
                  
                  {/* Row 3: Performance Milestones */}
                  <div className={`stat-card ${getStatQuality(player.threeWickets, 'bowling', 'threeWickets')}`}>
                    <div className="stat-value">{player.threeWickets}</div>
                    <div className="stat-label">3W Hauls</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.fiveWickets, 'bowling', 'fiveWickets')}`}>
                    <div className="stat-value">{player.fiveWickets}</div>
                    <div className="stat-label">5W Hauls</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.hattricks, 'bowling', 'hattricks')}`}>
                    <div className="stat-value">{player.hattricks}</div>
                    <div className="stat-label">Hattricks</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.maidens, 'bowling', 'maidens')}`}>
                    <div className="stat-value">{player.maidens}</div>
                    <div className="stat-label">Maidens</div>
                  </div>
                  
                  {/* Row 4: Shot Analysis */}
                  <div className={`stat-card ${getStatQuality(player.dotsGiven, 'bowling', 'maidens')}`}>
                    <div className="stat-value">{player.dotsGiven}</div>
                    <div className="stat-label">Dots</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.twosGiven}</div>
                    <div className="stat-label">Twos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.foursGiven}</div>
                    <div className="stat-label">Fours</div>
                  </div>
                  <div className={`stat-card ${getStatQuality(player.extras, 'bowling', 'extras')}`}>
                    <div className="stat-value">{player.extras}</div>
                    <div className="stat-label">Extras</div>
                  </div>
                </div>

                {/* Bowling Performance Chart */}
                <div className="performance-chart">
                  <h3>Wickets Distribution</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="match" angle={-45} textAnchor="end" height={60} tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }} />
                      <YAxis   tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }}/>
                      <Tooltip content={CustomTooltip} />
                      <Bar dataKey="wickets" fill="var(--accentColor)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedTab === 'overall' && (
              <div className="stats-content overall-stats">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{player.overallRating}</div>
                    <div className="stat-label">Overall Rating</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.battingRating.toFixed(0)}</div>
                    <div className="stat-label">Batting Rating</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{player.bowlingRating.toFixed(0)}</div>
                    <div className="stat-label">Bowling Rating</div>
                  </div>
                  <div className="stat-card"><div className="stat-value">{player.allRounderRating.toFixed(0)}</div>
                    <div className="stat-label">All-Rounder Rating</div>
                  </div>
                </div>

                {/* Combined Performance Chart */}
                <div className="performance-chart">
                  <h3>Match Impact</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="match" angle={-45} textAnchor="end" height={60} tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--primaryColor)" tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--accentColor)" tick={{ fontFamily: 'var(--fontMono)', fontSize: '0.875rem' }} />
                      <Tooltip content={CustomTooltip} />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="runs" 
                        stroke="var(--primaryColor)" 
                        strokeWidth={2}
                        dot={{ fill: 'var(--primaryColor)' }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="wickets" 
                        stroke="var(--accentColor)" 
                        strokeWidth={2}
                        dot={{ fill: 'var(--accentColor)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Match History - Now using the new MatchHistory component */}
        <section className="player-matches">
          <h2 className="section-title">Match History</h2>
          <div className="matches-header">
            <div className="total-matches">
              <span className="count">{playerMatches.length}</span>
              <span className="label">Total Matches</span>
            </div>
            <div className="wins-losses">
              <div className="wins">
                <span className="count">{playerMatches.filter(m => m.Result === 'Won').length}</span>
                <span className="label">Wins</span>
              </div>
              <div className="losses">
                <span className="count">{playerMatches.filter(m => m.Result === 'Lost').length}</span>
                <span className="label">Losses</span>
              </div>
            </div>
          </div>
          <MatchHistory 
            matches={playerMatches}
            openModalIndex={openModalIndex}
            setOpenModalIndex={setOpenModalIndex}
          />
        </section>
      </div>
    </div>
  );
  }

export default PlayerDetail;
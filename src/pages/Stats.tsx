import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';
import { cacheService } from '../services/cacheService';
import Preloader from '../components/common/PreLoader';
import { AnimatePresence } from 'framer-motion';
import { getPlayerImage } from '../utils/imageUtils';
import AnimatedPage from '../components/common/layout/AnimatedPage';

interface StatsPlayer {
playerName: string;
rank: number;
matches: number;
innings: number;
imageUrl?: string;
// General Stats
battingRatings: number;
bowlingRatings: number;
allRounderRatings: number;
ratings: string;
momAwards: number;
winPercentage: number;
// Batting Stats
runsScored: number;
ballsFaced: number;
dismissals: number;
highestScore: string;
notOuts: number;
ducks: number;
goldenDucks: number;
thirties: number;
fifties: number;
seventies: number;
battingAverage: number;
battingStrikeRate: number;
boundaryPercentage: number;
dotsTaken: number;
singlesTaken: number;
twosTaken: number;
foursTaken: number;
penalty: number;
// Bowling Stats
runsGiven: number;
ballsBowled: number;
wicketsTaken: number;
bestBowling: string;
threeWickets: number;
fiveWickets: number;
hattricks: number;
maidens: number;
economy: number;
bowlingAverage: number;
bowlingStrikeRate: number;
dotsGiven: number;
twosGiven: number;
foursGiven: number;
extras: number;
worstBowling: string;
}

interface ColumnDefinition {
key: string;
label: string;
format?: (v: number) => string;
highlight?: boolean;
}

type StatsView = 'general' | 'batting-summary' | 'batting-milestones' | 'batting-breakdown' | 'bowling-summary' | 'bowling-highlights' | 'bowling-breakdown';

function Stats() {
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [players, setPlayers] = useState<StatsPlayer[]>([]);
const [playerImages, setPlayerImages] = useState<Record<string, string>>({});
const [statsView, setStatsView] = useState<StatsView>('general');
const [sortBy, setSortBy] = useState<keyof StatsPlayer>('rank');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

const [recentStatsView, setRecentStatsView] = useState<StatsView>('general');
const [recentPlayers, setRecentPlayers] = useState<StatsPlayer[]>([]);
const [recentPlayerImages, setRecentPlayerImages] = useState<Record<string, string>>({});

const fetchStatsData = useCallback(async (forceRefresh = false) => {
  try {
    // Check for cached data first
    const cachedStatsString = localStorage.getItem('cached_stats_data');
    const cachedRecentString = localStorage.getItem('cached_recent_stats_data');
    
    if ((cachedStatsString || cachedRecentString) && !forceRefresh) {
      try {
        // Process cached main stats
        if (cachedStatsString) {
          const cachedMainData = JSON.parse(cachedStatsString);
          if (cachedMainData && Array.isArray(cachedMainData.stats)) {
            const headers = cachedMainData.stats[0];
            const dataRows = cachedMainData.stats.slice(1);

            const getColumnIndex = (columnName: string): number => {
              return headers.findIndex((header: string | number) =>
                typeof header === 'string' && header.toLowerCase() === columnName.toLowerCase()
              );
            };

            const parsedPlayers: StatsPlayer[] = dataRows.map((row: Array<string | number>, index: number) => ({
              playerName: String(row[getColumnIndex('Player Name')] || ''),
              rank: Number(row[getColumnIndex('Rank')] || index + 1),
              matches: Number(row[getColumnIndex('Matches')] || 0),
              innings: Number(row[getColumnIndex('Innings')] || 0),
              battingRatings: Number(row[getColumnIndex('Batting Ratings')] || 0),
              bowlingRatings: Number(row[getColumnIndex('Bowling Ratings')] || 0),
              allRounderRatings: Number(row[getColumnIndex('All Rounder Ratings')] || 0),
              ratings: String(row[getColumnIndex('Ratings')] || ''),
              momAwards: Number(row[getColumnIndex('MoM Awards')] || 0),
              winPercentage: Number(row[getColumnIndex('Win %')] || 0),
              runsScored: Number(row[getColumnIndex('Runs Scored')] || 0),
              ballsFaced: Number(row[getColumnIndex('Balls Faced')] || 0),
              dismissals: Number(row[getColumnIndex('Dismissals')] || 0),
              highestScore: String(row[getColumnIndex('Highest Score')] || ''),
              notOuts: Number(row[getColumnIndex('Not Outs')] || 0),
              ducks: Number(row[getColumnIndex('Ducks')] || 0),
              goldenDucks: Number(row[getColumnIndex('Golden Ducks')] || 0),
              thirties: Number(row[getColumnIndex('30s')] || 0),
              fifties: Number(row[getColumnIndex('50s')] || 0),
              seventies: Number(row[getColumnIndex('70s')] || 0),
              battingAverage: Number(row[getColumnIndex('Batting Average')] || 0),
              battingStrikeRate: Number(row[getColumnIndex('Batting Strike Rate')] || 0),
              boundaryPercentage: Number(row[getColumnIndex('Boundary %')] || 0),
              dotsTaken: Number(row[getColumnIndex('Dots Taken')] || 0),
              singlesTaken: Number(row[getColumnIndex('Singles Taken')] || 0),
              twosTaken: Number(row[getColumnIndex('Twos Taken')] || 0),
              foursTaken: Number(row[getColumnIndex('Fours Taken')] || 0),
              penalty: Number(row[getColumnIndex('Penalty')] || 0),
              runsGiven: Number(row[getColumnIndex('Runs Given')] || 0),
              ballsBowled: Number(row[getColumnIndex('Balls Bowled')] || 0),
              wicketsTaken: Number(row[getColumnIndex('Wickets Taken')] || 0),
              bestBowling: String(row[getColumnIndex('Best Bowling')] || ''),
              threeWickets: Number(row[getColumnIndex('3 W')] || 0),
              fiveWickets: Number(row[getColumnIndex('5 W')] || 0),
              hattricks: Number(row[getColumnIndex('Hattricks')] || 0),
              maidens: Number(row[getColumnIndex('Maidens')] || 0),
              economy: Number(row[getColumnIndex('Economy')] || 0),
              bowlingAverage: Number(row[getColumnIndex('Bowling Average')] || 0),
              bowlingStrikeRate: Number(row[getColumnIndex('Bowling Strike Rate')] || 0),
              dotsGiven: Number(row[getColumnIndex('Dots Given')] || 0),
              twosGiven: Number(row[getColumnIndex('Twos Given')] || 0),
              foursGiven: Number(row[getColumnIndex('Fours Given')] || 0),
              extras: Number(row[getColumnIndex('Extras')] || 0),
              worstBowling: String(row[getColumnIndex('Worst Bowling')] || ''),
            })).filter((player: StatsPlayer) => player.playerName && player.playerName.trim() !== '');

            setPlayers(parsedPlayers);
            await loadPlayerImages(parsedPlayers, setPlayerImages);
          }
        }

        // Process cached recent stats
        if (cachedRecentString) {
          const cachedRecentData = JSON.parse(cachedRecentString);
          if (cachedRecentData && Array.isArray(cachedRecentData.stats)) {
            const recentHeaders = cachedRecentData.stats[0];
            const recentDataRows = cachedRecentData.stats.slice(1);

            const getRecentColumnIndex = (columnName: string): number => {
              return recentHeaders.findIndex((header: string | number) =>
                typeof header === 'string' && header.toLowerCase() === columnName.toLowerCase()
              );
            };

            const parsedRecentPlayers: StatsPlayer[] = recentDataRows.map((row: Array<string | number>, index: number) => ({
              playerName: String(row[getRecentColumnIndex('Player Name')] || ''),
              rank: Number(row[getRecentColumnIndex('Rank')] || index + 1),
              matches: Number(row[getRecentColumnIndex('Matches')] || 0),
              innings: Number(row[getRecentColumnIndex('Innings')] || 0),
              battingRatings: Number(row[getRecentColumnIndex('Batting Ratings')] || 0),
              bowlingRatings: Number(row[getRecentColumnIndex('Bowling Ratings')] || 0),
              allRounderRatings: Number(row[getRecentColumnIndex('All Rounder Ratings')] || 0),
              ratings: String(row[getRecentColumnIndex('Ratings')] || ''),
              momAwards: Number(row[getRecentColumnIndex('MoM Awards')] || 0),
              winPercentage: Number(row[getRecentColumnIndex('Win %')] || 0),
              runsScored: Number(row[getRecentColumnIndex('Runs Scored')] || 0),
              ballsFaced: Number(row[getRecentColumnIndex('Balls Faced')] || 0),
              dismissals: Number(row[getRecentColumnIndex('Dismissals')] || 0),
              highestScore: String(row[getRecentColumnIndex('Highest Score')] || ''),
              notOuts: Number(row[getRecentColumnIndex('Not Outs')] || 0),
              ducks: Number(row[getRecentColumnIndex('Ducks')] || 0),
              goldenDucks: Number(row[getRecentColumnIndex('Golden Ducks')] || 0),
              thirties: Number(row[getRecentColumnIndex('30s')] || 0),
              fifties: Number(row[getRecentColumnIndex('50s')] || 0),
              seventies: Number(row[getRecentColumnIndex('70s')] || 0),
              battingAverage: Number(row[getRecentColumnIndex('Batting Average')] || 0),
              battingStrikeRate: Number(row[getRecentColumnIndex('Batting Strike Rate')] || 0),
              boundaryPercentage: Number(row[getRecentColumnIndex('Boundary %')] || 0),
              dotsTaken: Number(row[getRecentColumnIndex('Dots Taken')] || 0),
              singlesTaken: Number(row[getRecentColumnIndex('Singles Taken')] || 0),
              twosTaken: Number(row[getRecentColumnIndex('Twos Taken')] || 0),
              foursTaken: Number(row[getRecentColumnIndex('Fours Taken')] || 0),
              penalty: Number(row[getRecentColumnIndex('Penalty')] || 0),
              runsGiven: Number(row[getRecentColumnIndex('Runs Given')] || 0),
              ballsBowled: Number(row[getRecentColumnIndex('Balls Bowled')] || 0),
              wicketsTaken: Number(row[getRecentColumnIndex('Wickets Taken')] || 0),
              bestBowling: String(row[getRecentColumnIndex('Best Bowling')] || ''),
              threeWickets: Number(row[getRecentColumnIndex('3 W')] || 0),
              fiveWickets: Number(row[getRecentColumnIndex('5 W')] || 0),
              hattricks: Number(row[getRecentColumnIndex('Hattricks')] || 0),
              maidens: Number(row[getRecentColumnIndex('Maidens')] || 0),
              economy: Number(row[getRecentColumnIndex('Economy')] || 0),
              bowlingAverage: Number(row[getRecentColumnIndex('Bowling Average')] || 0),
              bowlingStrikeRate: Number(row[getRecentColumnIndex('Bowling Strike Rate')] || 0),
              dotsGiven: Number(row[getRecentColumnIndex('Dots Given')] || 0),
              twosGiven: Number(row[getRecentColumnIndex('Twos Given')] || 0),
              foursGiven: Number(row[getRecentColumnIndex('Fours Given')] || 0),
              extras: Number(row[getRecentColumnIndex('Extras')] || 0),
              worstBowling: String(row[getRecentColumnIndex('Worst Bowling')] || ''),
            })).filter((player: StatsPlayer) => player.playerName && player.playerName.trim() !== '');

            setRecentPlayers(parsedRecentPlayers);
            await loadPlayerImages(parsedRecentPlayers, setRecentPlayerImages);
          }
        }

        // If we have cached data, return early
        if (cachedStatsString || cachedRecentString) {
          return;
        }
      } catch (e) {
        console.error('Error parsing cached stats:', e);
      }
    }

    // Only show loading if no cached data exists
    setLoading(true);
    
    // Fetch main stats
    const response = await axios.get(`${API_CONFIG.baseUrl}?type=stats`);
    console.log("Main stats response:", response.data);
    
    // Check if response has the new structure with stats property
    const statsArray = response.data?.stats || response.data;
    
    if (statsArray && Array.isArray(statsArray)) {
      const headers = statsArray[0];
      const dataRows = statsArray.slice(1);

      const getColumnIndex = (columnName: string): number => {
        return headers.findIndex((header: string | number) =>
          typeof header === 'string' && header.toLowerCase() === columnName.toLowerCase()
        );
      };

      const parsedPlayers: StatsPlayer[] = dataRows.map((row: Array<string | number>, index: number) => ({
        playerName: String(row[getColumnIndex('Player Name')] || ''),
        rank: Number(row[getColumnIndex('Rank')] || index + 1),
        matches: Number(row[getColumnIndex('Matches')] || 0),
        innings: Number(row[getColumnIndex('Innings')] || 0),
        battingRatings: Number(row[getColumnIndex('Batting Ratings')] || 0),
        bowlingRatings: Number(row[getColumnIndex('Bowling Ratings')] || 0),
        allRounderRatings: Number(row[getColumnIndex('All Rounder Ratings')] || 0),
        ratings: String(row[getColumnIndex('Ratings')] || ''),
        momAwards: Number(row[getColumnIndex('MoM Awards')] || 0),
        winPercentage: Number(row[getColumnIndex('Win %')] || 0),
        runsScored: Number(row[getColumnIndex('Runs Scored')] || 0),
        ballsFaced: Number(row[getColumnIndex('Balls Faced')] || 0),
        dismissals: Number(row[getColumnIndex('Dismissals')] || 0),
        highestScore: String(row[getColumnIndex('Highest Score')] || ''),
        notOuts: Number(row[getColumnIndex('Not Outs')] || 0),
        ducks: Number(row[getColumnIndex('Ducks')] || 0),
        goldenDucks: Number(row[getColumnIndex('Golden Ducks')] || 0),
        thirties: Number(row[getColumnIndex('30s')] || 0),
        fifties: Number(row[getColumnIndex('50s')] || 0),
        seventies: Number(row[getColumnIndex('70s')] || 0),
        battingAverage: Number(row[getColumnIndex('Batting Average')] || 0),
        battingStrikeRate: Number(row[getColumnIndex('Batting Strike Rate')] || 0),
        boundaryPercentage: Number(row[getColumnIndex('Boundary %')] || 0),
        dotsTaken: Number(row[getColumnIndex('Dots Taken')] || 0),
        singlesTaken: Number(row[getColumnIndex('Singles Taken')] || 0),
        twosTaken: Number(row[getColumnIndex('Twos Taken')] || 0),
        foursTaken: Number(row[getColumnIndex('Fours Taken')] || 0),
        penalty: Number(row[getColumnIndex('Penalty')] || 0),
        runsGiven: Number(row[getColumnIndex('Runs Given')] || 0),
        ballsBowled: Number(row[getColumnIndex('Balls Bowled')] || 0),
        wicketsTaken: Number(row[getColumnIndex('Wickets Taken')] || 0),
        bestBowling: String(row[getColumnIndex('Best Bowling')] || ''),
        threeWickets: Number(row[getColumnIndex('3 W')] || 0),
        fiveWickets: Number(row[getColumnIndex('5 W')] || 0),
        hattricks: Number(row[getColumnIndex('Hattricks')] || 0),
        maidens: Number(row[getColumnIndex('Maidens')] || 0),
        economy: Number(row[getColumnIndex('Economy')] || 0),
        bowlingAverage: Number(row[getColumnIndex('Bowling Average')] || 0),
        bowlingStrikeRate: Number(row[getColumnIndex('Bowling Strike Rate')] || 0),
        dotsGiven: Number(row[getColumnIndex('Dots Given')] || 0),
        twosGiven: Number(row[getColumnIndex('Twos Given')] || 0),
        foursGiven: Number(row[getColumnIndex('Fours Given')] || 0),
        extras: Number(row[getColumnIndex('Extras')] || 0),
        worstBowling: String(row[getColumnIndex('Worst Bowling')] || ''),
      })).filter((player: StatsPlayer) => player.playerName && player.playerName.trim() !== '');

      setPlayers(parsedPlayers);
      await loadPlayerImages(parsedPlayers, setPlayerImages);

      // Cache the main stats data
      localStorage.setItem('cached_stats_data', JSON.stringify(response.data));

      // Fetch recent stats
      try {
        console.log("Fetching recent stats...");
        const recentResponse = await axios.get(`${API_CONFIG.baseUrl}?type=recentperformance`);
        console.log("Recent stats response:", recentResponse.data);
        
        // Check if response has the new structure with stats property
        const recentStatsArray = recentResponse.data?.stats || recentResponse.data;
        
        if (recentStatsArray && Array.isArray(recentStatsArray)) {
          const recentHeaders = recentStatsArray[0];
          const recentDataRows = recentStatsArray.slice(1);

          const getRecentColumnIndex = (columnName: string): number => {
            return recentHeaders.findIndex((header: string | number) =>
              typeof header === 'string' && header.toLowerCase() === columnName.toLowerCase()
            );
          };

          const parsedRecentPlayers: StatsPlayer[] = recentDataRows.map((row: Array<string | number>, index: number) => ({
            playerName: String(row[getRecentColumnIndex('Player Name')] || ''),
            rank: Number(row[getRecentColumnIndex('Rank')] || index + 1),
            matches: Number(row[getRecentColumnIndex('Matches')] || 0),
            innings: Number(row[getRecentColumnIndex('Innings')] || 0),
            battingRatings: Number(row[getRecentColumnIndex('Batting Ratings')] || 0),
            bowlingRatings: Number(row[getRecentColumnIndex('Bowling Ratings')] || 0),
            allRounderRatings: Number(row[getRecentColumnIndex('All Rounder Ratings')] || 0),
            ratings: String(row[getRecentColumnIndex('Ratings')] || ''),
            momAwards: Number(row[getRecentColumnIndex('MoM Awards')] || 0),
            winPercentage: Number(row[getRecentColumnIndex('Win %')] || 0),
            runsScored: Number(row[getRecentColumnIndex('Runs Scored')] || 0),
            ballsFaced: Number(row[getRecentColumnIndex('Balls Faced')] || 0),
            dismissals: Number(row[getRecentColumnIndex('Dismissals')] || 0),
            highestScore: String(row[getRecentColumnIndex('Highest Score')] || ''),
            notOuts: Number(row[getRecentColumnIndex('Not Outs')] || 0),
            ducks: Number(row[getRecentColumnIndex('Ducks')] || 0),
            goldenDucks: Number(row[getRecentColumnIndex('Golden Ducks')] || 0),
            thirties: Number(row[getRecentColumnIndex('30s')] || 0),
            fifties: Number(row[getRecentColumnIndex('50s')] || 0),
            seventies: Number(row[getRecentColumnIndex('70s')] || 0),
            battingAverage: Number(row[getRecentColumnIndex('Batting Average')] || 0),
            battingStrikeRate: Number(row[getRecentColumnIndex('Batting Strike Rate')] || 0),
            boundaryPercentage: Number(row[getRecentColumnIndex('Boundary %')] || 0),
            dotsTaken: Number(row[getRecentColumnIndex('Dots Taken')] || 0),
            singlesTaken: Number(row[getRecentColumnIndex('Singles Taken')] || 0),
            twosTaken: Number(row[getRecentColumnIndex('Twos Taken')] || 0),
            foursTaken: Number(row[getRecentColumnIndex('Fours Taken')] || 0),
            penalty: Number(row[getRecentColumnIndex('Penalty')] || 0),
            runsGiven: Number(row[getRecentColumnIndex('Runs Given')] || 0),
            ballsBowled: Number(row[getRecentColumnIndex('Balls Bowled')] || 0),
            wicketsTaken: Number(row[getRecentColumnIndex('Wickets Taken')] || 0),
            bestBowling: String(row[getRecentColumnIndex('Best Bowling')] || ''),
            threeWickets: Number(row[getRecentColumnIndex('3 W')] || 0),
            fiveWickets: Number(row[getRecentColumnIndex('5 W')] || 0),
            hattricks: Number(row[getRecentColumnIndex('Hattricks')] || 0),
            maidens: Number(row[getRecentColumnIndex('Maidens')] || 0),
            economy: Number(row[getRecentColumnIndex('Economy')] || 0),
            bowlingAverage: Number(row[getRecentColumnIndex('Bowling Average')] || 0),
            bowlingStrikeRate: Number(row[getRecentColumnIndex('Bowling Strike Rate')] || 0),
            dotsGiven: Number(row[getRecentColumnIndex('Dots Given')] || 0),
            twosGiven: Number(row[getRecentColumnIndex('Twos Given')] || 0),
            foursGiven: Number(row[getRecentColumnIndex('Fours Given')] || 0),
            extras: Number(row[getRecentColumnIndex('Extras')] || 0),
            worstBowling: String(row[getRecentColumnIndex('Worst Bowling')] || ''),
          })).filter((player: StatsPlayer) => player.playerName && player.playerName.trim() !== '');

          setRecentPlayers(parsedRecentPlayers);
          await loadPlayerImages(parsedRecentPlayers, setRecentPlayerImages);

          // Cache the recent stats data
          localStorage.setItem('cached_recent_stats_data', JSON.stringify(recentResponse.data));
        }
      } catch (recentError) {
        console.log('Error loading recent stats:', recentError);
        // Don't set error here, just log it so main stats still work
      }

    } else {
      setError('Invalid data structure received');
    }
  } catch (mainError) {
    console.error('Error loading main stats:', mainError);
    setError('Failed to load stats data');
  } finally {
    setLoading(false);
  }
}, []);


const loadPlayerImages = async (
  playersList: StatsPlayer[], 
  imageSetter: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<void> => {
  const images: Record<string, string> = {};
  for (const player of playersList) {
    try {
      const imageUrl = await getPlayerImage({
        name: player.playerName,
        playerNameForImage: player.playerName,
      });
      images[player.playerName] = imageUrl;
    } catch (error) {
      console.error(`Error loading image for ${player.playerName}:`, error);
    }
  }
  imageSetter(images);
};

useEffect(() => {
fetchStatsData();
}, [fetchStatsData]);

useEffect(() => {
const removeListener = cacheService.onUpdate(() => {
    fetchStatsData();
});
return () => removeListener();
}, [fetchStatsData]);



useEffect(() => {
const tableContainer = document.querySelector('.stats-table-container') as HTMLElement;

const handleWheelScroll = (e: WheelEvent) => {
// Hold Shift key while scrolling to scroll horizontally
if (e.shiftKey && e.deltaY !== 0) {
    e.preventDefault();
    tableContainer.scrollLeft += e.deltaY;
}
};

if (tableContainer) {
tableContainer.addEventListener('wheel', handleWheelScroll, { passive: false });

return () => {
    tableContainer.removeEventListener('wheel', handleWheelScroll);
};
}
}, []);

const handleSort = (column: keyof StatsPlayer) => {
const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
setSortBy(column);
setSortOrder(newOrder);
};

const sortedPlayers = [...players].sort((a, b) => {
const aValue = a[sortBy];
const bValue = b[sortBy];
if (typeof aValue === 'string' && typeof bValue === 'string') {
    return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
}
return sortOrder === 'asc'
    ? Number(aValue) - Number(bValue)
    : Number(bValue) - Number(aValue);
});

const formatNumber = (value: number, decimals: number = 2): string => {
if (isNaN(value) || value === 0) return '0';
return value.toFixed(decimals);
};


//Conditional Styling
// Helper function to get the maximum value in a column across all players
const getMaxValue = (players: StatsPlayer[], key: keyof StatsPlayer): number => {
return Math.max(...players.map(player => Number(player[key]) || 0));
};

// Helper function to get the minimum value in a column across all players  
const getMinValue = (players: StatsPlayer[], key: keyof StatsPlayer): number => {
return Math.min(...players.map(player => Number(player[key]) || 0));
};

// Helper function to determine cell styling class
const getCellClass = (player: StatsPlayer, columnKey: string, allPlayers: StatsPlayer[]): string => {
const value = Number(player[columnKey as keyof StatsPlayer]) || 0;
const maxValue = getMaxValue(allPlayers, columnKey as keyof StatsPlayer);
const minValue = getMinValue(allPlayers, columnKey as keyof StatsPlayer);

let classes = '';

// Add highlight class if applicable
if (currentColumns.find(col => col.key === columnKey)?.highlight) {
classes += 'highlight ';
}

// General view styling
if (statsView === 'general') {
const positiveHighlightColumns = ['battingRatings', 'bowlingRatings', 'allRounderRatings', 'momAwards', 'winPercentage'];
if (positiveHighlightColumns.includes(columnKey) && value === maxValue && value > 0) {
    classes += 'best-performance ';
}
}

// Batting views styling
if (statsView.startsWith('batting')) {
// Positive highlights (higher is better)
const positiveColumns = ['runsScored', 'highestScore', 'notOuts', 'battingAverage', 'thirties', 'fifties', 'seventies', 'battingStrikeRate', 'boundaryPercentage', 'singlesTaken', 'twosTaken', 'foursTaken'];
// Negative highlights (lower is better)
const negativeColumns = ['dismissals', 'ducks', 'goldenDucks', 'dotsTaken', 'penalty'];

if (positiveColumns.includes(columnKey) && value === maxValue && value > 0) {
    classes += 'best-performance ';
} else if (negativeColumns.includes(columnKey) && value === minValue) {
    classes += 'best-performance ';
} else if (negativeColumns.includes(columnKey) && value === maxValue && value > 0) {
    classes += 'worst-performance ';
}
}

// Bowling views styling
if (statsView.startsWith('bowling')) {
// Positive highlights (higher is better)
const positiveColumns = ['wicketsTaken', 'bestBowling', 'threeWickets', 'fiveWickets', 'hattricks', 'maidens', 'dotsGiven'];
// Negative highlights (lower is better)
const negativeColumns = ['runsGiven', 'bowlingAverage', 'economy', 'twosGiven', 'foursGiven', 'extras'];

if (positiveColumns.includes(columnKey) && value === maxValue && value > 0) {
    classes += 'best-performance ';
} else if (negativeColumns.includes(columnKey) && value === minValue) {
    classes += 'best-performance ';
} else if (negativeColumns.includes(columnKey) && value === maxValue && value > 0) {
    classes += 'worst-performance ';
}
}

return classes.trim();
};

// Helper function to format ratings with promotion/demotion styling
const formatRating = (value: string | number): { formatted: string; className: string } => {
const strValue = String(value);

// Check if it contains parentheses with numbers
const match = strValue.match(/\(([+-]?\d+)\)/);
if (match) {
const change = parseInt(match[1]);
const baseRating = strValue.replace(/\s*\([+-]?\d+\)/, '');

if (change > 0) {
    return {
    formatted: `${baseRating} (+${change})`,
    className: 'promoted'
    };
} else if (change < 0) {
    return {
    formatted: `${baseRating} (${change})`,
    className: 'demoted'
    };
}
}

return {
formatted: strValue,
className: ''
};
};





const generalColumns: ColumnDefinition[] = [
{ key: 'battingRatings', label: 'Batting Rating', format: (v: number) => formatNumber(v) },
{ key: 'bowlingRatings', label: 'Bowling Rating', format: (v: number) => formatNumber(v) },
{ key: 'allRounderRatings', label: 'All-Rounder Rating', format: (v: number) => formatNumber(v) },
{ key: 'ratings', label: 'Overall Rating' }, // No format function here
{ key: 'momAwards', label: 'MoM Awards', highlight: true },
{ key: 'winPercentage', label: 'Win %', format: (v: number) => `${formatNumber(v, 1)}%` },
];

const battingSummaryColumns: ColumnDefinition[] = [
{ key: 'runsScored', label: 'Runs Scored' },
{ key: 'ballsFaced', label: 'Balls Faced' },
{ key: 'dismissals', label: 'Dismissals' },
{ key: 'highestScore', label: 'Highest Score', highlight: true },
{ key: 'notOuts', label: 'Not Outs' },
{ key: 'battingAverage', label: 'Batting Avg', format: (v: number) => formatNumber(v) },
];

const battingMilestonesColumns: ColumnDefinition[] = [
{ key: 'ducks', label: 'Ducks', highlight: false },
{ key: 'goldenDucks', label: 'Golden Ducks', highlight: false },
{ key: 'thirties', label: '30s', highlight: false },
{ key: 'fifties', label: '50s', highlight: false },
{ key: 'seventies', label: '70s', highlight: false },
{ key: 'battingStrikeRate', label: 'Strike Rate', format: (v: number) => formatNumber(v), highlight: false },
];

const battingBreakdownColumns: ColumnDefinition[] = [
{ key: 'boundaryPercentage', label: 'Boundary %', format: (v: number) => `${formatNumber(v, 1)}%`, highlight: false },
{ key: 'dotsTaken', label: 'Dots Taken', highlight: false },
{ key: 'singlesTaken', label: 'Singles', highlight: false },
{ key: 'twosTaken', label: 'Twos', highlight: false },
{ key: 'foursTaken', label: 'Fours', highlight: false },
{ key: 'penalty', label: 'Penalty', highlight: false },
];

const bowlingSummaryColumns: ColumnDefinition[] = [
{ key: 'runsGiven', label: 'Runs Given', highlight: false },
{ key: 'ballsBowled', label: 'Balls Bowled', highlight: false },
{ key: 'wicketsTaken', label: 'Wickets Taken', highlight: false },
{ key: 'bestBowling', label: 'Best Bowling', highlight: true },
{ key: 'bowlingAverage', label: 'Bowling Avg', format: (v: number) => formatNumber(v), highlight: false },
];

const bowlingHighlightsColumns: ColumnDefinition[] = [
{ key: 'threeWickets', label: '3 Wickets', highlight: false },
{ key: 'fiveWickets', label: '5 Wickets', highlight: false },
{ key: 'hattricks', label: 'Hattricks', highlight: false },
{ key: 'maidens', label: 'Maidens', highlight: false },
{ key: 'bowlingStrikeRate', label: 'Strike Rate', format: (v: number) => formatNumber(v), highlight: false },
];

const bowlingBreakdownColumns: ColumnDefinition[] = [
{ key: 'economy', label: 'Economy', format: (v: number) => formatNumber(v), highlight: false },
{ key: 'dotsGiven', label: 'Dots Given', highlight: false },
{ key: 'twosGiven', label: 'Twos Given', highlight: false },
{ key: 'foursGiven', label: 'Fours Given', highlight: false },
{ key: 'extras', label: 'Extras', highlight: false },
];

const currentColumns = statsView === 'general' ? generalColumns :
                    statsView === 'batting-summary' ? battingSummaryColumns :
                    statsView === 'batting-milestones' ? battingMilestonesColumns :
                    statsView === 'batting-breakdown' ? battingBreakdownColumns :
                    statsView === 'bowling-summary' ? bowlingSummaryColumns :
                    statsView === 'bowling-highlights' ? bowlingHighlightsColumns :
                    bowlingBreakdownColumns;

if (loading) {
return (
    <div className="stats-page">
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
    <div className="stats-page">
    <div className="container section">
        <div className="error">{error}</div>
    </div>
    </div>
);
}

return (
<AnimatedPage>
    <div className="stats-page">
    <div className="container">
        <h1 className="section-title">PLAYER STATISTICS</h1>
        <p className="section-description">
        "Comprehensive statistics for all players"
        </p>

    <div className="section-toggles">
    <button
        className={`toggle-btn ${statsView === 'general' ? 'active' : ''}`}
        onClick={() => setStatsView('general')}
    >
        <i className="material-icons">info</i>
        General
    </button>
    <button
        className={`toggle-btn ${statsView === 'batting-summary' ? 'active' : ''}`}
        onClick={() => setStatsView('batting-summary')}
    >
        <i className="material-icons">sports_cricket</i>
        Batting: Summary
    </button>
    <button
        className={`toggle-btn ${statsView === 'batting-milestones' ? 'active' : ''}`}
        onClick={() => setStatsView('batting-milestones')}
    >
        <i className="material-icons">emoji_events</i>
        Batting: Milestones
    </button>
    <button
        className={`toggle-btn ${statsView === 'batting-breakdown' ? 'active' : ''}`}
        onClick={() => setStatsView('batting-breakdown')}
    >
        <i className="material-icons">analytics</i>
        Batting: Breakdown
    </button>
    <button
        className={`toggle-btn ${statsView === 'bowling-summary' ? 'active' : ''}`}
        onClick={() => setStatsView('bowling-summary')}
    >
        <i className="material-icons">sports_baseball</i>
        Bowling: Summary
    </button>
    <button
        className={`toggle-btn ${statsView === 'bowling-highlights' ? 'active' : ''}`}
        onClick={() => setStatsView('bowling-highlights')}
    >
        <i className="material-icons">star</i>
        Bowling: Highlights
    </button>
    <button
        className={`toggle-btn ${statsView === 'bowling-breakdown' ? 'active' : ''}`}
        onClick={() => setStatsView('bowling-breakdown')}
    >
        <i className="material-icons">bar_chart</i>
        Bowling: Breakdown
    </button>
    </div>

    <div className="stats-table-container">
    <div className="table-scroll-wrapper">
        <table className="stats-table">
        <thead>
            <tr>
            <th>Player</th>
            <th 
                className={`rank-header ${sortBy === 'rank' ? 'active' : ''}`}
                onClick={() => handleSort('rank')}
            >
                Rank
                <i className="material-icons sort-icon">
                {sortBy === 'rank' && sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                </i>
            </th>
            <th>Matches</th>
            {!statsView.startsWith('bowling') && <th>Innings</th>}
            {currentColumns.map((col) => (
                <th key={col.key} className={col.highlight ? 'highlight' : ''}>
                {col.label}
                </th>
            ))}
            </tr>
        </thead>
        <tbody>
            {sortedPlayers.map((player) => (
            <tr key={player.playerName}>
                <td>
                <Link to={`/players/${player.playerName}`} className="player-link">
                    <div className="player-cell-content">
                    <div
                        className="player-image"
                        style={{ backgroundImage: `url(${playerImages[player.playerName]})` }}
                    />
                    <span className="player-name">{player.playerName}</span>
                    </div>
                </Link>
                </td>
                <td>
                <td>
                {player.rank === 25 && player.matches < 5 ? (
                    <span className="null-rank">NULL</span>
                ) : (
                    <div className={`rank-badge ${player.rank <= 3 ? `top-${player.rank}` : ''}`}>
                    {player.rank}
                    </div>
                )}
                </td>
                </td>
                <td>{player.matches}</td>
                {!statsView.startsWith('bowling') && <td>{player.innings}</td>}
                {currentColumns.map((col) => {
                const cellClass = getCellClass(player, col.key, sortedPlayers);
                let cellContent;
                let additionalClass = '';
                
                // Special handling for ratings
                if (col.key === 'ratings') {
                    const value = player[col.key as keyof StatsPlayer] || '';
                    const ratingInfo = formatRating(value);
                    cellContent = ratingInfo.formatted;
                    additionalClass = ratingInfo.className;
                } else {
                    cellContent = col.format 
                    ? col.format(player[col.key as keyof StatsPlayer] as number) 
                    : player[col.key as keyof StatsPlayer];
                }
                
                return (
                    <td key={col.key} className={`${cellClass} ${additionalClass}`.trim()}>
                    {cellContent}
                    </td>
                );
                })}
            </tr>
            ))}
        </tbody>
        </table>
    </div>
    </div>


    {/* Recent 5 Match Stats Section */}
    <div className="recent-stats-section">
    <h2 className="section-title">RECENT PERFORMANCES</h2>
    <p className="section-description">
        "Performance statistics from the last 5 matches"
    </p>

    <div className="section-toggles">
        <button
        className={`toggle-btn ${recentStatsView === 'general' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('general')}
        >
        <i className="material-icons">info</i>
        General
        </button>
        <button
        className={`toggle-btn ${recentStatsView === 'batting-summary' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('batting-summary')}
        >
        <i className="material-icons">sports_cricket</i>
        Batting: Summary
        </button>
        <button
        className={`toggle-btn ${recentStatsView === 'batting-milestones' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('batting-milestones')}
        >
        <i className="material-icons">emoji_events</i>
        Batting: Milestones
        </button>
        <button
        className={`toggle-btn ${recentStatsView === 'batting-breakdown' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('batting-breakdown')}
        >
        <i className="material-icons">analytics</i>
        Batting: Breakdown
        </button>
        <button
        className={`toggle-btn ${recentStatsView === 'bowling-summary' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('bowling-summary')}
        >
        <i className="material-icons">sports_baseball</i>
        Bowling: Summary
        </button>
        <button
        className={`toggle-btn ${recentStatsView === 'bowling-highlights' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('bowling-highlights')}
        >
        <i className="material-icons">star</i>
        Bowling: Highlights
        </button>
        <button
        className={`toggle-btn ${recentStatsView === 'bowling-breakdown' ? 'active' : ''}`}
        onClick={() => setRecentStatsView('bowling-breakdown')}
        >
        <i className="material-icons">bar_chart</i>
        Bowling: Breakdown
        </button>
    </div>

    {/* Recent Stats Table - Copy your entire table JSX and replace variables */}
    <div className="stats-table-container">
        <div className="table-scroll-wrapper">
        <table className="stats-table">
            <thead>
            <tr>
                <th>Player</th>
                <th 
                className={`rank-header ${sortBy === 'rank' ? 'active' : ''}`}
                onClick={() => handleSort('rank')}
                >
                Rank
                <i className="material-icons sort-icon">
                    {sortBy === 'rank' && sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                </i>
                </th>
                <th>Matches</th>
                {!recentStatsView.startsWith('bowling') && <th>Innings</th>}
                {/* Use same currentColumns logic but with recentStatsView */}
                {(recentStatsView === 'general' ? generalColumns :
                recentStatsView === 'batting-summary' ? battingSummaryColumns :
                recentStatsView === 'batting-milestones' ? battingMilestonesColumns :
                recentStatsView === 'batting-breakdown' ? battingBreakdownColumns :
                recentStatsView === 'bowling-summary' ? bowlingSummaryColumns :
                recentStatsView === 'bowling-highlights' ? bowlingHighlightsColumns :
                bowlingBreakdownColumns
                ).map((col) => (
                <th key={col.key} className={col.highlight ? 'highlight' : ''}>
                    {col.label}
                </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {/* Use recentPlayers instead of sortedPlayers */}
            {recentPlayers.map((player) => (
                <tr key={player.playerName}>
                <td>
                    <Link to={`/players/${player.playerName}`} className="player-link">
                    <div className="player-cell-content">
                        <div
                        className="player-image"
                        style={{ backgroundImage: `url(${recentPlayerImages[player.playerName]})` }}
                        />
                        <span className="player-name">{player.playerName}</span>
                    </div>
                    </Link>
                </td>
                <td>
                    {player.rank === 25 && player.matches < 5 ? (
                    <span className="null-rank">NULL</span>
                    ) : (
                    <div className={`rank-badge ${player.rank <= 3 ? `top-${player.rank}` : ''}`}>
                        {player.rank}
                    </div>
                    )}
                </td>
               <td>{player.matches}</td>
                {!recentStatsView.startsWith('bowling') && <td>{player.innings}</td>}
                {(recentStatsView === 'general' ? generalColumns :
                recentStatsView === 'batting-summary' ? battingSummaryColumns :
                recentStatsView === 'batting-milestones' ? battingMilestonesColumns :
                recentStatsView === 'batting-breakdown' ? battingBreakdownColumns :
                recentStatsView === 'bowling-summary' ? bowlingSummaryColumns :
                recentStatsView === 'bowling-highlights' ? bowlingHighlightsColumns :
                bowlingBreakdownColumns
                ).map((col) => {
                const cellClass = getCellClass(player, col.key, recentPlayers);
                let cellContent;
                let additionalClass = '';
                
                // Special handling for ratings
                if (col.key === 'ratings') {
                    const value = player[col.key as keyof StatsPlayer] || '';
                    const ratingInfo = formatRating(value);
                    cellContent = ratingInfo.formatted;
                    additionalClass = ratingInfo.className;
                } else {
                    cellContent = col.format 
                    ? col.format(player[col.key as keyof StatsPlayer] as number) 
                    : player[col.key as keyof StatsPlayer];
                }
                
                return (
                    <td key={col.key} className={`${cellClass} ${additionalClass}`.trim()}>
                    {cellContent}
                    </td>
                );
                })}
               
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    </div>
    </div>

    </div>
    </div>
</AnimatedPage>
);
}

export default Stats;
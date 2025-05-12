// src/components/home/DataTester.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

const API_URL = API_CONFIG.baseUrl;

// Cache keys
const METADATA_KEY = 'cricket_data_metadata';
const SUMMARY_KEY = 'cricket_data_summary';
const PLAYERS_KEY = 'cricket_data_players';
const PLAYER_PREFIX = 'cricket_player_';

function DataTester() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cacheInfo, setCacheInfo] = useState<any>({});
  const [playerOptions, setPlayerOptions] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  
  // Check if data needs updating
  async function checkForUpdates() {
    try {
      setLoading(true);
      setStatusMessage('Checking for updates...');
      
      // Get the latest metadata from server
      const response = await axios.get(`${API_URL}?type=checkUpdate`);
      const serverMetadata = response.data;
      // console.log('Server metadata:', serverMetadata);
      
      // Get our stored metadata
      const storedMetadataJson = localStorage.getItem(METADATA_KEY);
      
      if (!storedMetadataJson) {
        // No stored metadata, we need to update
        localStorage.setItem(METADATA_KEY, JSON.stringify(serverMetadata));
        setStatusMessage('No cached data found. Initial setup required.');
        setCacheInfo({
          cacheExists: false,
          needsUpdate: true,
          serverTimestamp: new Date(serverMetadata.lastUpdated).toLocaleString()
        });
        return true;
      }
      
      const storedMetadata = JSON.parse(storedMetadataJson);
      // console.log('Stored metadata:', storedMetadata);
      
      // Check if server data is newer
      const needsUpdate = serverMetadata.lastUpdated > storedMetadata.lastUpdated || 
          serverMetadata.version !== storedMetadata.version;
      
      if (needsUpdate) {
        // Update metadata
        localStorage.setItem(METADATA_KEY, JSON.stringify(serverMetadata));
        setStatusMessage('Update available! Cached data needs refreshing.');
      } else {
        setStatusMessage('Cache is up to date with server.');
      }
      
      setCacheInfo({
        cacheExists: true,
        needsUpdate: needsUpdate,
        localTimestamp: new Date(storedMetadata.lastUpdated).toLocaleString(),
        serverTimestamp: new Date(serverMetadata.lastUpdated).toLocaleString(),
        localVersion: storedMetadata.version,
        serverVersion: serverMetadata.version
      });
      
      return needsUpdate;
    } catch (error) {
      console.error("Error checking for updates:", error);
      setStatusMessage('Error checking for updates from server.');
      setError(error instanceof Error ? error.message : "Unknown error");
      return true; // If error, assume update needed
    } finally {
      setLoading(false);
    }
  }
  
  // Load summary data
  async function loadSummaryData() {
    try {
      setLoading(true);
      setStatusMessage('Loading summary data...');

      
      
      const needsUpdate = await checkForUpdates();
      const cachedData = localStorage.getItem(SUMMARY_KEY);
      
      if (cachedData && !needsUpdate) {
        setStatusMessage('Using cached summary data.');
        // console.log("Using cached summary data:", JSON.parse(cachedData));
        return JSON.parse(cachedData);
      }
      
      // Fetch fresh data
      setStatusMessage('Fetching fresh summary data from server...');
      const response = await axios.get(`${API_URL}?type=summary`);
      const data = response.data;
      // console.log("Fresh summary data:", data);
      
      // Cache the data
      localStorage.setItem(SUMMARY_KEY, JSON.stringify(data));
      
      setStatusMessage('Summary data refreshed and cached successfully!');
      return data;
    } catch (error) {
      console.error("Error loading summary data:", error);
      setStatusMessage('Error loading summary data.');
      setError(error instanceof Error ? error.message : "Unknown error");
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem(SUMMARY_KEY);
      if (cachedData) {
        setStatusMessage('Using cached data as fallback after error.');
        return JSON.parse(cachedData);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }
  
  // Load players data
  async function loadPlayersData() {
    try {
      setLoading(true);
      setStatusMessage('Loading players data...');
      
      const needsUpdate = await checkForUpdates();
      const cachedData = localStorage.getItem(PLAYERS_KEY);
      
      if (cachedData && !needsUpdate) {
        setStatusMessage('Using cached players data.');
        const playersData = JSON.parse(cachedData);
        // console.log("Using cached players data:", playersData);
        extractPlayerNames(playersData);
        return playersData;
      }
      
      // Fetch fresh data
      setStatusMessage('Fetching fresh players data from server...');
      const response = await axios.get(`${API_URL}?type=players`);
      const data = response.data;
      // console.log("Fresh players data:", data);
      
      // Cache the data
      localStorage.setItem(PLAYERS_KEY, JSON.stringify(data));
      
      setStatusMessage('Players data refreshed and cached successfully!');
      
      // Extract player names
      extractPlayerNames(data);
      
      return data;
    } catch (error) {
      console.error("Error loading players data:", error);
      setStatusMessage('Error loading players data.');
      setError(error instanceof Error ? error.message : "Unknown error");
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem(PLAYERS_KEY);
      if (cachedData) {
        setStatusMessage('Using cached data as fallback after error.');
        const playersData = JSON.parse(cachedData);
        extractPlayerNames(playersData);
        return playersData;
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to extract player names from data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractPlayerNames(data: any) {
    // console.log("Extracting player names from:", data);
    
    if (data && data.stats && Array.isArray(data.stats) && data.stats.length > 1) {
      // Log the first few rows to see the structure
      // ("First few rows of stats:", data.stats.slice(0, 5));
      
      // Assuming first column has player names and first row is header
      const playerNames = data.stats.slice(1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => row[0])
        .filter((name: string) => name && typeof name === 'string');
      
      // console.log("Extracted player names:", playerNames);
      
      if (playerNames.length > 0) {
        setPlayerOptions(playerNames);
        if (!selectedPlayer && playerNames.length > 0) {
          setSelectedPlayer(playerNames[0]);
        }
      } else {
        console.warn("No player names found in the data");
      }
    } else {
      console.warn("Data structure is not as expected:", data);
    }
  }
  
  // Load player details
  async function loadPlayerDetails(playerName: string) {
    if (!playerName) {
      console.warn("No player name provided for loading details");
      return;
    }
    
    const cacheKey = `${PLAYER_PREFIX}${playerName}`;
    
    try {
      setLoading(true);
      setStatusMessage(`Loading data for player ${playerName}...`);
      
      const needsUpdate = await checkForUpdates();
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData && !needsUpdate) {
        setStatusMessage(`Using cached data for player ${playerName}.`);
        // console.log(`Using cached data for player ${playerName}:`, JSON.parse(cachedData));
        return JSON.parse(cachedData);
      }
      
      // Fetch fresh data
      setStatusMessage(`Fetching fresh data for player ${playerName}...`);
      const response = await axios.get(`${API_URL}?type=playerDetails&name=${encodeURIComponent(playerName)}`);
      const data = response.data;
      // console.log(`Fresh data for player ${playerName}:`, data);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(data));
      
      setStatusMessage(`Data for player ${playerName} refreshed and cached!`);
      return data;
    } catch (error) {
      console.error(`Error loading data for player ${playerName}:`, error);
      setStatusMessage(`Error loading data for player ${playerName}.`);
      setError(error instanceof Error ? error.message : "Unknown error");
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setStatusMessage('Using cached data as fallback after error.');
        return JSON.parse(cachedData);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }
  
  // Clear all cache
  function clearCache() {
    // Clear known keys
    localStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(SUMMARY_KEY);
    localStorage.removeItem(PLAYERS_KEY);
    
    // Clear player-specific caches
    const playerKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(PLAYER_PREFIX)
    );
    
    playerKeys.forEach(key => localStorage.removeItem(key));
    
    setStatusMessage('Cache cleared successfully!');
    setCacheInfo({
      cacheExists: false,
      needsUpdate: true
    });
  }
  
  // Calculate cache size
  function calculateCacheSize() {
    let totalSize = 0;
    let playerCacheCount = 0;
    
    // Check all localStorage items
    Object.keys(localStorage).forEach(key => {
      const size = localStorage.getItem(key)?.length || 0;
      totalSize += size;
      
      if (key.startsWith(PLAYER_PREFIX)) {
        playerCacheCount++;
      }
    });
    
    // Convert to KB
    const sizeInKB = (totalSize / 1024).toFixed(2);
    
    const infoMessage = `Cache Info: Total Size: ${sizeInKB} KB, Player Caches: ${playerCacheCount}`;
    setStatusMessage(infoMessage);
    // console.log(infoMessage);
    
    return infoMessage;
  }
  
  useEffect(() => {
    // Check cache status and load player list when component mounts
    async function initializeData() {
      await checkForUpdates();
      try {
        await loadPlayersData();
        calculateCacheSize();
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    }
    
    initializeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="data-tester">
      <h2>Data Caching Tester</h2>
      
      <div className="cache-status">
        <h3>Cache Status:</h3>
        {cacheInfo.cacheExists ? (
          <div>
            <p>Cache exists: <span className="success">Yes</span></p>
            <p>Needs update: <span className={cacheInfo.needsUpdate ? "error" : "success"}>
              {cacheInfo.needsUpdate ? "Yes" : "No"}
            </span></p>
            <p>Local timestamp: {cacheInfo.localTimestamp || "Invalid Date"}</p>
            <p>Server timestamp: {cacheInfo.serverTimestamp || "Invalid Date"}</p>
            <p>Local version: {cacheInfo.localVersion}</p>
            <p>Server version: {cacheInfo.serverVersion}</p>
          </div>
        ) : (
          <p>No cache data found</p>
        )}
      </div>
      
      <div className="status-message">
        {loading && <p className="loading">Loading...</p>}
        {error && <p className="error">Error: {error}</p>}
        <p className="message">{statusMessage}</p>
      </div>
      
      <div className="player-selector">
        <h3>Load Player Data:</h3>
        {playerOptions.length === 0 ? (
          <p>No players available. Please load players data first.</p>
        ) : (
          <>
            <select 
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              disabled={loading}
            >
              {playerOptions.map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
            <button 
              onClick={() => loadPlayerDetails(selectedPlayer)} 
              disabled={loading || !selectedPlayer}
              className="btn-load-player"
            >
              Load Player Data
            </button>
          </>
        )}
      </div>
      
      <div className="button-group">
        <button onClick={checkForUpdates} disabled={loading}>Check for Updates</button>
        <button onClick={() => loadSummaryData()} disabled={loading}>Load Summary Data</button>
        <button onClick={() => loadPlayersData()} disabled={loading}>Load Players Data</button>
        <button onClick={calculateCacheSize} disabled={loading}>Calculate Cache Size</button>
        <button onClick={clearCache} disabled={loading}>Clear Cache</button>
      </div>
      
      <style>{`
        .data-tester {
          padding: 20px;
          background-color: #f5f5f5;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        
        .cache-status {
          margin: 15px 0;
          padding: 15px;
          background-color: #fff;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .status-message {
          margin: 15px 0;
          padding: 15px;
          background-color: #fff;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .player-selector {
          margin: 15px 0;
          padding: 15px;
          background-color: #fff;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .player-selector select {
          padding: 8px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        
        .success {
          color: green;
          font-weight: bold;
        }
        
        .error {
          color: red;
          font-weight: bold;
        }
        
        .loading {
          color: orange;
          font-weight: bold;
        }
        
        .message {
          font-weight: bold;
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        
        button {
          padding: 10px 15px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        
        button:hover {
          background-color: #0056b3;
        }
        
        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .btn-load-player {
          margin-top: 10px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

export default DataTester;
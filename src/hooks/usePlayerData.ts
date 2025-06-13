// src/hooks/usePlayerData.ts
import { useState, useEffect, useCallback } from 'react';
import { PlayerData } from '../types/playerTypes';
import { cacheService } from '../services/cacheService';
import { parsePlayerData } from '../services/playerDataService';

interface UsePlayerDataResult {
  players: PlayerData[];
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
}

export const usePlayerData = (): UsePlayerDataResult => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Start with false
  const [error, setError] = useState<Error | null>(null);

const fetchPlayerData = useCallback(async (forceRefresh = false): Promise<void> => {
  try {
    // Check cache first (instant loading)
    if (!forceRefresh) {
      const cachedPlayersString = localStorage.getItem('cached_players_data');
      if (cachedPlayersString) {
        try {
          const cachedPlayers = JSON.parse(cachedPlayersString);
          if (Array.isArray(cachedPlayers) && cachedPlayers.length > 0) {
            setPlayers(cachedPlayers);
            setLoading(false);
            setError(null);
            
            // Continue to fetch fresh data in background without loading state
            cacheService.fetchPlayers(true)
              .then(result => {
                if (result?.stats) {
                  const parsedPlayers = parsePlayerData(result.stats);
                  localStorage.setItem('cached_players_data', JSON.stringify(parsedPlayers));
                  setPlayers(parsedPlayers);
                }
              })
              .catch(err => console.error('Background refresh error:', err));
            return; // Exit here if we have cached data
          }
        } catch (e) {
          console.error('Error parsing cached players:', e);
        }
      }
    }
    
    // Only show loading if no cached data exists
    if (players.length === 0) {
      setLoading(true);
    }
    
    const result = await cacheService.fetchPlayers(forceRefresh);
    
    if (!result?.stats || !Array.isArray(result.stats)) {
      throw new Error('Invalid data format received from API');
    }
    
    const parsedPlayers = parsePlayerData(result.stats);
    localStorage.setItem('cached_players_data', JSON.stringify(parsedPlayers));
    setPlayers(parsedPlayers);
    setError(null);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err : new Error('An unknown error occurred');
    console.error('Error in player data hook:', err);
    
    // Only show error if we don't have any data
    if (players.length === 0) {
      setError(errorMessage);
    }
  } finally {
    setLoading(false);
  }
}, [players.length]); 

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  const refreshData = useCallback(async (): Promise<void> => {
    await fetchPlayerData(true); // This will update in background
  }, [fetchPlayerData]);

  return { players, loading, error, refreshData };
};
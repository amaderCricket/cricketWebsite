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
      // Always check for cached data first
      const cachedPlayersString = localStorage.getItem('cached_players_data');
      if (cachedPlayersString) {
        try {
          const cachedPlayers = JSON.parse(cachedPlayersString);
          if (Array.isArray(cachedPlayers) && cachedPlayers.length > 0) {
            setPlayers(cachedPlayers);
            // Don't set loading to false here, it's already false
            
            // Fetch fresh data in background without loading state
            if (forceRefresh) {
              cacheService.fetchPlayers(true)
                .then(result => {
                  if (result?.stats) {
                    const parsedPlayers = parsePlayerData(result.stats);
                    localStorage.setItem('cached_players_data', JSON.stringify(parsedPlayers));
                    setPlayers(parsedPlayers);
                  }
                })
                .catch(err => console.error('Background refresh error:', err));
            }
            return;
          }
        } catch (e) {
          console.error('Error parsing cached players:', e);
        }
      }
      
      // Only show loading if no cached data exists
      setLoading(true);
      
      const result = await cacheService.fetchPlayers(forceRefresh);
      
      if (!result?.stats || !Array.isArray(result.stats)) {
        throw new Error('Invalid data format received from API');
      }
      
      const parsedPlayers = parsePlayerData(result.stats);
      localStorage.setItem('cached_players_data', JSON.stringify(parsedPlayers));
      setPlayers(parsedPlayers);
      setLoading(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(errorMessage);
      setLoading(false);
      console.error('Error in player data hook:', err);
    }
  }, []);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  const refreshData = useCallback(async (): Promise<void> => {
    await fetchPlayerData(true); // This will update in background
  }, [fetchPlayerData]);

  return { players, loading, error, refreshData };
};
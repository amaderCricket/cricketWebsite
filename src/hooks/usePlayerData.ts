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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Create a memoized fetchPlayerData function to avoid recreating it on every render
  const fetchPlayerData = useCallback(async (forceRefresh = false): Promise<void> => {
    try {
      // Check for cached player data first
      const cachedPlayersString = localStorage.getItem('cached_players_data');
      if (cachedPlayersString && !forceRefresh) {
        try {
          const cachedPlayers = JSON.parse(cachedPlayersString);
          if (Array.isArray(cachedPlayers) && cachedPlayers.length > 0) {
            // Use cached data immediately
            setPlayers(cachedPlayers);
            setLoading(false);
            
            // Then fetch fresh data in background without loading state
            cacheService.fetchPlayers(true)
              .then(result => {
                if (!result || !result.stats || !Array.isArray(result.stats)) {
                  return; // Invalid data, keep using cached
                }
                // Parse and update if different
                const parsedPlayers = parsePlayerData(result.stats);
                if (JSON.stringify(parsedPlayers) !== cachedPlayersString) {
                  localStorage.setItem('cached_players_data', JSON.stringify(parsedPlayers));
                  setPlayers(parsedPlayers);
                }
              })
              .catch(err => {
                console.error('Background refresh error:', err);
                // No UI updates on background errors
              });
              
            return; // Exit early, we have data
          }
        } catch (e) {
          console.error('Error parsing cached players:', e);
          // Continue with normal loading
        }
      }
      
      // Normal flow - show loading state
      setLoading(true);
      
      // Get players data from cache or API
      const result = await cacheService.fetchPlayers(forceRefresh);
      
      // Safety check for valid data structure
      if (!result || !result.stats || !Array.isArray(result.stats)) {
        throw new Error('Invalid data format received from API');
      }
      
      // Parse the player data
      const parsedPlayers = parsePlayerData(result.stats);
      
      // Cache the data for future use
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

  // Initial data load
  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  // Function to refresh data on demand
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchPlayerData(true);
  }, [fetchPlayerData]);

  return { players, loading, error, refreshData };
};
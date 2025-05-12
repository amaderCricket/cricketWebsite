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
      setLoading(true);
      
      // Get players data from cache or API
      const result = await cacheService.fetchPlayers(forceRefresh);
      // console.log('Players data loaded');
      
      // Safety check for valid data structure
      if (!result || !result.stats || !Array.isArray(result.stats)) {
        throw new Error('Invalid data format received from API');
      }
      
      // Parse the player data
      const parsedPlayers = parsePlayerData(result.stats);
      // console.log(`Parsed ${parsedPlayers.length} players`);
      
      setPlayers(parsedPlayers);
      setLoading(false);
      
      // Prefetch only if we have players and this isn't a refresh
      if (parsedPlayers.length > 0 && !forceRefresh) {
        // Start background prefetching of player details for top players only
        const topPlayers = parsedPlayers.slice(0, 5).map(player => player.name);
        setTimeout(() => {
          cacheService.prefetchAllPlayerDetails(topPlayers);
        }, 2000); // Delay to allow page to render first
      }
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
// src/hooks/useDataFetcher.ts
import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/cacheService';

// Define type for data structure
interface SummaryData {
  teams?: Record<string, unknown>;
  matches?: Array<unknown>;
  lastUpdated?: string;
  [key: string]: unknown;
}

interface UseDataFetcherResult {
  data: SummaryData | null;
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
}

export const useDataFetcher = (): UseDataFetcherResult => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

const fetchData = useCallback(async (forceRefresh = false): Promise<void> => {
  try {
    // Check for cached data first (instant)
    if (!forceRefresh) {
      const cachedData = localStorage.getItem('cricket_data_summary');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setData(parsed);
          setLoading(false);
          // Don't return - still fetch fresh data in background
        } catch (e) {
          console.error('Error parsing cached summary data:', e);
        }
      }
    }

    // Only show loading if we don't have any data yet
    if (!data && !forceRefresh) {
      setLoading(true);
    }
    
    // Fetch fresh data
    const result = await cacheService.fetchSummaryData(forceRefresh);
    setData(result);
    setError(null);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err : new Error('An unknown error occurred');
    setError(errorMessage);
    console.error('Error in data fetcher hook:', err);
    
    // If we have cached data, don't show error
    if (data) {
      setError(null);
    }
  } finally {
    setLoading(false);
  }
}, [data]);

  // Load data initially
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to refresh data on demand
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refreshData };
};
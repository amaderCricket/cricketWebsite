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
       if (!data && !forceRefresh) {
      setLoading(true);
    }
      // Use cacheService instead of direct API call
      const result = await cacheService.fetchSummaryData(forceRefresh);
      // console.log('Summary data loaded');
      setData(result);
      setLoading(false);
    } catch (err) {
      // Convert unknown error to Error object
      const errorMessage = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(errorMessage);
      setLoading(false);
      console.error('Error in data fetcher hook:', err);
    }
    finally {
    // Only hide loading if it was shown
    if (!data && !forceRefresh) {
      setLoading(false);
    }
  }}, [data]);

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
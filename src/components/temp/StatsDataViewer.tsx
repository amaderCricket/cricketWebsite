// src/components/temp/StatsDataViewer.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../config/apiConfig';

function StatsDataViewer() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching Stats data...');
      
      // Try to fetch the stats data
      const response = await axios.get(`${API_CONFIG.baseUrl}?type=recentperformance`);
      
      console.log('📊 Raw API Response:', response.data);
      
      setData(response.data);
      
      // Log different parts of the data
      if (response.data) {
        console.log('📈 Stats Data Structure:');
        console.log('- Keys available:', Object.keys(response.data));
        
        // If there's a stats property, log its structure
        if (response.data.stats) {
          console.log('- Stats array length:', response.data.stats.length);
          console.log('- First row (headers):', response.data.stats[0]);
          console.log('- Second row (first data):', response.data.stats[1]);
          console.log('- Sample rows (first 3):', response.data.stats.slice(0, 3));
        }
        
        // Log any other properties
        Object.keys(response.data).forEach(key => {
          if (key !== 'stats') {
            console.log(`- ${key}:`, response.data[key]);
          }
        });
      }
      
    } catch (err) {
      console.error('❌ Error fetching stats data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on component mount
    fetchStatsData();
  }, []);

  return (
    <div style={{
      padding: '2rem',
      margin: '1rem',
      border: '2px solid #2D7783',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      fontFamily: 'monospace'
    }}>
      <h2 style={{ color: '#2D7783', marginBottom: '1rem' }}>
        📊 Stats Data Viewer (Temporary)
      </h2>
      
      <button 
        onClick={fetchStatsData}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#2D7783',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '1rem'
        }}
      >
        {loading ? '⏳ Loading...' : '🔄 Fetch Stats Data'}
      </button>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffe6e6',
          border: '1px solid #ff9999',
          borderRadius: '4px',
          color: '#cc0000',
          marginBottom: '1rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{
        padding: '1rem',
        backgroundColor: '#e8f4f8',
        borderRadius: '4px',
        fontSize: '0.9rem'
      }}>
        <p><strong>📝 Instructions:</strong></p>
        <ul>
          <li>Click the button above to fetch data</li>
          <li>Open your browser's Developer Console (F12)</li>
          <li>Look for the console.log outputs starting with 📊</li>
          <li>This will show you the exact structure of the Stats data</li>
        </ul>
      </div>

      {data && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <h3>📋 Data Preview:</h3>
          <pre style={{ fontSize: '0.8rem', wordWrap: 'break-word' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default StatsDataViewer;
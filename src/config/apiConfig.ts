// src/config/apiConfig.ts
export const API_CONFIG = {
  // Your new App Script URL
    baseUrl: 'https://script.google.com/macros/s/AKfycbykQxH3CjAjDW9zWQ9MhGsXLjPL8e3t_iVOO6hjT6R9w2NrhR46BEaadpNaglZooiA/exec',
    fallbackUrl: 'https://corsproxy.io/?' + encodeURIComponent('https://script.google.com/macros/s/AKfycbykQxH3CjAjDW9zWQ9MhGsXLjPL8e3t_iVOO6hjT6R9w2NrhR46BEaadpNaglZooiA/exec'),

  
  // Cache keys
  METADATA_KEY: 'cricket_data_metadata',
  SUMMARY_KEY: 'cricket_data_summary',
  PLAYERS_KEY: 'cricket_data_players',
  PLAYER_PREFIX: 'cricket_player_',
  MATCH_KEY: 'last_match_data',
  MATCH_METADATA_KEY: 'last_match_metadata'
};

// Helper function to clear all caches
export const clearAllCaches = (): void => {
  // Clear known keys
  localStorage.removeItem(API_CONFIG.METADATA_KEY);
  localStorage.removeItem(API_CONFIG.SUMMARY_KEY);
  localStorage.removeItem(API_CONFIG.PLAYERS_KEY);
  localStorage.removeItem(`${API_CONFIG.SUMMARY_KEY}_timestamp`);
  localStorage.removeItem(`${API_CONFIG.PLAYERS_KEY}_timestamp`);
  localStorage.removeItem(API_CONFIG.MATCH_KEY);
  localStorage.removeItem(API_CONFIG.MATCH_METADATA_KEY);
  localStorage.removeItem(`${API_CONFIG.MATCH_KEY}_timestamp`);
  
  // Clear player-specific caches
  const allKeys = Object.keys(localStorage);
  const playerKeys = allKeys.filter(key => 
    key.startsWith(API_CONFIG.PLAYER_PREFIX) || 
    key.includes('timestamp')
  );
  
  playerKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // console.log('All caches cleared successfully');
};
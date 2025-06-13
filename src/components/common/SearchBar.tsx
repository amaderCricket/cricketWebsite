// src/components/common/SearchBar.tsx - OPTIMIZED VERSION
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchItem {
  id: string;
  type: 'player' | 'page' | 'achievement';
  name: string;
  description?: string;
  imageUrl?: string;
  path: string;
  keywords?: string[];
}

interface SearchBarProps {
  players: {
    name: string;
    role: string;
    rank: number;
    imageUrl?: string;
  }[];
}

const SearchBar: React.FC<SearchBarProps> = ({ players }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Static pages - never changes
  const staticPages: SearchItem[] = [
    {
      id: 'home',
      type: 'page',
      name: 'Home',
      description: 'Homepage with team stats and hero section',
      path: '/',
      keywords: ['home', 'main', 'start', 'dashboard']
    },
    {
      id: 'players',
      type: 'page',
      name: 'Players',
      description: 'View all cricket players',
      path: '/players',
      keywords: ['players', 'team', 'members', 'roster']
    },
    {
      id: 'hall-of-fame',
      type: 'page',
      name: 'Hall of Fame',
      description: 'Achievements and records',
      path: '/hall-of-fame',
      keywords: ['hall', 'fame', 'records', 'achievements', 'excellence']
    },
    {
      id: 'leaderboard',
      type: 'page',
      name: 'Leaderboard',
      description: 'Player rankings and statistics',
      path: '/leaderboard',
      keywords: ['leaderboard', 'ranking', 'top', 'best', 'stats']
    }
  ];

  // Optimized search - no useMemo, direct filtering
  const performSearch = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    
    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }

    const results: SearchItem[] = [];
    
    // Search static pages first (fast)
    for (const page of staticPages) {
      if (results.length >= 8) break;
      
      const nameMatch = page.name.toLowerCase().includes(trimmedQuery);
      const descMatch = page.description?.toLowerCase().includes(trimmedQuery);
      const keywordMatch = page.keywords?.some(k => k.includes(trimmedQuery));
      
      if (nameMatch || descMatch || keywordMatch) {
        results.push(page);
      }
    }
    
    // Search players only if needed and limit results
    if (results.length < 8 && players.length > 0) {
      let playerCount = 0;
      const maxPlayers = 6; // Limit player results
      
      for (const player of players) {
        if (playerCount >= maxPlayers || results.length >= 8) break;
        
        const nameMatch = player.name.toLowerCase().includes(trimmedQuery);
        const roleMatch = player.role.toLowerCase().includes(trimmedQuery);
        
        if (nameMatch || roleMatch) {
          results.push({
            id: player.name,
            type: 'player',
            name: player.name,
            description: `${player.role} • Rank #${player.rank}`,
            imageUrl: player.imageUrl,
            path: `/players/${player.name}`,
            keywords: [player.name.toLowerCase(), player.role.toLowerCase()]
          });
          playerCount++;
        }
      }
    }

    // Simple sort - exact matches first, then alphabetical
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === trimmedQuery;
      const bExact = b.name.toLowerCase() === trimmedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Players first
      if (a.type === 'player' && b.type !== 'player') return -1;
      if (a.type !== 'player' && b.type === 'player') return 1;
      
      return a.name.localeCompare(b.name);
    });

    setSearchResults(results);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]); // Only depend on players

  // Debounced input handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce search for better performance
    if (value.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    // Small delay to avoid excessive searching
    const timeoutId = setTimeout(() => performSearch(value), 150);
    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleResultClick = (item: SearchItem) => {
    navigate(item.path);
    setQuery('');
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Group results by type
  const groupedResults = searchResults.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'player': return 'person';
      case 'page': return 'web';
      case 'achievement': return 'emoji_events';
      default: return 'search';
    }
  };

  return (
    <div className="expandable-search" ref={searchContainerRef}>
      <button 
        className="search-toggle"
        onClick={toggleDropdown}
        aria-label={isOpen ? "Close search" : "Open search"}
      >
        <i className="material-icons">search</i>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="search-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="search-input-wrapper">
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={handleInputChange}
                placeholder="Search players, pages, and more..."
                className="search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleResultClick(searchResults[0]);
                  }
                }}
              />
            </div>

            <div className="search-results">
              {query && searchResults.length === 0 ? (
                <div className="no-results">
                  No results found for "{query}"
                </div>
              ) : (
                Object.entries(groupedResults).map(([type, items]) => (
                  <div key={type} className="results-section">
                    <div className="section-title">
                      {type === 'player' ? 'Players' : type === 'page' ? 'Pages' : 'Other'}
                    </div>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="search-result-item"
                        onClick={() => handleResultClick(item)}
                      >
                        {item.type === 'player' && item.imageUrl ? (
                          <div 
                            className="result-image"
                            style={{ backgroundImage: `url(${item.imageUrl})` }}
                          />
                        ) : (
                          <div className="result-icon">
                            <i className="material-icons">{renderIcon(item.type)}</i>
                          </div>
                        )}
                        <div className="result-info">
                          <div className="result-name">{item.name}</div>
                          {item.description && (
                            <div className="result-description">{item.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
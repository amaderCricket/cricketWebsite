
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

  // Define searchable pages and features
// Define searchable pages and features
  const searchableItems: SearchItem[] = useMemo(() => [
    // Pages
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
    },
    // Add players to searchable items
    ...players.map(player => ({
      id: player.name,
      type: 'player' as const,
      name: player.name,
      description: `${player.role} • Rank #${player.rank}`,
      imageUrl: player.imageUrl,
      path: `/players/${player.name}`,
      keywords: [player.name.toLowerCase(), player.role.toLowerCase()]
    }))
  ], [players]);

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

  const performSearch = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    
    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }

    const filtered = searchableItems.filter(item => {
      // Search in name and description
      const nameMatch = item.name.toLowerCase().includes(trimmedQuery);
      const descriptionMatch = item.description?.toLowerCase().includes(trimmedQuery);
      const keywordMatch = item.keywords?.some(keyword => keyword.includes(trimmedQuery));
      
      return nameMatch || descriptionMatch || keywordMatch;
    });

    // Sort results by relevance and type
    const sortedResults = filtered.sort((a, b) => {
      // Prioritize exact name matches
      const aExactMatch = a.name.toLowerCase() === trimmedQuery;
      const bExactMatch = b.name.toLowerCase() === trimmedQuery;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Then sort by type (players first)
      if (a.type === 'player' && b.type !== 'player') return -1;
      if (a.type !== 'player' && b.type === 'player') return 1;
      
      // Finally alphabetically
      return a.name.localeCompare(b.name);
    });

    setSearchResults(sortedResults.slice(0, 8)); // Limit results
  }, [searchableItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  };

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

  // Group results by type
  const groupedResults = searchResults.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'player':
        return 'person';
      case 'page':
        return 'web';
      case 'achievement':
        return 'emoji_events';
      default:
        return 'search';
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
// src/components/common/Header.tsx
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.png'
import { themeService, ThemeType } from '../../services/themeService'
import SearchBar from './SearchBar'
import { usePlayerData } from '../../hooks/usePlayerData'
import { getPlayerImage } from '../../utils/imageUtils'
import { cacheService } from '../../services/cacheService'


function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  

  const location = useLocation();
  const navigate = useNavigate();
  
  const { players } = usePlayerData();
  interface PlayerWithImage {
    name: string;
    role: string;
    rank: number;
    imageUrl: string;
  }

  const [playersWithImages, setPlayersWithImages] = useState<PlayerWithImage[]>([]);

  // Add this state inside the Header component
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('light');

  // Add this useEffect to initialize theme
  useEffect(() => {
    setCurrentTheme(themeService.getCurrentTheme());
  }, []);

  // Load player images
  useEffect(() => {
    const loadImages = async () => {
      if (players.length > 0) {
        const updatedPlayers = await Promise.all(
          players.map(async (player) => {
            const imageUrl = await cacheService.loadPlayerImage(player.name, getPlayerImage);
            return { 
              name: player.name,
              role: player.role,
              rank: player.rank,
              imageUrl
            };
          })
        );
        setPlayersWithImages(updatedPlayers);
      }
    };
    loadImages();
  }, [players]);

  // Add this function
  const handleThemeToggle = () => {
    const newTheme = themeService.toggleTheme();
    setCurrentTheme(newTheme);
  };
  
  const isHomePage = location.pathname === '/';
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Prevent scrolling when menu is open
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

const handleUpdateClick = async (e: React.MouseEvent) => {
  e.preventDefault();
  setIsUpdating(true);
  
  try {
    cacheService.forceUpdate(); 
  } finally {
    setIsUpdating(false);
  }
};
  
  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

   const handleDownloadClick = () => {
    window.open('https://drive.google.com/drive/folders/1UXZz8G37vvefFOcouNeSZOp1qlTYkDBC', '_blank');
  };
  
  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''} ${isHomePage ? 'home-page' : 'other-page'} ${menuOpen ? 'menu-open' : ''}`}>
      <div className="header-inner">
        {/* Move hamburger to the left */}
        <button 
          className={`mobile-menu-toggle ${menuOpen ? 'open' : ''}`} 
          onClick={toggleMenu} 
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
        
        {/* Only show logo in desktop view or inside menu */}
        <div className="desktop-logo">
          <Link to="/" className="logo">
            <img src={logo} alt="Amader Cricket" />
            <span>Amader Cricket</span>
          </Link>
        </div>

        {/* Full screen navigation menu */}
        <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
          {/* Show logo in mobile menu */}
          <div className="menu-header">
            <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
              <img src={logo} alt="Amader Cricket" />
              <span>Amader Cricket</span>
            </Link>
          </div>
          
          <ul className="nav-links">
            <li><button className={isActive('/') ? 'active' : ''} onClick={() => handleNavigation('/')}>Home</button></li>
            <li><button className={isActive('/stats') ? 'active' : ''} onClick={() => handleNavigation('/stats')}>Stats</button></li>
            <li><button className={isActive('/players') ? 'active' : ''} onClick={() => handleNavigation('/players')}>Players</button></li>
            <li><button className={isActive('/hall-of-fame') ? 'active' : ''} onClick={() => handleNavigation('/hall-of-fame')}>Hall of Fame</button></li>
            <li><button className={isActive('/leaderboard') ? 'active' : ''} onClick={() => handleNavigation('/leaderboard')}>Leaderboard</button></li>
            <li><button className={isActive('/rules') ? 'active' : ''} onClick={() => handleNavigation('/rules')}>Rules</button></li>
            
          </ul>
        </nav>

        {/* Right: Action Buttons */}
        <div className="action-buttons">
          {/* Search */}
          <SearchBar players={playersWithImages} />

          <button 
            className="download-button" 
            onClick={handleDownloadClick}
            aria-label="Download from Google Drive"
            title="Download from Google Drive"
          >
            <i className="material-icons">cloud_download</i>
          </button>
          
          {/* Theme Toggle Button */}
          <button 
            className="theme-toggle" 
            onClick={handleThemeToggle}
            aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`}
          >
            <i className="material-icons">
              {currentTheme === 'light' ? 'dark_mode' : 'light_mode'}
            </i>
          </button>
          
          {/* Update Button */}
          <div className="update-button-container">
            <a 
              href="#" 
              className={`update-button ${isUpdating ? 'updating' : ''}`} 
              onClick={handleUpdateClick}
              style={{ pointerEvents: isUpdating ? 'none' : 'auto' }}
            >
              <i className="material-icons">
                {isUpdating ? 'hourglass_empty' : 'refresh'}
              </i>
              <span>{isUpdating ? 'Updating...' : 'Update'}</span>
            </a>
          </div>
        </div>

      </div>
    </header>
  )
}

export default Header
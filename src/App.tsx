// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, Suspense } from 'react'
import Home from './pages/Home'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Leaderboard from './pages/Leaderboard'
import HallOfFame  from './pages/HallofFame'

import { themeService } from './services/themeService'
import { fontService } from './services/fontService'
import { useCacheInitializer } from './hooks/useCacheInitializer'
import { prefetchMatchData } from './services/matchDataService'
import {cacheService} from './services/cacheService'

import Header from './components/common/Header'
import Footer from './components/common/Footer'
import GoToTop from './components/common/GoToTop'

import './App.scss'

// Lightweight loading component
const LightLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '80vh'
  }}>
    {/* Intentionally empty for faster loading */}
  </div>
);

function App() {
  const { isInitialized } = useCacheInitializer();
  
useEffect(() => {
  themeService.initializeTheme();
  fontService.initializeFonts();

  prefetchMatchData().catch(err => {
    console.error('Error prefetching match data:', err);
  });
  
  // Add this new code to preload top player images
  const preloadTopPlayerImages = async () => {
    try {
      // Fetch players data
      const playersData = await cacheService.fetchPlayers();
      
      if (playersData && playersData.stats && Array.isArray(playersData.stats)) {
        // Extract top 10 player names from the data
        const playerNames: string[] = [];
        const dataRows = playersData.stats.slice(1); // Skip header row
        
        for (let i = 0; i < Math.min(10, dataRows.length); i++) {
          const row = dataRows[i];
          if (row[0]) { // Assuming first column is player name
            playerNames.push(String(row[0]));
          }
        }
        
        // Preload images for these players
        if (playerNames.length > 0) {
          import('./utils/imageUtils').then(({ preloadPlayerImages }) => {
            preloadPlayerImages(playerNames);
          });
        }
      }
    } catch (error) {
      console.error('Error preloading player images:', error);
    }
  };
  
  // Start preloading after a short delay to not block initial render
  setTimeout(preloadTopPlayerImages, 1000);
}, []);
  

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main>
          {!isInitialized ? <LightLoader /> : (
            <Suspense fallback={<LightLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/players" element={<Players />} />
                <Route path="/players/:id" element={<PlayerDetail />} />
                <Route path="/hall-of-fame" element={<HallOfFame />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
              </Routes>
            </Suspense>
          )}
        </main>
        <Footer />
        
        {/* Add GoToTop component globally */}
        <GoToTop />
      </div>
    </BrowserRouter>
  )
}

export default App
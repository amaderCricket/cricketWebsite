// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, Suspense } from 'react'
import Home from './pages/Home'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Leaderboard from './pages/Leaderboard'
import HallOfFame  from './pages/HallofFame'
import Rules from './pages/Rules'
import Stats from './pages/Stats'

import { themeService } from './services/themeService'
import { fontService } from './services/fontService'

import { prefetchMatchData } from './services/matchDataService'
import {cacheService} from './services/cacheService'

import Header from './components/common/Header'
import Footer from './components/common/Footer'
import GoToTop from './components/common/GoToTop'

import './App.scss'
import Preloader from './components/common/PreLoader'


function App() {

cacheService.init();
  
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
  preloadTopPlayerImages(); 
  
  
}, []);
  

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main>
          
            <Suspense fallback={<Preloader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/players" element={<Players />} />
                <Route path="/players/:id" element={<PlayerDetail />} />
                <Route path="/hall-of-fame" element={<HallOfFame />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/stats" element={<Stats />} />
                {/* Add more routes as needed */}
               
                
              </Routes>
            </Suspense>
        
        </main>
        <Footer />
        
        {/* Add GoToTop component globally */}
        <GoToTop />
      </div>
    </BrowserRouter>
  )
}

export default App
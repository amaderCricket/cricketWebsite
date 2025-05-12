// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Leaderboard from './pages/Leaderboard'
import HallOfFame  from './pages/HallofFame'

import { themeService } from './services/themeService'
import { fontService } from './services/fontService'
import { useCacheInitializer } from './hooks/useCacheInitializer'
import { prefetchMatchData } from './services/matchDataService'


import Header from './components/common/Header'
import Footer from './components/common/Footer'
import GoToTop from './components/common/GoToTop'
import Preloader from './components/common/PreLoader'

import './App.scss'

function App() {
  const { isInitialized } = useCacheInitializer();
  
  useEffect(() => {
    themeService.initializeTheme();
    fontService.initializeFonts();

     prefetchMatchData().catch(err => {
      console.error('Error prefetching match data:', err);
    });
  }, []);
  

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main>
          {!isInitialized && <Preloader />}
          {isInitialized && (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/players" element={<Players />} />
              <Route path="/players/:id" element={<PlayerDetail />} />
              <Route path="/hall-of-fame" element={<HallOfFame />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
          )}
        </main>
        <Footer />
        
        {/* Add GoToTop component globally */}
        <GoToTop />
        
        {/* Auto-dismissing toast that uses CSS animations */}
 
      </div>
    </BrowserRouter>
  )
}

export default App
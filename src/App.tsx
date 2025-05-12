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

    // Start prefetch in background without blocking
    setTimeout(() => {
      prefetchMatchData().catch(err => {
        console.error('Error prefetching match data:', err);
      });
    }, 2000);
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
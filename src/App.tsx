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

import { cacheService } from './services/cacheService'
import { useCacheInitializer } from './hooks/useCacheInitializer'

import Header from './components/common/Header'
import Footer from './components/common/Footer'
import GoToTop from './components/common/GoToTop'

import './App.scss'
import Preloader from './components/common/PreLoader'

function App() {
  // Initialize cache and get loading state
  const { isInitialized, isUpdating } = useCacheInitializer();

  cacheService.init();
  
  useEffect(() => {
    themeService.initializeTheme();
    fontService.initializeFonts();


    
    // Image preloading will be handled by useCacheInitializer
  }, []);

  // Block app rendering until critical data is loaded
  if (!isInitialized) {
    return <Preloader />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        {/* Show update indicator when data is being refreshed */}
        {isUpdating && (
          <div className="update-toast show">
            <div className="update-toast-content">
              <span>Updating data...</span>
            </div>
          </div>
        )}
        
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
// src/pages/Home.tsx
import { useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import TeamStats from '../components/home/TeamStats';
import LastMatchCard from '../components/home/LastMatchCard';
import { useDataFetcher } from '../hooks/useDataFetcher';
import { cacheService } from '../services/cacheService';
import StatsDataViewer from '../components/temp/StatsDataViewer'; // Import StatsDataViewer for debugging



function Home() {

  const { refreshData } = useDataFetcher();
    
    // Listen for cache updates
    useEffect(() => {
      const removeListener = cacheService.onUpdate(() => {
        // console.log("Home: Cache update detected, refreshing data");
        refreshData();
      });
      
      return () => removeListener();
    }, [refreshData]);

  return (
    <div className="home-page">
      <HeroSection />
      <div className="container">
        <section className="section">
          <TeamStats />
          <LastMatchCard />
          <StatsDataViewer />
         
        </section>
      </div>
      
    </div>
  );
}

export default Home;
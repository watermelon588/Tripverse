import React, { useState, useEffect } from 'react';
import { Trip, TripFormData } from './types/trip';
import { fetchDemoTrip } from './services/tripService';
import { FALLBACK_DEMO_TRIP } from './data/fallbackTrip';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { CreateTrip } from './pages/CreateTrip';
import { TripUniverse } from './pages/TripUniverse';

type ViewState = 'home' | 'explore' | 'create' | 'universe';

const getViewFromPath = (): ViewState => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  if (path === '/explore') return 'explore';
  if (path === '/create') return 'create';
  if (path === '/universe') return 'universe';
  return 'home';
};

export const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(getViewFromPath);
  const [tripData, setTripData] = useState<Trip>(FALLBACK_DEMO_TRIP);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync view state with browser URL pathname
  const navigateTo = (newView: ViewState) => {
    setView(newView);
    const targetPath = newView === 'home' ? '/' : `/${newView}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setView(getViewFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load demo trip graph from FastAPI backend
  const loadTripData = async () => {
    setIsLoading(true);
    const result = await fetchDemoTrip();
    setTripData(result.data);
    setIsBackendConnected(result.isBackendConnected);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTripData();
  }, []);

  const handleBuildUniverse = (formData: TripFormData) => {
    // Merge user form inputs into the active trip data
    setTripData((prev) => ({
      ...prev,
      destination: formData.destination || prev.destination,
      days: formData.days || prev.days,
      budget: formData.budget || prev.budget,
    }));
    navigateTo('universe');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {view === 'home' && (
        <Home
          onStartPlanning={() => navigateTo('create')}
          onNavigateExplore={() => navigateTo('explore')}
        />
      )}
      {view === 'explore' && (
        <Explore
          onStartPlanning={() => navigateTo('create')}
          onNavigateHome={() => navigateTo('home')}
        />
      )}
      {view === 'create' && (
        <CreateTrip onBuildUniverse={handleBuildUniverse} />
      )}
      {view === 'universe' && (
        <TripUniverse
          tripData={tripData}
          isBackendConnected={isBackendConnected}
          onBackToForm={() => navigateTo('create')}
          onRefreshData={loadTripData}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default App;

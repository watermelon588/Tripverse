import React, { useState, useEffect } from 'react';
import { Trip, TripFormData } from './types/trip';
import { fetchDemoTrip } from './services/tripService';
import { FALLBACK_DEMO_TRIP } from './data/fallbackTrip';
import { CreateTrip } from './pages/CreateTrip';
import { TripUniverse } from './pages/TripUniverse';

export const App: React.FC = () => {
  const [view, setView] = useState<'create' | 'universe'>('create');
  const [tripData, setTripData] = useState<Trip>(FALLBACK_DEMO_TRIP);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    setView('universe');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {view === 'create' ? (
        <CreateTrip onBuildUniverse={handleBuildUniverse} />
      ) : (
        <TripUniverse
          tripData={tripData}
          isBackendConnected={isBackendConnected}
          onBackToForm={() => setView('create')}
          onRefreshData={loadTripData}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default App;

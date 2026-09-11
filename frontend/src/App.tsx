import React, { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { CreateTrip } from './pages/CreateTrip';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfilePage } from './pages/ProfilePage';

type ViewState = 'home' | 'explore' | 'create' | 'login' | 'signup' | 'profile';

const getViewFromPath = (): ViewState => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  if (path === '/explore') return 'explore';
  if (path === '/create') return 'create';
  if (path === '/login') return 'login';
  if (path === '/signup') return 'signup';
  if (path === '/profile') return 'profile';
  return 'home';
};

export const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(getViewFromPath);

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

  return (
    <div className="min-h-screen bg-white text-[#1F1E1E] font-sans antialiased">
      {view === 'home' && (
        <Home
          onStartPlanning={() => navigateTo('create')}
          onNavigateExplore={() => navigateTo('explore')}
          onNavigateLogin={() => navigateTo('login')}
          onNavigateSignup={() => navigateTo('signup')}
          onNavigateProfile={() => navigateTo('profile')}
        />
      )}
      {view === 'explore' && (
        <Explore
          onStartPlanning={() => navigateTo('create')}
          onNavigateHome={() => navigateTo('home')}
        />
      )}
      {view === 'login' && (
        <LoginPage
          onNavigateSignup={() => navigateTo('signup')}
          onNavigateHome={() => navigateTo('home')}
          onSuccess={() => navigateTo('create')}
        />
      )}
      {view === 'signup' && (
        <SignupPage
          onNavigateLogin={() => navigateTo('login')}
          onNavigateHome={() => navigateTo('home')}
          onSuccess={() => navigateTo('create')}
        />
      )}
      {view === 'profile' && (
        <ProfilePage
          onNavigateHome={() => navigateTo('home')}
          onNavigateExplore={() => navigateTo('explore')}
          onStartPlanning={() => navigateTo('create')}
        />
      )}
      {view === 'create' && (
        <CreateTrip
          onNavigateHome={() => navigateTo('home')}
          onNavigateExplore={() => navigateTo('explore')}
          onNavigateProfile={() => navigateTo('profile')}
          onNavigateLogin={() => navigateTo('login')}
          onNavigateSignup={() => navigateTo('signup')}
        />
      )}
    </div>
  );
};

export default App;

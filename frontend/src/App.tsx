import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RouteCurtain, type RouteCurtainHandle } from './components/common/RouteCurtain';
import { HomeV2 } from './components/home/v2/HomeV2';
import { Explore } from './pages/Explore';
import { CreateTrip } from './pages/CreateTrip';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfilePage } from './pages/ProfilePage';

type ViewState = 'home' | 'explore' | 'create' | 'login' | 'signup' | 'profile';

const VIEW_LABELS: Record<ViewState, string> = {
  home: 'Home',
  explore: 'Explore',
  create: 'Planner',
  login: 'Sign in',
  signup: 'Create account',
  profile: 'Account',
};

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
  const curtain = useRef<RouteCurtainHandle>(null);

  // Every route change runs through the shared curtain transition.
  const transitionTo = useCallback((next: ViewState) => {
    const swap = () => {
      setView(next);
      // The outgoing page's pins and triggers are gone; re-measure the new one.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    if (!curtain.current) return swap();
    curtain.current.play(VIEW_LABELS[next], swap);
  }, []);

  const navigateTo = (newView: ViewState) => {
    if (newView === view) return;
    const targetPath = newView === 'home' ? '/' : `/${newView}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    transitionTo(newView);
  };

  useEffect(() => {
    const handlePopState = () => transitionTo(getViewFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [transitionTo]);

  return (
    <div className="min-h-screen antialiased">
      <RouteCurtain ref={curtain} />
      {view === 'home' && (
        <HomeV2
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
          onNavigateProfile={() => navigateTo('profile')}
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

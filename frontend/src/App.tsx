import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RouteCurtain, type RouteCurtainHandle } from './components/common/RouteCurtain';
import { HomeV2 } from './components/home/v2/HomeV2';
import { Explore } from './pages/Explore';
import { CreateTrip } from './pages/CreateTrip';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { TripLibrary } from './pages/TripLibrary';
import { GuidePage } from './pages/GuidePage';
import { useAuth } from './context/AuthContext';

type ViewState = 'home' | 'explore' | 'create' | 'login' | 'signup' | 'reset-password' | 'profile' | 'trips' | 'guide';

const VIEW_LABELS: Record<ViewState, string> = {
  home: 'Home',
  explore: 'Explore',
  create: 'Planner',
  login: 'Sign in',
  signup: 'Create account',
  'reset-password': 'Reset password',
  profile: 'Account',
  trips: 'Your trips',
  guide: 'Guide',
};

const getViewFromPath = (): ViewState => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  if (path === '/explore') return 'explore';
  if (path === '/create') return 'create';
  if (path === '/login') return 'login';
  if (path === '/signup') return 'signup';
  if (path === '/reset-password') return 'reset-password';
  if (path === '/profile') return 'profile';
  if (path === '/trips') return 'trips';
  if (path === '/guide') return 'guide';
  return 'home';
};

export const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(getViewFromPath);
  const { user, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (view === 'profile' && !authLoading && !user) {
      window.history.replaceState({}, '', '/login');
      transitionTo('login');
    }
  }, [view, authLoading, user, transitionTo]);

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
          onNavigateTrips={() => navigateTo('trips')}
        />
      )}
      {view === 'login' && (
        <LoginPage
          onNavigateSignup={() => navigateTo('signup')}
          onNavigateHome={() => navigateTo('home')}
          onSuccess={() => navigateTo('profile')}
        />
      )}
      {view === 'signup' && (
        <SignupPage
          onNavigateLogin={() => navigateTo('login')}
          onNavigateHome={() => navigateTo('home')}
          onSuccess={() => navigateTo('profile')}
        />
      )}
      {view === 'reset-password' && (
        <ResetPasswordPage
          onNavigateHome={() => navigateTo('home')}
          onNavigateLogin={() => navigateTo('login')}
          onSuccess={() => navigateTo('profile')}
        />
      )}
      {view === 'profile' && !authLoading && user && (
        <ProfilePage
          onNavigateHome={() => navigateTo('home')}
          onNavigateExplore={() => navigateTo('explore')}
          onStartPlanning={() => navigateTo('create')}
          onNavigateTrips={() => navigateTo('trips')}
        />
      )}
      {view === 'trips' && (
        <TripLibrary
          onNavigateHome={() => navigateTo('home')}
          onNavigateExplore={() => navigateTo('explore')}
          onNavigateProfile={() => navigateTo('profile')}
          onStartPlanning={() => navigateTo('create')}
          onOpenTrip={(tripId) => {
            localStorage.setItem('tripverse-active-session-id', `session-${tripId}`);
            navigateTo('create');
          }}
        />
      )}
      {view === 'guide' && (
        <GuidePage
          onNavigateHome={() => navigateTo('home')}
          onNavigateExplore={() => navigateTo('explore')}
          onNavigateProfile={() => navigateTo('profile')}
          onNavigateTrips={() => navigateTo('trips')}
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

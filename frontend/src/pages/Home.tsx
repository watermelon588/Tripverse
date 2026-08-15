import { useEffect, useState } from 'react';
import { About } from '../components/home/About';
import { Hero } from '../components/home/Hero';
import { MobileSidebar } from '../components/home/MobileSidebar';
import { Navbar } from '../components/home/Navbar';
import { useLenis } from '../hooks/useLenis';

interface HomeProps {
  onStartPlanning: () => void;
  onNavigateExplore?: () => void;
}

export function Home({ onStartPlanning, onNavigateExplore }: HomeProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useLenis(true);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#1f1e1e';

    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleGetStarted = () => {
    setSidebarOpen(false);
    onStartPlanning();
  };

  return (
    <div className="home-page">
      <Navbar
        scrolled={scrolled}
        onMenuOpen={() => setSidebarOpen(true)}
        onGetStarted={handleGetStarted}
        onNavigateExplore={onNavigateExplore}
      />

      <MobileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onGetStarted={handleGetStarted}
        onLogin={() => setSidebarOpen(false)}
        onNavigateExplore={onNavigateExplore}
      />

      <main>
        <Hero
          onStartPlanning={handleGetStarted}
          onPlayVideo={() => {
            /* Placeholder — video asset not in scope */
          }}
        />
        <About />
      </main>
    </div>
  );
}

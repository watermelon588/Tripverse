import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from '../hooks/useLenis';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Navbar } from '../components/home/Navbar';
import { MobileSidebar } from '../components/home/MobileSidebar';
import { ScrollExpand } from '../components/common/ScrollExpand';

// Unsplash Media Photography Assets from media/
import heroBg from '@media/david-emrich-VCM99u6HltA-unsplash.jpg';
import alpineImg from '@media/pema-g-lama-6cfK0SEtpbY-unsplash.jpg';
import urbanImg from '@media/matthieu-buhler-PaFHv0Zi71E-unsplash.jpg';
import coastalImg from '@media/shigeki-wakabayashi-6nuz52vsbWc-unsplash.jpg';
import culturalImg from '@media/jj-ying-9Qwbfa_RM94-unsplash.jpg';
import alexandruImg from '@media/alexandru-bogdan-ghita-UeYkqQh4PoI-unsplash.jpg';
import benImg from '@media/ben-klewais-nLE3eLaQA6A-unsplash.jpg';
import bilderbokenImg from '@media/bilderboken-rlwE8f8anOc-unsplash.jpg';
import bradyImg from '@media/brady-bellini-t5dGNNQVwg8-unsplash.jpg';
import calebImg from '@media/caleb-JmuyB_LibRo-unsplash.jpg';
import christophImg from '@media/christoph-schulz-7tb-b37yHx4-unsplash.jpg';
import fredyImg from '@media/fredy-martinez-frd7WNzipdU-unsplash.jpg';
import jamesImg from '@media/james-wilkinson-FMuorhl0EHY-unsplash.jpg';
import jayImg from '@media/jay-wennington-N_Y88TWmGwA-unsplash.jpg';
import kateImg from '@media/kate-trysh-U3CntDq16yY-unsplash.jpg';
import mountainGirlImg from '@media/mountain-girl-WfT3o1KhnwQ-unsplash.jpg';
import pedroImg from '@media/pedro-lastra-5g8dJvtYRYA-unsplash.jpg';
import philippImg from '@media/philipp-trubchenko-oOTo9nR7f9Q-unsplash.jpg';
import pierreImg from '@media/pierre-blache-VMNG8BYFQfs-unsplash.jpg';
import vojtechImg from '@media/vojtech-bruzek-Yrxr3bsPdS0-unsplash.jpg';
import willImg from '@media/will-goodman-1EikowqH9fs-unsplash.jpg';

import '../styles/explore.css';

gsap.registerPlugin(ScrollTrigger);

type Category = 'All' | 'Alpine & Peaks' | 'Urban Architecture' | 'Coastal & Seas' | 'Cultural Passages';

interface DestinationItem {
  id: string;
  category: Category;
  title: string;
  region: string;
  coordinates: string;
  description: string;
  image: string;
  spanClass: string;
  elevation?: string;
  duration?: string;
}

const DESTINATIONS: DestinationItem[] = [
  {
    id: 'dest-1',
    category: 'Alpine & Peaks',
    title: 'Himalayan Ridge Passage',
    region: 'ANNAPURNA, NEPAL',
    coordinates: '28.5300° N, 83.8780° E',
    description: 'High-altitude trails weaving through ancient rhododendron forests, glacier valleys, and sacred peaks.',
    image: alpineImg,
    spanClass: 'explore-card--span-8',
    elevation: '4,130m',
    duration: '12 Days',
  },
  {
    id: 'dest-2',
    category: 'Urban Architecture',
    title: 'Tokyo Neon & Shadows',
    region: 'SHINJUKU, JAPAN',
    coordinates: '35.6938° N, 139.7034° E',
    description: 'Futuristic urban geometry, quiet alleyway shrines, and night-scape architecture of metropolitan Tokyo.',
    image: urbanImg,
    spanClass: 'explore-card--span-4',
    elevation: '45m',
    duration: '5 Days',
  },
  {
    id: 'dest-3',
    category: 'Coastal & Seas',
    title: 'Arashiyama Bamboo Coast',
    region: 'KYOTO, JAPAN',
    coordinates: '35.0116° N, 135.6777° E',
    description: 'Serene bamboo groves running parallel to mist-covered riverbanks and traditional wooden teahouses.',
    image: coastalImg,
    spanClass: 'explore-card--span-4',
    elevation: '110m',
    duration: '4 Days',
  },
  {
    id: 'dest-4',
    category: 'Cultural Passages',
    title: 'Lijiang Naxi Odyssey',
    region: 'YUNNAN, CHINA',
    coordinates: '26.8721° N, 100.2297° E',
    description: 'Cobblestone waterways, Naxi traditional music heritage, and snow-capped Jade Dragon mountain backdrop.',
    image: culturalImg,
    spanClass: 'explore-card--span-8',
    elevation: '2,400m',
    duration: '7 Days',
  },
  {
    id: 'dest-5',
    category: 'Alpine & Peaks',
    title: 'Andean Highland Ridge',
    region: 'PERUVIAN ANDES',
    coordinates: '13.1631° S, 72.5450° W',
    description: 'Ancient mountain passages winding through cloud forests, granite citadel ruins, and jagged peaks.',
    image: fredyImg,
    spanClass: 'explore-card--span-6',
    elevation: '3,800m',
    duration: '9 Days',
  },
  {
    id: 'dest-6',
    category: 'Urban Architecture',
    title: 'Metropolitan Tower Skyline',
    region: 'FINANCIAL DISTRICT',
    coordinates: '51.5074° N, 0.1278° W',
    description: 'Striking modern glass facades juxtaposed against historic stone arches and urban geometry.',
    image: jamesImg,
    spanClass: 'explore-card--span-6',
    elevation: '60m',
    duration: '4 Days',
  },
  {
    id: 'dest-7',
    category: 'Coastal & Seas',
    title: 'Amalfi Cliffside Passage',
    region: 'CAMPANIA, ITALY',
    coordinates: '40.6340° N, 14.6027° E',
    description: 'Pastel villages clinging to dramatic sea cliffs above crystal-clear Tyrrhenian waters.',
    image: jayImg,
    spanClass: 'explore-card--span-4',
    elevation: '250m',
    duration: '6 Days',
  },
  {
    id: 'dest-8',
    category: 'Cultural Passages',
    title: 'Bavarian Citadel Valley',
    region: 'BAVARIA, GERMANY',
    coordinates: '47.5576° N, 10.7498° E',
    description: 'Alpine fairytales, medieval stone towers, and dense pine forests steeped in history.',
    image: kateImg,
    spanClass: 'explore-card--span-8',
    elevation: '800m',
    duration: '7 Days',
  },
  {
    id: 'dest-9',
    category: 'Alpine & Peaks',
    title: 'Patagonian Glacial Basin',
    region: 'TORRES DEL PAINE',
    coordinates: '51.2532° S, 72.9862° W',
    description: 'Sheer granite needles rising out of turquoise ice lakes and wind-swept southern plains.',
    image: mountainGirlImg,
    spanClass: 'explore-card--span-8',
    elevation: '2,800m',
    duration: '10 Days',
  },
  {
    id: 'dest-10',
    category: 'Urban Architecture',
    title: 'Gothic Modernity',
    region: 'BARCELONA, SPAIN',
    coordinates: '41.3879° N, 2.1699° E',
    description: 'Intricate stone masonry, organic Modernisme facades, and sunlit Mediterranean avenues.',
    image: pedroImg,
    spanClass: 'explore-card--span-4',
    elevation: '12m',
    duration: '5 Days',
  },
  {
    id: 'dest-11',
    category: 'Cultural Passages',
    title: 'Kyoto Temple Sanctuaries',
    region: 'HIGASHIYAMA, JAPAN',
    coordinates: '34.9948° N, 135.7850° E',
    description: 'Edo-period wooden architecture, mossy zen gardens, and vermilion shrine gates.',
    image: philippImg,
    spanClass: 'explore-card--span-6',
    elevation: '140m',
    duration: '5 Days',
  },
  {
    id: 'dest-12',
    category: 'Coastal & Seas',
    title: 'Breton Sea Watch',
    region: 'BRITTANY, FRANCE',
    coordinates: '48.3904° N, 4.4861° W',
    description: 'Granite lighthouses withstanding roaring Atlantic tides along rugged coastal headlands.',
    image: pierreImg,
    spanClass: 'explore-card--span-6',
    elevation: '35m',
    duration: '4 Days',
  },
  {
    id: 'dest-13',
    category: 'Cultural Passages',
    title: 'Prague Spire Network',
    region: 'BOHEMIA, CZECHIA',
    coordinates: '50.0755° N, 14.4378° E',
    description: 'Cobblestone bridges over mist-filled rivers, gothic watchtowers, and centuries of artisan craft.',
    image: vojtechImg,
    spanClass: 'explore-card--span-4',
    elevation: '190m',
    duration: '4 Days',
  },
  {
    id: 'dest-14',
    category: 'Alpine & Peaks',
    title: 'Highland Glen Passage',
    region: 'SCOTTISH HIGHLANDS',
    coordinates: '56.6826° N, 5.1023° W',
    description: 'Moody lochs, heather-covered mountain slopes, and ancient clan strongholds.',
    image: willImg,
    spanClass: 'explore-card--span-8',
    elevation: '1,100m',
    duration: '8 Days',
  },
];

const HORIZONTAL_SHOWCASE = [
  {
    title: 'Transylvanian Pines',
    region: 'ROMANIA',
    image: alexandruImg,
    description: 'Mist-shrouded Carpathian ridges & ancient forests.',
  },
  {
    title: 'Pacific Northwest',
    region: 'OREGON, USA',
    image: benImg,
    description: 'Towering evergreen canopies & alpine rivers.',
  },
  {
    title: 'Scandinavian Fjord',
    region: 'NORWAY',
    image: bilderbokenImg,
    description: 'Mirror glacial waters & dramatic sea cliffs.',
  },
  {
    title: 'Yosemite Monoliths',
    region: 'CALIFORNIA',
    image: bradyImg,
    description: 'Sheer granite walls & ancient sequoia groves.',
  },
  {
    title: 'Obsidian Coast',
    region: 'ICELAND',
    image: calebImg,
    description: 'Black sand headlands & volcanic ocean spray.',
  },
  {
    title: 'Brandenburg Node',
    region: 'BERLIN',
    image: christophImg,
    description: 'Historic stone colonnades & modern culture.',
  },
];

interface ExploreProps {
  onStartPlanning: () => void;
  onNavigateHome?: () => void;
}

export function Explore({ onStartPlanning, onNavigateHome }: ExploreProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Enable smooth Lenis scrolling
  useLenis(true);

  const filteredDestinations =
    selectedCategory === 'All'
      ? DESTINATIONS
      : DESTINATIONS.filter((item) => item.category === selectedCategory);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.explore-reveal', {
        opacity: 0,
        y: 35,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [selectedCategory, reducedMotion]);

  return (
    <div ref={containerRef} className="explore-page">
      {/* Persistent Fixed Navigation Bar */}
      <Navbar
        scrolled={scrolled}
        onMenuOpen={() => setMobileMenuOpen(true)}
        onGetStarted={onStartPlanning}
        onNavigateExplore={() => setSelectedCategory('All')}
        onNavigateHome={onNavigateHome}
      />

      {/* Mobile Drawer */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onGetStarted={() => {
          setMobileMenuOpen(false);
          onStartPlanning();
        }}
        onLogin={() => setMobileMenuOpen(false)}
        onNavigateHome={() => {
          setMobileMenuOpen(false);
          onNavigateHome?.();
        }}
      />

      {/* ScrollExpand Hero Component */}
      <div style={{ minHeight: '100vh' }}>
        <ScrollExpand
          src={heroBg}
          alt="Explore the Universe"
          title="EXPLORE THE UNIVERSE"
          scrollHint="Scroll to expand"
          useWindowScroll={true}
          startWidth={50}
          startHeight={65}
          startRadius={0}
          endRadius={0}
          mediaZoom={1.3}
        >
          <p className="explore-hero__kicker" style={{ color: '#fff', opacity: 0.9 }}>
            Editorial Curation
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 6rem)', textTransform: 'uppercase', margin: '0.5rem 0 1rem 0' }}>
            UNBOUND JOURNEYS
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1rem, 1.3vw, 1.35rem)', maxWidth: '55ch', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2rem' }}>
            Uncovering extraordinary landscapes, architecture, and spatial travel experiences across the globe.
          </p>
          <button
            type="button"
            className="explore-card__action"
            onClick={onStartPlanning}
            style={{ cursor: 'pointer' }}
          >
            Start Planning →
          </button>
        </ScrollExpand>
      </div>

      {/* Persistent Side-Bordered Frame Wrapper */}
      <div className="explore-frame">
        {/* Horizontal Scroll Showcase Section */}
        <section className="explore-horizontal-section">
          <div className="home-container">
            <div className="explore-horizontal-header">
              <h2 className="explore-horizontal-title">CURATED HORIZONS</h2>
              <span className="explore-horizontal-hint">Drag or scroll horizontally →</span>
            </div>
            <div className="explore-horizontal-track">
              {HORIZONTAL_SHOWCASE.map((item, idx) => (
                <div
                  key={idx}
                  className="explore-horizontal-card"
                  onClick={onStartPlanning}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="explore-horizontal-card__img"
                    loading="lazy"
                  />
                  <div className="explore-horizontal-card__overlay" />
                  <div className="explore-horizontal-card__content">
                    <div className="explore-horizontal-card__tag">{item.region}</div>
                    <h3 className="explore-horizontal-card__name">{item.title}</h3>
                    <p className="explore-horizontal-card__desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Filter Bar */}
        <section className="explore-filter">
          <div className="home-container explore-filter__inner">
            <div className="explore-filter__tabs" role="tablist" aria-label="Explore categories">
              {(['All', 'Alpine & Peaks', 'Urban Architecture', 'Coastal & Seas', 'Cultural Passages'] as Category[]).map(
                (cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={selectedCategory === cat}
                    type="button"
                    className={`explore-filter__btn ${selectedCategory === cat ? 'explore-filter__btn--active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
            <span className="explore-filter__count">
              {filteredDestinations.length} {filteredDestinations.length === 1 ? 'Destination' : 'Destinations'}
            </span>
          </div>
        </section>

        {/* Asymmetric Editorial Gallery Grid */}
        <section className="explore-grid-section">
          <div className="home-container">
            <div className="explore-grid">
              {filteredDestinations.map((item) => (
                <article
                  key={item.id}
                  className={`explore-card ${item.spanClass} explore-reveal`}
                  onClick={onStartPlanning}
                >
                  <div className="explore-card__image-wrap">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="explore-card__image"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="explore-card__overlay" />
                  </div>
                  <div className="explore-card__content">
                    <div className="explore-card__meta">
                      <span>{item.region}</span>
                      <span>•</span>
                      <span>{item.coordinates}</span>
                    </div>
                    <h2 className="explore-card__title">{item.title}</h2>
                    <p className="explore-card__description">{item.description}</p>
                    <button type="button" className="explore-card__action">
                      Plan This Journey →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Spotlight Section */}
        <section className="explore-spotlight">
          <div className="home-container">
            <div className="explore-spotlight__grid explore-reveal">
              <div className="explore-spotlight__media">
                <img
                  src={culturalImg}
                  alt="Featured Lijiang Odyssey"
                  className="explore-spotlight__image"
                  loading="lazy"
                />
              </div>
              <div className="explore-spotlight__info">
                <p className="explore-spotlight__tag">Featured Expedition</p>
                <h2 className="explore-spotlight__title">THE ANCIENT NAXI CORRIDOR</h2>
                <p className="explore-spotlight__text">
                  Journey beyond standard itineraries. Traverse high alpine ridges, ancient stone tea routes, and interactive spatial nodes mapped by TripVerse AI agents.
                </p>
                <div className="explore-spotlight__stats">
                  <div>
                    <div className="explore-spotlight__stat-val">14 Days</div>
                    <div className="explore-spotlight__stat-lbl">Duration</div>
                  </div>
                  <div>
                    <div className="explore-spotlight__stat-val">3,200m</div>
                    <div className="explore-spotlight__stat-lbl">Peak Elevation</div>
                  </div>
                  <div>
                    <div className="explore-spotlight__stat-val">Graph Ready</div>
                    <div className="explore-spotlight__stat-lbl">3D Spatial Map</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="explore-spotlight__cta"
                  onClick={onStartPlanning}
                >
                  Start Planning Expedition
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/*
 * Explore — v2 design system.
 *
 * An editorial index of routes people have built: filter rail, asymmetric
 * masonry of destination cards, and a closing CTA.
 *
 * The previous dataset was substantially mislabelled — an izakaya alley was
 * captioned "Himalayan Ridge Passage, Annapurna", a Japanese side street was
 * "Arashiyama Bamboo Coast", and Mount Fuji was "Lijiang, Yunnan". Every entry
 * below now describes the photograph it actually shows.
 */
import { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { useSmoothScroll } from '../hooks/useSmoothScroll';
import { AppBar } from '../components/common/AppBar';
import { img } from '../components/home/v2/content';
import { ArrowUpRightIcon, ClockIcon, PinIcon } from '../components/home/v2/IconsV2';
import { EASE, parallaxImage, prefersReducedMotion, revealHeadline } from '../components/home/v2/motion';

type Category = 'All' | 'Cities' | 'Nature' | 'Culture' | 'Stays & food';

interface Place {
  id: string;
  category: Exclude<Category, 'All'>;
  title: string;
  region: string;
  coords: string;
  nights: string;
  description: string;
  image: string;
  /** Column span in the 6-column masonry. */
  span: 2 | 3 | 4;
}

const PLACES: Place[] = [
  {
    id: 'kyoto-garden',
    category: 'Culture',
    title: 'Temple gardens and red bridges',
    region: 'KYOTO, JAPAN',
    coords: '35.0116° N, 135.7681° E',
    nights: '4 nights',
    description: 'Moss gardens, still water, and a vermilion bridge under maples turning at the edge of the season.',
    image: img.kyotoGarden,
    span: 4,
  },
  {
    id: 'porto-douro',
    category: 'Cities',
    title: 'The Douro from Ribeira',
    region: 'PORTO, PORTUGAL',
    coords: '41.1408° N, 8.6116° W',
    nights: '3 nights',
    description: 'Terracotta roofs stacked down to the waterfront, rabelo boats tied along the quay.',
    image: img.porto,
    span: 2,
  },
  {
    id: 'tokyo-alley',
    category: 'Cities',
    title: 'Back streets after the rain',
    region: 'TOKYO, JAPAN',
    coords: '35.6938° N, 139.7034° E',
    nights: '5 nights',
    description: 'Narrow lanes lit by signage, the quiet grid behind the crossings everyone photographs.',
    image: img.tokyoAlley,
    span: 2,
  },
  {
    id: 'alpine-lake',
    category: 'Nature',
    title: 'A lake village under the ridge',
    region: 'ALPINE LAKE COUNTRY',
    coords: '47.4800° N, 11.7600° E',
    nights: '4 nights',
    description: 'Pasture running to the shoreline, a single jetty, and the ferry that connects the far bank.',
    image: img.alpineLake,
    span: 4,
  },
  {
    id: 'prague-rooftops',
    category: 'Cities',
    title: 'Spires over the Old Town',
    region: 'PRAGUE, CZECHIA',
    coords: '50.0875° N, 14.4213° E',
    nights: '3 nights',
    description: 'Gothic towers catching first light above a roofscape of copper and clay.',
    image: img.prague,
    span: 3,
  },
  {
    id: 'seoul-palace',
    category: 'Culture',
    title: 'Palace eaves and painted beams',
    region: 'SEOUL, SOUTH KOREA',
    coords: '37.5796° N, 126.9770° E',
    nights: '5 nights',
    description: 'Dancheong paintwork under deep eaves, the grounds quiet before the gates open.',
    image: img.seoulPalace,
    span: 3,
  },
  {
    id: 'fuji-blossom',
    category: 'Nature',
    title: 'Fuji through the blossom',
    region: 'FUJIYOSHIDA, JAPAN',
    coords: '35.3606° N, 138.7274° E',
    nights: '2 nights',
    description: 'The cone framed by branches for the ten days a year the timing actually works.',
    image: img.blossomFuji,
    span: 2,
  },
  {
    id: 'budapest-aerial',
    category: 'Cities',
    title: 'Above the Buda rooftops',
    region: 'BUDAPEST, HUNGARY',
    coords: '47.5020° N, 19.0348° E',
    nights: '3 nights',
    description: 'Tiled church roofs and the river beyond, best walked in the hour before dusk.',
    image: img.budapest,
    span: 4,
  },
  {
    id: 'sydney-harbour',
    category: 'Cities',
    title: 'The harbour from the air',
    region: 'SYDNEY, AUSTRALIA',
    coords: '33.8568° S, 151.2153° E',
    nights: '6 nights',
    description: 'Ferries crossing between the bridge and the shells, the coastal track heading south.',
    image: img.sydney,
    span: 3,
  },
  {
    id: 'izakaya-lane',
    category: 'Stays & food',
    title: 'Lanterns along the izakaya lane',
    region: 'JAPAN',
    coords: '34.6687° N, 135.5031° E',
    nights: '2 nights',
    description: 'Paper lanterns, hand-written menus, and counters that seat eight people at most.',
    image: img.izakaya,
    span: 3,
  },
  {
    id: 'pagoda-fuji',
    category: 'Culture',
    title: 'Five storeys and a volcano',
    region: 'FUJIYOSHIDA, JAPAN',
    coords: '35.4003° N, 138.8000° E',
    nights: '2 nights',
    description: 'The pagoda above the town, with the mountain doing the rest of the work behind it.',
    image: img.pagoda,
    span: 2,
  },
  {
    id: 'luxembourg-dusk',
    category: 'Cities',
    title: 'River town at blue hour',
    region: 'LUXEMBOURG',
    coords: '49.6116° N, 6.1319° E',
    nights: '2 nights',
    description: 'Bridges lit along the valley floor, the old quarter stacked on the bluff above.',
    image: img.luxembourg,
    span: 4,
  },
  {
    id: 'dubai-marina',
    category: 'Cities',
    title: 'Towers on the marina',
    region: 'DUBAI, UAE',
    coords: '25.0805° N, 55.1403° E',
    nights: '3 nights',
    description: 'A skyline built in twenty years, best read from the water at the end of the day.',
    image: img.dubaiMarina,
    span: 3,
  },
  {
    id: 'hotel-quiet',
    category: 'Stays & food',
    title: 'A room that earns the night',
    region: 'STAYS',
    coords: '—',
    nights: '1 night',
    description: 'Where the agent puts you when the day ends late and the next train leaves early.',
    image: img.hotelRoom,
    span: 3,
  },
];

const CATEGORIES: Category[] = ['All', 'Cities', 'Nature', 'Culture', 'Stays & food'];

interface ExploreProps {
  onStartPlanning: () => void;
  onNavigateHome: () => void;
  onNavigateProfile?: () => void;
}

export function Explore({ onStartPlanning, onNavigateHome, onNavigateProfile }: ExploreProps) {
  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [category, setCategory] = useState<Category>('All');

  useSmoothScroll(true);

  const visible = useMemo(
    () => (category === 'All' ? PLACES : PLACES.filter((p) => p.category === category)),
    [category],
  );

  // Headline + filter rail: runs once on mount.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const split = titleRef.current ? revealHeadline(titleRef.current) : null;
      gsap.from('.tv-xp__eyebrow, .tv-xp__lead, .tv-seg', {
        y: 18,
        opacity: 0,
        duration: 0.85,
        ease: EASE,
        stagger: 0.07,
        delay: 0.15,
      });
      return () => split?.revert();
    },
    { scope: root },
  );

  // Card reveals + parallax: re-runs whenever the filter changes the set.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      gsap.fromTo(
        '.tv-xp__card',
        { y: 34, opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
        {
          y: 0,
          opacity: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          ease: EASE,
          stagger: 0.06,
          overwrite: true,
        },
      );

      gsap.utils.toArray<HTMLElement>('.tv-xp__card img').forEach((el) => {
        parallaxImage(el, { trigger: el.closest('.tv-xp__card') ?? el, amount: 7 });
      });
    },
    { scope: root, dependencies: [category], revertOnUpdate: true },
  );

  return (
    <div className="tv2 tv2-app" ref={root}>
      <AppBar
        onNavigateHome={onNavigateHome}
        onNavigateProfile={onNavigateProfile}
        onStartPlanning={onStartPlanning}
        current="explore"
      />

      <main className="tv-container">
        <header className="tv-page__head">
          <span className="tv-eyebrow tv-xp__eyebrow">Explore</span>
          <h1 className="tv-display tv-page__title" ref={titleRef}>
            Places worth <em>the journey.</em>
          </h1>
          <p className="tv-lead tv-xp__lead">
            Routes people have built in TripVerse. Open any one of them and the agent will rebuild
            it around your dates, your budget and how you like to move.
          </p>

          <div className="tv-seg" role="tablist" aria-label="Filter destinations">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={c === category}
                className={`tv-seg__btn ${c === category ? 'is-on' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
                {c !== 'All' && (
                  <span style={{ opacity: 0.55, marginLeft: 6 }}>
                    {PLACES.filter((p) => p.category === c).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <section className="tv-xp__grid" aria-live="polite">
          {visible.map((p) => (
            <article key={p.id} className={`tv-xp__card tv-xp__card--${p.span}`} onClick={onStartPlanning}>
              <figure className="tv-figure tv-xp__fig">
                <img src={p.image} alt={p.title} className="tv-img tv-img--drift" loading="lazy" />
                <figcaption className="tv-xp__badge">
                  <span className="tv-tag">
                    <ClockIcon width={12} height={12} />
                    {p.nights}
                  </span>
                </figcaption>
              </figure>

              <div className="tv-xp__meta">
                <div className="tv-xp__line">
                  <h2 className="tv-xp__title">{p.title}</h2>
                  <ArrowUpRightIcon className="tv-xp__go" width={16} height={16} />
                </div>
                <p className="tv-body tv-xp__desc">{p.description}</p>
                <div className="tv-xp__foot">
                  <span className="tv-meta">
                    <PinIcon width={12} height={12} /> {p.region}
                  </span>
                  <span className="tv-meta">{p.coords}</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        {visible.length === 0 && (
          <div className="tv-empty">
            <div className="tv-empty__art" aria-hidden="true">
              <span className="tv-empty__bar" />
              <span className="tv-empty__bar" />
              <span className="tv-empty__bar" />
            </div>
            <p className="tv-body">Nothing in that category yet.</p>
            <button type="button" className="tv-btn tv-btn--ghost" onClick={() => setCategory('All')}>
              Show everything
            </button>
          </div>
        )}

        <section className="tv-xp__cta">
          <h2 className="tv-display tv-xp__cta-title">
            Somewhere else in mind? <em>Describe it instead.</em>
          </h2>
          <button type="button" className="tv-btn tv-btn--primary" onClick={onStartPlanning}>
            <span>Start planning</span>
            <ArrowUpRightIcon width={15} height={15} />
          </button>
        </section>
      </main>
    </div>
  );
}

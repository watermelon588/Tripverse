/*
 * Explore: two candidate designs on one route while one is chosen.
 *
 *   /explore?v=index  The index. A typographic list of places; photographs
 *                     appear under the cursor, and the months chapter pins.
 *   /explore?v=moods  The moodboard. Start from a feeling: the design pack's
 *                     poster collages, then a pinned horizontal run of moods.
 *
 * Both use the house type, palette and spacing. Every place opens the planner
 * with its prompt typed in, ready to send (see `planFrom`).
 *
 * ponytail: the switch at the bottom exists only until a variant is picked;
 * then delete the other variant, the switch and this file's `variant` state.
 */
import { useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { AppBar } from '../components/common/AppBar';
import { useSmoothScroll } from '../hooks/useSmoothScroll';
import { ExploreIndex } from './explore/ExploreIndex';
import { ExploreMoods } from './explore/ExploreMoods';
import '../styles/explore-variants.css';

type Variant = 'index' | 'moods';

interface ExploreProps {
  onStartPlanning: () => void;
  onNavigateHome: () => void;
  onNavigateProfile?: () => void;
  onNavigateTrips?: () => void;
}

const fromUrl = (): Variant =>
  new URLSearchParams(window.location.search).get('v') === 'moods' ? 'moods' : 'index';

export function Explore({ onStartPlanning, onNavigateHome, onNavigateProfile, onNavigateTrips }: ExploreProps) {
  const [variant, setVariant] = useState<Variant>(fromUrl);
  const lenis = useSmoothScroll(true);

  const choose = (next: Variant) => {
    if (next === variant) return;
    window.history.replaceState(window.history.state, '', `/explore?v=${next}`);
    lenis.current ? lenis.current.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0);
    setVariant(next);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  return (
    <div className="tv2 tv2-app xp">
      <AppBar
        onNavigateHome={onNavigateHome}
        onNavigateProfile={onNavigateProfile}
        onNavigateTrips={onNavigateTrips}
        onStartPlanning={onStartPlanning}
        current="explore"
      />

      {variant === 'index'
        ? <ExploreIndex key="index" onStartPlanning={onStartPlanning} />
        : <ExploreMoods key="moods" onStartPlanning={onStartPlanning} />}

      <nav className="xp-switch" aria-label="Explore design variants">
        <span className="tv-label xp-switch__label">Variant</span>
        {([['index', 'A · The index'], ['moods', 'B · The moodboard']] as const).map(([key, label]) => (
          <button key={key} type="button" className={`xp-switch__btn ${variant === key ? 'is-on' : ''}`}
            aria-pressed={variant === key} onClick={() => choose(key)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/*
 * Hero — "Bento" structure carrying the Horizon headline.
 *
 * The chosen direction: an asymmetric hairline grid whose headline cell uses
 * the inline-image typography from the Horizon variant — small photographs set
 * between the words at type height, acting as punctuation rather than
 * illustration.
 *
 * Motion: the grid wipes open cell by cell, the headline reveals line by line
 * on top of it, and the inline photos pop in last so they read as a deliberate
 * flourish rather than as images that were simply there.
 */
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { AGENT_STEPS, ITINERARY_ROWS, img } from '../content';
import { ArrowUpRightIcon, GraphIcon, PinIcon, WalletIcon, ClockIcon } from '../IconsV2';
import { EASE, countUp, parallaxImage, prefersReducedMotion, splitLines } from '../motion';

export interface HeroProps {
  onStartPlanning?: () => void;
  onNavigateExplore?: () => void;
}

export function HeroBento({ onStartPlanning, onNavigateExplore }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const statRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const cells = gsap.utils.toArray<HTMLElement>('.tv-bg__cell');
      const inlineImgs = gsap.utils.toArray<HTMLElement>('.tv-inline-img');

      // Hide the inline photos until the headline lines have landed —
      // SplitText measures line boxes, so they must occupy space from the start.
      gsap.set(inlineImgs, { scale: 0, opacity: 0, transformOrigin: '50% 50%' });

      const tl = gsap.timeline({ defaults: { ease: EASE } });

      tl.from(cells, {
        clipPath: 'inset(0% 0% 100% 0%)',
        y: 42,
        opacity: 0,
        duration: 1.3,
        stagger: { each: 0.085, from: 'start' },
      });

      // Split only — the timeline below owns the tween.
      const split = headline.current ? splitLines(headline.current) : null;
      if (split) {
        tl.from(split.lines, { yPercent: 115, duration: 1.15, stagger: 0.09 }, 0.25);
      }

      tl.to(
        inlineImgs,
        { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.07 },
        '-=0.55',
      );

      tl.from('.tv-bg__lead, .tv-bg__actions', { y: 20, opacity: 0, duration: 0.9, stagger: 0.08 }, '-=0.7');
      tl.from('.tv-trace--compact .tv-trace__row', { x: -14, opacity: 0, duration: 0.7, stagger: 0.07 }, '-=0.6');
      tl.from('.tv-bg__rows li', { x: 14, opacity: 0, duration: 0.7, stagger: 0.07 }, '<');

      // Slow drift on the two photographic cells.
      gsap.utils.toArray<HTMLElement>('.tv-bg__cell--photo img, .tv-bg__cell--band img').forEach((el) => {
        parallaxImage(el, { trigger: el.parentElement ?? el, amount: 8 });
      });

      if (statRef.current) countUp(statRef.current, 23, root.current ?? undefined);

      return () => split?.revert();
    },
    { scope: root },
  );

  return (
    <section className="tv-hero tv-hero--bento" ref={root}>
      <div className="tv-container tv-container--wide">
        <div className="tv-bg tv-collapse">
          {/* Headline — inline photographs as punctuation */}
          <div className="tv-bg__cell tv-bg__cell--head">
            <span className="tv-eyebrow">Agentic travel planning</span>

            {/*
              Explicit {' '} around every inline photo: the images drop out at
              phone width, and without them the words would run together.
            */}
            <h1 className="tv-display tv-bg__title" ref={headline}>
              Somewhere{' '}
              <img src={img.kyotoGarden} alt="" aria-hidden="true" className="tv-inline-img" />{' '}
              between <em>the idea</em>{' '}
              <img src={img.porto} alt="" aria-hidden="true" className="tv-inline-img" />{' '}
              of a trip and the{' '}
              <img src={img.alpineLake} alt="" aria-hidden="true" className="tv-inline-img" />{' '}
              <em>morning you leave</em>{' '}
              {/* Bright, high-contrast subject: dark night shots read as blobs at 0.8em. */}
              <img src={img.sydney} alt="" aria-hidden="true" className="tv-inline-img" />{' '}
              — there is all of this <em>to work out.</em>
            </h1>

            <p className="tv-lead tv-bg__lead">
              TripVerse works it out with you. Describe the journey once and the agent resolves the
              cities, wires the routes, holds your budget, and opens the whole thing as a world you
              can move through.
            </p>

            <div className="tv-bg__actions">
              <button type="button" className="tv-btn tv-btn--primary" onClick={onStartPlanning}>
                <span>Start planning</span>
                <ArrowUpRightIcon width={15} height={15} />
              </button>
              <button type="button" className="tv-link" onClick={onNavigateExplore}>
                <span>Explore built trips</span>
              </button>
            </div>
          </div>

          {/* Tall photo */}
          <figure className="tv-figure tv-bg__cell tv-bg__cell--photo">
            <img src={img.seoulPalace} alt="Gyeongbokgung palace eaves, Seoul" className="tv-img tv-img--drift" />
            <figcaption className="tv-bg__caption">
              <span className="tv-tag">
                <PinIcon width={12} height={12} />
                Seoul · 5 nights
              </span>
            </figcaption>
          </figure>

          {/* Live trace */}
          <div className="tv-bg__cell tv-bg__cell--trace">
            <div className="tv-bg__cell-head">
              <GraphIcon width={18} height={18} />
              <span className="tv-label">Reasoning now</span>
            </div>
            <ul className="tv-trace tv-trace--compact">
              {AGENT_STEPS.slice(0, 4).map((s) => (
                <li key={s.label} className={`tv-trace__row is-${s.state}`}>
                  <span className="tv-trace__dot" aria-hidden="true" />
                  <span className="tv-trace__label">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Costed rows */}
          <div className="tv-bg__cell tv-bg__cell--cost">
            <div className="tv-bg__cell-head">
              <WalletIcon width={18} height={18} />
              <span className="tv-label">Japan · 14 nights</span>
            </div>
            <ul className="tv-bg__rows">
              {ITINERARY_ROWS.map((r) => (
                <li key={r.day}>
                  <span className="tv-bg__row-place">{r.place}</span>
                  <span className="tv-meta">{r.cost}</span>
                </li>
              ))}
            </ul>
            <p className="tv-meta tv-bg__total">Rail only · under a ¥420,000 ceiling</p>
          </div>

          {/* Wide photo band */}
          <figure className="tv-figure tv-bg__cell tv-bg__cell--band">
            <img src={img.fuji} alt="Mount Fuji at first light" className="tv-img tv-img--soft tv-img--drift" />
            <figcaption className="tv-bg__caption">
              <span className="tv-tag">
                <ClockIcon width={12} height={12} />
                Peak bloom · early April
              </span>
            </figcaption>
          </figure>

          {/* Stat */}
          <div className="tv-bg__cell tv-bg__cell--stat">
            <span className="tv-display tv-bg__stat-n" ref={statRef}>
              23
            </span>
            <span className="tv-meta tv-bg__stat-l">nodes wired across 4 cities, each one editable</span>
          </div>
        </div>
      </div>
    </section>
  );
}

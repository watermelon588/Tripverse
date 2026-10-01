/*
 * Variant B — The moodboard.
 *
 * Start from a feeling, not a map. The design pack's poster collages float
 * around the headline at different depths; a pinned chapter then runs sideways
 * through six moods, each with its photographs and the places that suit it.
 * A contact sheet holds every place, filtered by mood, and the page closes by
 * opening one photograph to the full window.
 *
 * Under 900px or with reduced motion nothing pins: moods stack, and every
 * element is visible without animation.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';

import { ArrowUpRightIcon } from '../../components/home/v2/IconsV2';
import { EASE, prefersReducedMotion, splitLines } from '../../components/home/v2/motion';
import { MOODS, PLACES, cutout, moodImage, placeById, placeImage, planFrom } from './places';

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);

const COLLAGE = [
  { name: 'alpine-world', depth: 0.9, className: 'xm-cut--alpine' },
  { name: 'floral-world', depth: 0.55, className: 'xm-cut--floral' },
  { name: 'ocean-perspective', depth: 0.7, className: 'xm-cut--ocean' },
  { name: 'traveler-faces', depth: 0.4, className: 'xm-cut--faces' },
];

export function ExploreMoods({ onStartPlanning }: { onStartPlanning: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);
  const [mood, setMood] = useState<string>('all');
  const [current, setCurrent] = useState(0);

  const plan = (id: string) => planFrom(placeById(id), onStartPlanning);
  const sheet = useMemo(() => {
    const picked = MOODS.find((m) => m.id === mood);
    return picked ? picked.places.map(placeById) : PLACES;
  }, [mood]);

  const chooseMood = (next: string) => {
    if (next === mood) return;
    const items = gsap.utils.toArray<HTMLElement>('.xm-shot', root.current);
    const keep = next === 'all' ? null : new Set(MOODS.find((m) => m.id === next)!.places);
    const leaving = keep ? items.filter((el) => !keep.has(el.dataset.id!)) : [];
    const settle = () => {
      if (!prefersReducedMotion()) flip.current = Flip.getState(items.filter((el) => !leaving.includes(el)));
      setMood(next);
    };
    if (!leaving.length || prefersReducedMotion()) return settle();
    gsap.to(leaving, { opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.in', onComplete: settle });
  };

  useLayoutEffect(() => {
    const state = flip.current;
    flip.current = null;
    if (!state) return;
    Flip.from(state, {
      targets: gsap.utils.toArray('.xm-shot', root.current),
      duration: 0.85, ease: EASE, scale: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.05 }),
    });
    ScrollTrigger.refresh();
  }, [mood]);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const reduce = prefersReducedMotion();
    if (reduce) return;

    // Hero: the collage settles in around the headline.
    const title = q('.xm-hero__title')[0] as HTMLElement | undefined;
    const split = title ? splitLines(title) : null;
    if (split) gsap.from(split.lines, { yPercent: 115, duration: 1.25, ease: EASE, stagger: 0.1, delay: 0.25 });
    gsap.from(q('.xm-hero__copy > :not(h1)'), { y: 18, opacity: 0, duration: 1, ease: EASE, stagger: 0.08, delay: 0.5 });
    gsap.from(q('.xm-cut'), {
      opacity: 0, scale: 0.88, y: 50, rotation: (i: number) => (i % 2 ? 5 : -5),
      duration: 1.4, ease: EASE, stagger: 0.12,
    });

    // The pieces drift apart at their own depths as the page scrolls away.
    q('.xm-cut').forEach((el) => {
      const depth = Number((el as HTMLElement).dataset.depth);
      const side = (el as HTMLElement).dataset.side === 'left' ? -1 : 1;
      gsap.to(el.querySelector('img'), {
        yPercent: -38 * depth, xPercent: 14 * depth * side, rotation: 6 * depth * side, ease: 'none',
        scrollTrigger: { trigger: q('.xm-hero')[0], start: 'top top', end: 'bottom top', scrub: true },
      });
    });

    const mm = gsap.matchMedia();

    // A pointer adds a little parallax on top (fine pointers only).
    mm.add('(hover: hover) and (pointer: fine)', () => {
      const movers = q('.xm-cut').map((el) => ({
        x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3' }),
        depth: Number((el as HTMLElement).dataset.depth),
      }));
      const hero = q('.xm-hero')[0] as HTMLElement;
      const onMove = (event: PointerEvent) => {
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;
        movers.forEach((m) => { m.x(nx * 46 * m.depth); m.y(ny * 34 * m.depth); });
      };
      hero.addEventListener('pointermove', onMove);
      return () => hero.removeEventListener('pointermove', onMove);
    });

    // Moods: pinned, running sideways. The horizontal tween must stay linear; reveals key off it.
    mm.add('(min-width: 900px)', () => {
      const track = q('.xm-track')[0] as HTMLElement;
      const distance = () => track.scrollWidth - window.innerWidth;
      const run = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: q('.xm-moods__pin')[0], pin: true, start: 'top 60px', end: () => `+=${distance()}`,
          scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => {
            const index = Math.min(MOODS.length - 1, Math.round(self.progress * (MOODS.length - 1)));
            setCurrent((prev) => (prev === index ? prev : index));
          },
        },
      });
      gsap.to(q('.xm-progress__bar'), {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: q('.xm-moods__pin')[0], start: 'top 60px', end: () => `+=${distance()}`, scrub: true },
      });
      q('.xm-panel').forEach((panel) => {
        gsap.fromTo(panel.querySelector('.xm-panel__main img'), { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: run, start: 'left right', end: 'right left', scrub: true },
        });
        gsap.from(panel.querySelector('.xm-panel__inset'), {
          yPercent: 30, rotation: 6, opacity: 0, duration: 1.1, ease: EASE,
          scrollTrigger: { trigger: panel, containerAnimation: run, start: 'left 70%' },
        });
        gsap.from(panel.querySelectorAll('.xm-panel__copy > *'), {
          y: 24, opacity: 0, duration: 1, ease: EASE, stagger: 0.07,
          scrollTrigger: { trigger: panel, containerAnimation: run, start: 'left 60%' },
        });
      });
    });

    // The close: one photograph opens from a frame to the whole window.
    mm.add('(min-width: 900px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: q('.xm-close')[0], start: 'top 60px', end: 'bottom bottom', scrub: true },
      });
      tl.fromTo(q('.xm-close__fig'), { clipPath: 'inset(24% 34% 24% 34% round 12px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 })
        .fromTo(q('.xm-close__fig img'), { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .from(q('.xm-close__copy > *'), { y: 30, opacity: 0, stagger: 0.08, duration: 0.35, ease: 'power2.out' }, 0.62);
    });

    // Contact sheet.
    ScrollTrigger.batch(q('.xm-shot'), {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.from(els, {
        clipPath: 'inset(0% 0% 100% 0%)', y: 30, duration: 1.1, ease: EASE, stagger: 0.06,
      }),
    });

    return () => {
      split?.revert();
      mm.revert();
    };
  }, { scope: root });

  return (
    <div ref={root} className="xm">
      <header className="xm-hero">
        <div className="xm-collage" aria-hidden="true">
          {COLLAGE.map((piece, i) => (
            <div key={piece.name} className={`xm-cut ${piece.className}`} data-depth={piece.depth}
              data-side={i % 2 === 0 ? 'left' : 'right'}>
              <img src={cutout(piece.name)} alt="" />
            </div>
          ))}
        </div>
        <div className="xm-hero__copy">
          <h1 className="tv-display xm-hero__title">Start with <em>a feeling.</em></h1>
          <p className="tv-lead">
            Six moods and the places that suit them. Pick the feeling, then the place, and the planner opens with
            it written in, ready to send.
          </p>
          <span className="tv-meta xm-hero__hint">Scroll to wander <span aria-hidden="true">↓</span></span>
        </div>
      </header>

      <section className="xm-moods" aria-labelledby="xm-moods-title">
        <div className="xm-moods__pin">
          <div className="tv-container xm-moods__head">
            <h2 className="tv-display xm-h2" id="xm-moods-title">Six moods, <em>one at a time.</em></h2>
            <div className="xm-progress" aria-hidden="true">
              <ol>
                {MOODS.map((m, i) => (
                  <li key={m.id} className={i === current ? 'is-on' : ''}>{m.name}</li>
                ))}
              </ol>
              <span className="xm-progress__track"><span className="xm-progress__bar" /></span>
            </div>
          </div>

          <div className="xm-track">
            {MOODS.map((m, i) => (
              <article key={m.id} className="xm-panel" aria-labelledby={`xm-mood-${m.id}`}>
                <div className="xm-panel__media">
                  <figure className="xm-panel__main tv-figure">
                    <img className="tv-img" src={moodImage(m.images[0])} alt={m.alts[0]} loading="lazy" />
                  </figure>
                  <figure className="xm-panel__inset">
                    <img className="tv-img" src={moodImage(m.images[1])} alt={m.alts[1]} loading="lazy" />
                  </figure>
                </div>
                <div className="xm-panel__copy">
                  <span className="tv-meta">{i + 1} of {MOODS.length}</span>
                  <h3 className="tv-display xm-panel__name" id={`xm-mood-${m.id}`}>{m.name}, <em>{m.turn}</em></h3>
                  <p className="tv-body">{m.line}</p>
                  <ul className="xm-panel__places">
                    {m.places.map((id) => {
                      const place = placeById(id);
                      return (
                        <li key={id}>
                          <button type="button" onClick={() => plan(id)} aria-label={`Plan ${place.city}: ${place.title}`}>
                            <img src={placeImage(id)} alt="" loading="lazy" />
                            <span className="xm-place__text">
                              <span className="xm-place__city">{place.city}</span>
                              <span className="tv-meta">{place.title}</span>
                            </span>
                            <span className="tv-meta xm-place__months">{place.months}</span>
                            <ArrowUpRightIcon width={14} height={14} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tv-container xm-sheet" aria-labelledby="xm-sheet-title">
        <div className="xm-sheet__head">
          <h2 className="tv-display xm-h2" id="xm-sheet-title">Or browse <em>every place.</em></h2>
          <div className="tv-seg" role="group" aria-label="Show places by mood">
            <button type="button" className={`tv-seg__btn ${mood === 'all' ? 'is-on' : ''}`}
              aria-pressed={mood === 'all'} onClick={() => chooseMood('all')}>All {PLACES.length}</button>
            {MOODS.map((m) => (
              <button key={m.id} type="button" className={`tv-seg__btn ${mood === m.id ? 'is-on' : ''}`}
                aria-pressed={mood === m.id} onClick={() => chooseMood(m.id)}>{m.name}</button>
            ))}
          </div>
        </div>

        <ul className="xm-grid">
          {sheet.map((place) => (
            <li key={place.id} className="xm-shot" data-id={place.id} data-flip-id={place.id}>
              <button type="button" onClick={() => plan(place.id)} aria-label={`Plan ${place.city}: ${place.title}`}>
                <figure className="tv-figure xm-shot__fig">
                  <img className="tv-img" src={placeImage(place.id)} alt={place.description} loading="lazy" />
                </figure>
                <span className="xm-shot__meta">
                  <span className="xm-shot__title">{place.title}</span>
                  <span className="tv-meta">{place.city}, {place.country} · {place.nights} nights</span>
                </span>
                <ArrowUpRightIcon className="xm-shot__go" width={16} height={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="xm-close">
        <div className="xm-close__sticky">
          <figure className="xm-close__fig">
            <img className="tv-img" src={placeImage('contrail')} alt="A plane drawing a contrail across a deep blue sky" loading="lazy" />
          </figure>
          <div className="xm-close__copy tv-invert">
            <h2 className="tv-display xm-close__title">Can't name the feeling? <em>Describe it instead.</em></h2>
            <p className="tv-lead">A place, a mood or a budget is enough. Your guide asks three quick things and plans the rest.</p>
            <button type="button" className="tv-btn tv-btn--primary" onClick={onStartPlanning}>
              Start planning <ArrowUpRightIcon width={15} height={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

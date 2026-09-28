/*
 * The Sketch tab: the trip as hand-drawn pages, an overview and then one per day.
 * The page follows the studio's selected day (and sets it), so the Days window,
 * the plan and the sketch always agree. Arrow keys and swipes turn pages.
 */
import React, { useMemo, useRef } from 'react';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/yomogi/400.css';

import type { TripDocument } from '../../services/tripService';
import { layoutSketch } from './layout';
import { SketchPageSvg } from './render';
import '../../styles/sketch.css';

interface Props {
  document: TripDocument;
  day: number | null;
  onSelectDay: (day: number | null) => void;
}

export function SketchbookView({ document, day, onSelectDay }: Props) {
  const pages = useMemo(() => layoutSketch(document), [document]);
  const index = Math.max(0, pages.findIndex((page) => page.day === day));
  const page = pages[index];
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const go = (next: number) => {
    const clamped = Math.min(pages.length - 1, Math.max(0, next));
    if (clamped !== index) onSelectDay(pages[clamped].day);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[event.key];
    if (step) go(index + step);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(pages.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <section className="tv-sketch" aria-roledescription="sketchbook" aria-label="Trip sketchbook" tabIndex={0} onKeyDown={onKeyDown}
      onPointerDown={(event) => { if (event.pointerType !== 'mouse') swipe.current = { x: event.clientX, y: event.clientY }; }}
      onPointerUp={(event) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start) return;
        const [dx, dy] = [event.clientX - start.x, event.clientY - start.y];
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
      onPointerCancel={() => { swipe.current = null; }}>
      <div className="tv-sketch__stage">
        <SketchPageSvg key={page.id} page={page} className="tv-sketch__page" />
      </div>
      <nav className="tv-sketch__nav" aria-label="Pages">
        <button type="button" className="tv-btn tv-btn--ghost tv-btn--sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous page">←</button>
        <span className="tv-sketch__count" aria-live="polite">
          {page.kind === 'overview' ? 'Overview' : page.title} <span className="tv-meta">· {index + 1} of {pages.length}</span>
        </span>
        <button type="button" className="tv-btn tv-btn--ghost tv-btn--sm" onClick={() => go(index + 1)} disabled={index === pages.length - 1} aria-label="Next page">→</button>
      </nav>
    </section>
  );
}

/*
 * GuideCharacter: the traveler's guide as a living portrait.
 *
 * One portrait, five moods, made from transforms only (bob, tilt, squash), so any
 * guide art works without extra frames. Guides that ship hand-made thinking frames
 * (Aoi) flip between them while thinking. Reduced motion keeps the portrait still;
 * the mood badge still shows, so the state is never carried by motion alone.
 */
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { prefersReducedMotion } from '../home/v2/motion';
import { GUIDES, type Guide } from './guides';
import '../../styles/guide-character.css';

export type GuideMood = 'idle' | 'thinking' | 'drawing' | 'celebrating' | 'confused';

const BADGE: Record<GuideMood, string | null> = { idle: null, thinking: '…', drawing: '✎', celebrating: '✦', confused: '?' };

// Warm the frame cache so the first thinking flip never flickers.
if (typeof window !== 'undefined') {
  GUIDES.flatMap((guide) => guide.thinkingFrames ?? []).forEach((src) => { new Image().src = src; });
}

interface Props {
  guide: Guide;
  size: number;
  mood?: GuideMood;
  /** No idle bob: for portraits repeated down a list, like chat messages. */
  still?: boolean;
  /** Accessible name; leave empty when a visible label already names the guide. */
  label?: string;
  className?: string;
}

function moodTween(body: HTMLElement, badge: HTMLElement | null, mood: GuideMood, still: boolean) {
  const loop = { repeat: -1, yoyo: true, ease: 'sine.inOut' };
  if (badge) gsap.from(badge, { scale: 0, rotation: -30, duration: 0.35, ease: 'back.out(3)' });
  switch (mood) {
    case 'idle':
      if (!still) gsap.to(body, { y: -2, duration: 1.8, ...loop });
      return;
    case 'thinking':
      gsap.fromTo(body, { rotation: -5 }, { rotation: 5, y: -1.5, duration: 0.8, ...loop });
      return;
    case 'drawing':
      gsap.fromTo(body, { rotation: -3 }, { rotation: 3, y: 1, duration: 0.22, ...loop });
      return;
    case 'celebrating':
      gsap.timeline({ repeat: 2 })
        .to(body, { y: -8, duration: 0.16, ease: 'power2.out' })
        .to(body, { y: 0, duration: 0.14, ease: 'power2.in' })
        .to(body, { scaleY: 0.9, scaleX: 1.08, duration: 0.07, transformOrigin: '50% 100%' })
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.14, ease: 'back.out(3)' });
      if (badge) gsap.to(badge, { rotation: 360, duration: 1.2, ease: 'power1.inOut' });
      return;
    case 'confused':
      gsap.to(body, { keyframes: { rotation: [0, 11, -6, 9, 6] }, duration: 0.9, ease: 'power1.out' });
      if (badge) gsap.to(badge, { y: -2, duration: 0.5, ...loop, delay: 0.35 });
  }
}

export function GuideCharacter({ guide, size, mood = 'idle', still = false, label, className = '' }: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const frames = mood === 'thinking' ? guide.thinkingFrames : undefined;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!frames || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setFrame((current) => 1 - current), 320);
    return () => window.clearInterval(timer);
  }, [frames]);

  useGSAP(() => {
    if (prefersReducedMotion() || !root.current) return;
    const body = root.current.querySelector<HTMLElement>('.tv-guide__body')!;
    moodTween(body, root.current.querySelector<HTMLElement>('.tv-guide__badge'), mood, still);
  }, { scope: root, dependencies: [mood, still, guide.id], revertOnUpdate: true });

  const badge = BADGE[mood];
  return (
    <span ref={root} className={`tv-guide is-${mood} ${frames ? 'has-frames' : ''} ${className}`}
      style={{ '--guide-size': `${size}px` } as React.CSSProperties} role={label ? 'img' : undefined} aria-label={label}>
      <span className="tv-guide__body">
        <img className="tv-guide__img" src={frames ? frames[frame] : guide.image} alt="" draggable={false} />
      </span>
      {badge && <span className="tv-guide__badge" aria-hidden="true">{badge}</span>}
    </span>
  );
}

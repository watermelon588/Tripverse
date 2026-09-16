/*
 * SpatialWorkspace — right-hand column that will host the 3D route graph.
 *
 * Until the React Three Fiber scene lands here, it shows a live-drawn node
 * graph of the active trip: nodes pop in and the edges draw themselves, so
 * the panel previews what the spatial view is for instead of sitting empty.
 */
import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import type { CurrentTripContext } from './CurrentTrip';
import { CloseIcon, LayersIcon, PinIcon, RouteIcon } from '../home/v2/IconsV2';
import { EASE, prefersReducedMotion } from '../home/v2/motion';

interface SpatialWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: CurrentTripContext | null;
  className?: string;
}

// A small, legible preview graph laid out on a 320×220 canvas.
const NODES = [
  { id: 'a', x: 46, y: 150, label: 'Origin' },
  { id: 'b', x: 128, y: 70, label: 'Stay' },
  { id: 'c', x: 206, y: 142, label: 'Day trip' },
  { id: 'd', x: 276, y: 58, label: 'Anchor' },
];
const EDGES: Array<[string, string]> = [
  ['a', 'b'],
  ['b', 'c'],
  ['b', 'd'],
  ['c', 'd'],
];

export const SpatialWorkspace: React.FC<SpatialWorkspaceProps> = ({ isOpen, onClose, trip, className = '' }) => {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!isOpen || prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from(root.current, { x: 40, opacity: 0, duration: 0.7 })
        .from('.tv-graph2__node', {
          scale: 0,
          transformOrigin: '50% 50%',
          duration: 0.6,
          stagger: 0.1,
          ease: 'back.out(1.8)',
        }, '-=0.3');

      // Draw each edge along its own length.
      gsap.utils.toArray<SVGLineElement>('.tv-graph2__edge').forEach((line, i) => {
        const len = line.getTotalLength();
        gsap.fromTo(
          line,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', delay: 0.55 + i * 0.12 },
        );
      });

      tl.from('.tv-spatial__row', { y: 14, opacity: 0, duration: 0.6, stagger: 0.07 }, '-=0.2');

      // Slow ambient pulse on the anchor node.
      gsap.to('.tv-graph2__halo', {
        scale: 1.6,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 2.2,
        repeat: -1,
        ease: 'power1.out',
      });
    },
    { scope: root, dependencies: [isOpen] },
  );

  if (!isOpen) return null;

  const pos = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <aside className={`tv-spatial ${className}`} ref={root} aria-label="Spatial trip workspace">
      <div className="tv-spatial__bar">
        <LayersIcon width={16} height={16} />
        <span className="tv-label">Spatial view</span>
        <span className="tv-app__bar-spacer" />
        <button type="button" className="tv-iconbtn" onClick={onClose} aria-label="Close spatial view">
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <div className="tv-spatial__body">
        <div className="tv-spatial__canvas">
          <svg viewBox="0 0 320 220" className="tv-graph2" role="img" aria-label="Preview of the trip route graph">
            {EDGES.map(([from, to]) => (
              <line
                key={`${from}-${to}`}
                className="tv-graph2__edge"
                x1={pos[from].x}
                y1={pos[from].y}
                x2={pos[to].x}
                y2={pos[to].y}
              />
            ))}
            {NODES.map((n) => (
              <g key={n.id}>
                {n.id === 'd' && <circle className="tv-graph2__halo" cx={n.x} cy={n.y} r={11} />}
                <circle className={`tv-graph2__node ${n.id === 'd' ? 'is-anchor' : ''}`} cx={n.x} cy={n.y} r={n.id === 'd' ? 8 : 6} />
                <text className="tv-graph2__label" x={n.x} y={n.y + 22} textAnchor="middle">
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <h3 className="tv-display tv-spatial__title">
          {trip?.destination ? (
            <>
              {trip.destination} <em>as a graph.</em>
            </>
          ) : (
            <>
              Your route, <em>as a graph.</em>
            </>
          )}
        </h3>

        <p className="tv-body tv-spatial__copy">
          Cities, stays, transit and costs become connected nodes as the plan takes shape. The full 3D
          universe opens here once the itinerary is ready.
        </p>

        <dl className="tv-spatial__rows">
          <div className="tv-spatial__row">
            <dt className="tv-meta">
              <PinIcon width={12} height={12} /> Anchor
            </dt>
            <dd>{trip?.destination || 'Not set'}</dd>
          </div>
          <div className="tv-spatial__row">
            <dt className="tv-meta">
              <RouteIcon width={12} height={12} /> Stage
            </dt>
            <dd>{trip?.status ? trip.status.toLowerCase() : 'discovery'}</dd>
          </div>
          <div className="tv-spatial__row">
            <dt className="tv-meta">
              <LayersIcon width={12} height={12} /> Length
            </dt>
            <dd>{trip?.days ? `${trip.days} days` : '—'}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
};

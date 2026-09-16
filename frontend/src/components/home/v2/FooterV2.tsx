/*
 * FooterV2 — document-style colophon.
 *
 * An oversized wordmark rule, a three-column link index, and a meta strip.
 * Separated by hairlines only; no boxed cards, no dark slab.
 */
import { FOOTER_NAV } from './content';
import { LogoMark, ArrowUpRightIcon } from './IconsV2';

export interface FooterV2Props {
  onStartPlanning?: () => void;
  onNavigateExplore?: () => void;
}

export function FooterV2({ onStartPlanning, onNavigateExplore }: FooterV2Props) {
  const year = new Date().getFullYear();

  const handle = (e: React.MouseEvent<HTMLAnchorElement>, key?: string) => {
    if (key === 'explore' && onNavigateExplore) {
      e.preventDefault();
      onNavigateExplore();
      return;
    }
    if (key === 'plan' && onStartPlanning) {
      e.preventDefault();
      onStartPlanning();
      return;
    }
    const id = e.currentTarget.getAttribute('href')?.replace('#', '');
    const el = id ? document.getElementById(id) : null;
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="tv-footer" id="contact">
      <div className="tv-container tv-container--wide">
        <div className="tv-footer__top">
          <div className="tv-footer__pitch">
            <LogoMark width={26} height={26} />
            <p className="tv-display tv-footer__line">
              Plan the whole trip, <em>not the paragraph about it.</em>
            </p>
            <button type="button" className="tv-btn tv-btn--primary" onClick={onStartPlanning}>
              <span>Start planning</span>
              <ArrowUpRightIcon width={15} height={15} />
            </button>
          </div>

          <div className="tv-footer__nav">
            {FOOTER_NAV.map((col) => (
              <div key={col.heading} className="tv-footer__col">
                <h3 className="tv-label">{col.heading}</h3>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} onClick={(e) => handle(e, (l as { key?: string }).key)}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="tv-rule" />

        <div className="tv-footer__meta">
          <span className="tv-meta">© {year} TripVerse</span>
          <span className="tv-meta tv-hide-mobile">Built with LangGraph, React Three Fiber, and FastAPI</span>
          <div className="tv-footer__legal">
            <a href="#privacy" className="tv-meta">Privacy</a>
            <a href="#terms" className="tv-meta">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

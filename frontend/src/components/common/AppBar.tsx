/*
 * AppBar — the sticky header shared by the application surfaces
 * (Explore, Profile). The marketing page keeps its own `NavbarV2`; this is
 * the denser working-surface equivalent.
 */
import { useAuth } from '../../context/AuthContext';
import { LogoLockup } from './Logo';
import { ArrowUpRightIcon } from '../home/v2/IconsV2';

export interface AppBarProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateProfile?: () => void;
  onStartPlanning?: () => void;
  /** Marks the active destination so it can be de-emphasised in the bar. */
  current?: 'explore' | 'profile' | 'create';
}

export function AppBar({
  onNavigateHome,
  onNavigateExplore,
  onNavigateProfile,
  onStartPlanning,
  current,
}: AppBarProps) {
  const { user } = useAuth();

  const links: Array<{ key: NonNullable<AppBarProps['current']>; label: string; go?: () => void }> = [
    { key: 'explore', label: 'Explore', go: onNavigateExplore },
    { key: 'profile', label: 'Account', go: onNavigateProfile },
  ];

  return (
    <header className="tv-app__bar">
      <button type="button" onClick={onNavigateHome} aria-label="TripVerse home">
        <LogoLockup size={21} />
      </button>

      <nav className="tv-app__nav tv-hide-mobile" aria-label="Application">
        {links.map((l) =>
          l.go && l.key !== current ? (
            <button key={l.key} type="button" className="tv-app__navlink" onClick={l.go}>
              {l.label}
            </button>
          ) : null,
        )}
      </nav>

      <span className="tv-app__bar-spacer" />

      {user && (
        <span className="tv-meta tv-hide-mobile" title={user.email ?? undefined}>
          {user.email}
        </span>
      )}

      {onStartPlanning && current !== 'create' && (
        <button type="button" className="tv-btn tv-btn--primary tv-btn--sm" onClick={onStartPlanning}>
          <span>Plan a trip</span>
          <ArrowUpRightIcon width={14} height={14} />
        </button>
      )}
    </header>
  );
}

import {
  ChatIcon,
  CloseIcon,
  CommunityIcon,
  ExploreIcon,
  HelpIcon,
  LogoMarkIcon,
  ResourcesIcon,
} from './HomeIcons';

const SIDEBAR_LINKS = [
  { label: 'Start Chatting', icon: ChatIcon, key: 'chat' },
  { label: 'Explore', icon: ExploreIcon, key: 'explore' },
  { label: 'Community', icon: CommunityIcon, key: 'community' },
  { label: 'Help', icon: HelpIcon, key: 'help' },
  { label: 'Resources', icon: ResourcesIcon, key: 'resources' },
] as const;

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onNavigateExplore?: () => void;
  onNavigateHome?: () => void;
}

export function MobileSidebar({
  open,
  onClose,
  onGetStarted,
  onLogin,
  onNavigateExplore,
  onNavigateHome,
}: MobileSidebarProps) {
  const handleItemClick = (key: string) => {
    onClose();
    if (key === 'explore' && onNavigateExplore) {
      onNavigateExplore();
    }
  };

  return (
    <>
      <div
        className={`home-sidebar__backdrop ${open ? 'home-sidebar__backdrop--visible' : ''}`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        className={`home-sidebar home-ui ${open ? 'home-sidebar--open' : ''}`}
        aria-hidden={!open}
        aria-label="Navigation menu"
      >
        <div
          className="home-sidebar__header"
          style={{ cursor: onNavigateHome ? 'pointer' : 'default' }}
          onClick={() => {
            onClose();
            onNavigateHome?.();
          }}
        >
          <LogoMarkIcon className="home-sidebar__logo-mark" />
          <span className="home-sidebar__wordmark">TRIPVERSE</span>
          <button
            type="button"
            className="home-sidebar__close"
            aria-label="Close menu"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="home-sidebar__nav">
          {SIDEBAR_LINKS.map(({ label, icon: Icon, key }) => (
            <button
              key={label}
              type="button"
              className="home-sidebar__item"
              onClick={() => handleItemClick(key)}
            >
              <Icon className="home-sidebar__item-icon" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="home-sidebar__actions">
          <button
            type="button"
            className="home-sidebar__cta home-sidebar__cta--primary"
            onClick={() => {
              onClose();
              onGetStarted();
            }}
          >
            Get started
          </button>
          <button
            type="button"
            className="home-sidebar__cta home-sidebar__cta--secondary"
            onClick={() => {
              onClose();
              onLogin();
            }}
          >
            Log in
          </button>
        </div>
      </aside>
    </>
  );
}

import React from 'react';
import { LogoMarkIcon } from '../home/HomeIcons';
import { NewChatButton } from './NewChatButton';
import { CurrentTrip, CurrentTripContext } from './CurrentTrip';
import { ChatHistory, ChatSessionItem } from './ChatHistory';
import { X, ArrowLeft, User, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CreateSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  sessions: ChatSessionItem[];
  activeSessionId?: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string, e: React.MouseEvent) => void;
  currentTrip?: CurrentTripContext | null;
  onNavigateHome?: () => void;
  onNavigateProfile?: () => void;
  onNavigateExplore?: () => void;
  onExploreSpatial?: () => void;
  width?: number;
  onWidthChange?: (newWidth: number) => void;
}

export const CreateSidebar: React.FC<CreateSidebarProps> = ({
  isOpen,
  onClose,
  onNewChat,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  currentTrip,
  onNavigateHome,
  onNavigateProfile,
  onNavigateExplore,
  onExploreSpatial,
  width = 320,
  onWidthChange,
}) => {
  const { user } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url || localStorage.getItem('tripverse-user-avatar');
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, 240), 520);
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside
        style={isOpen ? { width: `${width}px` } : undefined}
        className={`fixed lg:relative top-0 bottom-0 left-0 z-50 bg-white dark:bg-[#151515] border-r border-[#D9D9D9] dark:border-[#2E2E2E] flex flex-col justify-between h-full font-body shrink-0 transition-transform lg:transition-[width] duration-200 ease-out ${
          isOpen
            ? 'translate-x-0 w-72 sm:w-80 lg:w-auto'
            : '-translate-x-full lg:hidden w-0 pointer-events-none'
        }`}
        aria-label="Trip planning sidebar"
      >
        {/* Top Header & Brand */}
        <div className="p-4 border-b border-[#D9D9D9] dark:border-[#2E2E2E] flex items-center justify-between shrink-0 bg-white dark:bg-[#151515]">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={onNavigateHome}
          >
            <LogoMarkIcon className="w-5 h-5 text-[#1F1E1E] dark:text-white transition-transform group-hover:scale-105" />
            <span className="font-extrabold tracking-widest text-sm text-[#1F1E1E] dark:text-white uppercase font-body">
              TRIPVERSE
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="p-1.5 text-[#1F1E1E] dark:text-white hover:bg-[#D9D9D9]/50 dark:hover:bg-[#262626] transition-colors cursor-pointer"
                title="Back to Home"
                aria-label="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-[#1F1E1E] dark:text-white hover:bg-[#D9D9D9]/50 dark:hover:bg-[#262626] transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Button: New Voyage */}
        <div className="p-4 border-b border-[#D9D9D9]/70 dark:border-[#2E2E2E] shrink-0 bg-[#F9F9F9] dark:bg-[#181818]">
          <NewChatButton
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
          />
        </div>

        {/* Scrollable Center: Current Trip Context & Chat History */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Active Trip Context (rendered only if present) */}
          <CurrentTrip trip={currentTrip} onExploreSpatial={onExploreSpatial} />

          {/* Past Sessions List */}
          <ChatHistory
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(id) => {
              onSelectSession(id);
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
            onDeleteSession={onDeleteSession}
          />
        </div>

        {/* Bottom Utility Footer */}
        <div className="p-3 border-t border-[#D9D9D9] dark:border-[#2E2E2E] shrink-0 bg-[#F9F9F9] dark:bg-[#181818] flex flex-col gap-2">
          {onNavigateProfile && (
            <button
              type="button"
              className="w-full py-3 px-4 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] font-extrabold text-xs uppercase tracking-widest rounded-none flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-neutral-200 transition-colors cursor-pointer border border-[#1F1E1E] dark:border-white shadow-none"
              onClick={onNavigateProfile}
            >
              {avatarUrl ? (
                <div className="w-4 h-4 overflow-hidden rounded-none shrink-0">
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-none" />
                </div>
              ) : (
                <User className="w-4 h-4" />
              )}
              <span>My Profile</span>
            </button>
          )}

          {onNavigateExplore && (
            <button
              type="button"
              onClick={onNavigateExplore}
              className="w-full py-2 px-3 bg-transparent text-[#1F1E1E] dark:text-[#F5F5F5] hover:bg-[#D9D9D9]/40 dark:hover:bg-[#262626] border border-[#D9D9D9] dark:border-[#333333] hover:border-[#1F1E1E] dark:hover:border-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>
          )}
        </div>

        {/* Draggable Resizer Handle (Desktop only) */}
        {isOpen && (
          <div
            onMouseDown={handleMouseDown}
            className="hidden lg:block absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize z-30 select-none group"
            title="Drag to resize sidebar"
            role="separator"
            aria-orientation="vertical"
          >
            <div className="w-[3px] h-full mx-auto transition-colors group-hover:bg-[#1F1E1E] dark:group-hover:bg-white group-active:bg-[#1F1E1E] dark:group-active:bg-white" />
          </div>
        )}
      </aside>
    </>
  );
};

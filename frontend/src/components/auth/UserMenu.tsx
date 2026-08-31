import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { AuthModal } from './AuthModal';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all hover:scale-[1.03] active:scale-[0.98]"
        >
          <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sign In</span>
        </button>
        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Voyager';

  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all text-white"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        <span className="text-xs font-medium text-neutral-200 hidden sm:inline-block max-w-[100px] truncate">
          {displayName}
        </span>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-neutral-900/95 border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-50 text-white animate-fade-in">
          <div className="px-3 py-2.5 border-b border-white/10 mb-1">
            <p className="text-xs font-medium text-white truncate">{displayName}</p>
            <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TripVerse Cloud Connected</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-1">
            <button
              onClick={async () => {
                setIsDropdownOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

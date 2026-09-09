import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 text-[#1F1E1E] dark:text-[#F5F5F5] hover:bg-[#D9D9D9]/40 dark:hover:bg-[#262626] transition-colors border border-transparent hover:border-[#D9D9D9] dark:hover:border-[#333333] flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1F1E1E] dark:focus:ring-white select-none ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
      ) : (
        <Moon className="w-4 h-4 text-[#1F1E1E] stroke-[2.2]" />
      )}
      {showLabel && (
        <span className="text-xs font-bold uppercase tracking-wider">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};

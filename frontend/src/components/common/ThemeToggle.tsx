import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 sm:p-2 text-[#1F1E1E] dark:text-[#F5F5F5] bg-white dark:bg-[#252525] hover:bg-[#F2F2F2] dark:hover:bg-[#303030] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm btn-tactile flex items-center gap-2 cursor-pointer select-none rounded-none ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 stroke-[2.4]" />
      ) : (
        <Moon className="w-4 h-4 text-[#1F1E1E] stroke-[2.4]" />
      )}
      {showLabel && (
        <span className="text-[10px] font-black uppercase tracking-wider">
          {isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
};

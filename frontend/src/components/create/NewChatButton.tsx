import React from 'react';
import { Plus } from 'lucide-react';

interface NewChatButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const NewChatButton: React.FC<NewChatButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-4 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] hover:bg-black dark:hover:bg-neutral-200 font-body font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 border border-[#1F1E1E] dark:border-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label="Start new trip planning conversation"
    >
      <Plus className="w-4 h-4 stroke-[2.5]" />
      <span>New Voyage</span>
    </button>
  );
};

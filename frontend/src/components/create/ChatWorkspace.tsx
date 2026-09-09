import React, { useRef, useEffect } from 'react';
import { Menu, Layers, Compass, RotateCcw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ChatMessage, ChatMessageItem } from './ChatMessage';
import { ChatWelcome } from './ChatWelcome';
import { ChatComposer } from './ChatComposer';
import { ThemeToggle } from '../common/ThemeToggle';

interface ChatWorkspaceProps {
  messages: ChatMessageItem[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  onOpenMobileSidebar: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  activeChatTitle?: string;
  isSpatialOpen: boolean;
  onToggleSpatial: () => void;
  onSelectPrompt: (promptText: string) => void;
  isLoading?: boolean;
  onResetChat?: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSendMessage,
  onOpenMobileSidebar,
  isSidebarOpen = true,
  onToggleSidebar,
  activeChatTitle,
  isSpatialOpen,
  onToggleSpatial,
  onSelectPrompt,
  isLoading = false,
  onResetChat,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll handling: scroll to bottom on new messages, scroll to top on new chat / welcome screen
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (messages.length > 0) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121212] text-[#1F1E1E] dark:text-[#F5F5F5] relative overflow-hidden font-body">
      {/* Top Workspace Header Bar */}
      <header className="h-14 border-b border-[#D9D9D9] dark:border-[#2E2E2E] px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-[#151515] shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Sidebar Toggle (Desktop + Mobile) */}
          <button
            type="button"
            onClick={onToggleSidebar || onOpenMobileSidebar}
            className="p-1.5 text-[#1F1E1E] dark:text-[#F5F5F5] hover:bg-[#D9D9D9]/40 dark:hover:bg-[#262626] transition-colors cursor-pointer"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
            title={isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 hidden lg:block" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 hidden lg:block" />
            )}
            <Menu className="w-5 h-5 lg:hidden" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#1F1E1E] dark:bg-white shrink-0" />
            <h1 className="font-extrabold uppercase tracking-tight text-xs sm:text-sm text-[#1F1E1E] dark:text-white truncate max-w-[180px] sm:max-w-md">
              {activeChatTitle || 'New Trip Planning'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages && onResetChat && (
            <button
              type="button"
              onClick={onResetChat}
              className="py-1 px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1F1E1E] dark:text-[#CCCCCC] hover:text-black dark:hover:text-white hover:bg-[#D9D9D9]/40 dark:hover:bg-[#262626] flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Theme Switcher Toggle (Single official toggle for /create) */}
          <ThemeToggle className="py-1.5 px-2" />

          {/* Spatial Column Toggle */}
          <button
            type="button"
            onClick={onToggleSpatial}
            className={`py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSpatialOpen
                ? 'bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] border-[#1F1E1E] dark:border-white'
                : 'bg-white dark:bg-[#1A1A1A] text-[#1F1E1E] dark:text-[#F5F5F5] border-[#D9D9D9] dark:border-[#333333] hover:border-[#1F1E1E] dark:hover:border-white'
            }`}
            aria-pressed={isSpatialOpen}
            aria-label="Toggle spatial universe view"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Spatial View</span>
          </button>
        </div>
      </header>

      {/* Center Scrollable Chat Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 lg:px-8 flex flex-col"
      >
        {!hasMessages ? (
          <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-start pt-1 sm:pt-4 pb-6">
            <ChatWelcome onSelectPrompt={onSelectPrompt} />
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col pb-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="w-full my-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-[#1F1E1E] dark:bg-[#2A2A2A] text-white flex items-center justify-center font-bold text-xs uppercase animate-pulse border border-[#1F1E1E] dark:border-[#444444]">
                  <Compass className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-white dark:bg-[#1A1A1A] border-2 border-[#1F1E1E] dark:border-[#2E2E2E] text-xs font-bold text-[#1F1E1E] dark:text-white flex items-center gap-2">
                  <span>TripVerse AI is synthesizing voyage options...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Composer */}
      <div className="p-4 sm:p-6 border-t border-[#D9D9D9] dark:border-[#2E2E2E] bg-white dark:bg-[#151515] shrink-0">
        <ChatComposer
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={
            hasMessages
              ? 'Reply or refine: add destinations, adjust days, or change preferences...'
              : 'Describe your voyage: destination, duration, budget, or preferred sights...'
          }
        />
      </div>
    </div>
  );
};

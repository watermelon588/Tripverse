import React, { useRef, useEffect } from "react";
import {
  Menu,
  Layers,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ChatMessage, ChatMessageItem } from "./ChatMessage";
import { AssistantAvatar } from "./AssistantAvatar";
import { ChatWelcome } from "./ChatWelcome";
import { ChatComposer } from "./ChatComposer";
import { OriginPromptCard } from "./OriginPromptCard";
import { ThemeToggle } from "../common/ThemeToggle";
import { GridBackground } from "../common/GridBackground";

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
  showOriginPrompt?: boolean;
  onSubmitManualOrigin?: (originText: string) => void;
  onSubmitGeolocationOrigin?: (
    latitude: number,
    longitude: number,
    label?: string,
  ) => void;
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
  showOriginPrompt = false,
  onSubmitManualOrigin,
  onSubmitGeolocationOrigin,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll handling: scroll to bottom on new messages, scroll to top on new chat / welcome screen
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (messages.length > 0 || isLoading) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#1F1E1E] text-[#1F1E1E] dark:text-[#F5F5F5] relative overflow-hidden font-body">
      {/* Architectural Square Drafting Grid Background */}
      <GridBackground />

      {/* Top Workspace Header Bar */}
      <header className="h-14 border-b-2 border-[#1F1E1E] dark:border-[#333333] px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-[#181818] shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Sidebar Toggle (Desktop + Mobile) with tactile physical border and shadow */}
          <button
            type="button"
            onClick={onToggleSidebar || onOpenMobileSidebar}
            className="p-1.5 text-[#1F1E1E] dark:text-[#F5F5F5] bg-white dark:bg-[#222222] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm btn-tactile cursor-pointer"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            title={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 hidden lg:block" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 hidden lg:block" />
            )}
            <Menu className="w-5 h-5 lg:hidden" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#1F1E1E] dark:bg-white shrink-0 border border-black dark:border-white shadow-tactile-sm" />
            <h1 className="font-extrabold uppercase tracking-tight text-xs sm:text-sm text-[#1F1E1E] dark:text-white truncate max-w-[180px] sm:max-w-md">
              {activeChatTitle || "New Trip Planning"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages && onResetChat && (
            <button
              type="button"
              onClick={onResetChat}
              className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-[#1F1E1E] dark:text-white bg-white dark:bg-[#222222] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm btn-tactile flex items-center gap-1.5 cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* Spatial Column Toggle */}
          <button
            type="button"
            onClick={onToggleSpatial}
            className={`py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider border-2 flex items-center gap-1.5 cursor-pointer shadow-tactile-sm btn-tactile ${
              isSpatialOpen
                ? "bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] border-[#1F1E1E] dark:border-white"
                : "bg-white dark:bg-[#222222] text-[#1F1E1E] dark:text-[#F5F5F5] border-[#1F1E1E] dark:border-[#555555]"
            }`}
            aria-pressed={isSpatialOpen}
            aria-label="Toggle spatial universe view"
          >
            <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="hidden sm:inline">Spatial View</span>
          </button>
        </div>
      </header>

      {/* Center Scrollable Chat Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 flex flex-col relative z-10"
      >
        {!hasMessages && !isLoading ? (
          <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-start pt-2 sm:pt-6 pb-6">
            <ChatWelcome onSelectPrompt={onSelectPrompt} />
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col pb-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Inline Origin Collection Prompt Card */}
            {showOriginPrompt &&
              !isLoading &&
              onSubmitManualOrigin &&
              onSubmitGeolocationOrigin && (
                <OriginPromptCard
                  onSubmitManual={onSubmitManualOrigin}
                  onSubmitGeolocation={onSubmitGeolocationOrigin}
                  disabled={isLoading}
                />
              )}

            {/* Thinking Animation (Tactile PFP container + thinking text) */}
            {isLoading && (
              <div className="w-full my-4 flex items-center gap-3 font-body select-none pl-1">
                <AssistantAvatar size={48} isThinking={true} />
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1F1E1E] dark:text-white bg-white dark:bg-[#1A1A1A] border-2 border-[#1F1E1E] dark:border-[#444444] px-3 py-2 shadow-tactile-sm">
                  <span>TripVerse Thinking</span>
                  <span className="inline-flex gap-1 items-center ml-1">
                    <span className="w-1.5 h-1.5 bg-[#1F1E1E] dark:bg-white animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#1F1E1E] dark:bg-white animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#1F1E1E] dark:bg-white animate-bounce"></span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Composer */}
      <div className="p-4 sm:p-6 border-t-2 border-[#1F1E1E] dark:border-[#333333] bg-white dark:bg-[#181818] shrink-0 z-10">
        <ChatComposer
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={
            hasMessages
              ? "Reply or refine: add destinations, adjust days, or change preferences..."
              : "Describe your voyage: destination, duration, budget, or preferred sights..."
          }
        />
      </div>
    </div>
  );
};

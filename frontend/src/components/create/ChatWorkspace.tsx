/*
 * ChatWorkspace — the centre column of the planner, on the v2 system.
 *
 * Header bar, scrolling transcript, and a sticky composer. Hairlines and
 * quiet surfaces replace the previous hard-shadow tactile chrome.
 */
import React, { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { ChatMessage, type ChatMessageItem } from './ChatMessage';
import { AssistantAvatar } from './AssistantAvatar';
import { ChatWelcome } from './ChatWelcome';
import { ChatComposer } from './ChatComposer';
import { OriginPromptCard } from './OriginPromptCard';
import { ThemeToggle } from '../common/ThemeToggle';
import { MenuIcon, LayersIcon, GraphIcon } from '../home/v2/IconsV2';
import { EASE, prefersReducedMotion } from '../home/v2/motion';

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
  onSubmitGeolocationOrigin?: (latitude: number, longitude: number, label?: string) => void;
}

function ResetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V10H9" />
    </svg>
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // Follow the transcript down as it grows; return to the top on a new chat.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = hasMessages || isLoading ? el.scrollHeight : 0;
  }, [messages, isLoading, hasMessages]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.tv-chat__bar > *', {
        y: -10,
        opacity: 0,
        duration: 0.6,
        ease: EASE,
        stagger: 0.05,
      });
    },
    { scope: root },
  );

  return (
    <div className="tv-chat" ref={root}>
      <header className="tv-chat__bar">
        <button
          type="button"
          className="tv-iconbtn"
          onClick={onToggleSidebar || onOpenMobileSidebar}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
        >
          <MenuIcon width={19} height={19} />
        </button>

        <div className="tv-chat__title">
          <GraphIcon width={15} height={15} />
          <h1>{activeChatTitle || 'New trip'}</h1>
        </div>

        <span className="tv-app__bar-spacer" />

        {hasMessages && onResetChat && (
          <button type="button" className="tv-iconbtn" onClick={onResetChat} title="Start over" aria-label="Start over">
            <ResetIcon width={17} height={17} />
          </button>
        )}

        <ThemeToggle />

        <button
          type="button"
          className={`tv-btn tv-btn--sm ${isSpatialOpen ? 'tv-btn--primary' : 'tv-btn--ghost'}`}
          onClick={onToggleSpatial}
          aria-pressed={isSpatialOpen}
        >
          <LayersIcon width={14} height={14} />
          <span className="tv-hide-mobile">Spatial view</span>
        </button>
      </header>

      <div className="tv-chat__scroll" ref={scrollRef}>
        {!hasMessages && !isLoading ? (
          <div className="tv-chat__welcome-wrap">
            <ChatWelcome onSelectPrompt={onSelectPrompt} />
          </div>
        ) : (
          <div className="tv-chat__thread">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {showOriginPrompt && !isLoading && onSubmitManualOrigin && onSubmitGeolocationOrigin && (
              <OriginPromptCard
                onSubmitManual={onSubmitManualOrigin}
                onSubmitGeolocation={onSubmitGeolocationOrigin}
                disabled={isLoading}
              />
            )}

            {isLoading && (
              <div className="tv-chat__thinking">
                <AssistantAvatar size={34} isThinking />
                <div className="tv-chat__thinking-body">
                  <span className="tv-label">TripVerse is reasoning</span>
                  <span className="tv-dots" aria-hidden="true">
                    <i /> <i /> <i />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tv-chat__composer">
        <ChatComposer
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={
            hasMessages
              ? 'Refine it — add a city, move a day, cap the budget…'
              : 'Describe the trip: where, how long, how you like to travel…'
          }
        />
      </div>
    </div>
  );
};

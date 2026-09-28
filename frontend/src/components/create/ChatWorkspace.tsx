/*
 * ChatWorkspace — the centre column of the planner, on the v2 system.
 *
 * Header bar, scrolling transcript, and a sticky composer. Hairlines and
 * quiet surfaces replace the previous hard-shadow tactile chrome.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { ChatMessage, type ChatMessageItem } from './ChatMessage';
import { AssistantAvatar } from './AssistantAvatar';
import { ChatWelcome } from './ChatWelcome';
import { ChatComposer } from './ChatComposer';
import { TripOnboardingForm, type OnboardingValues } from './TripOnboardingForm';
import { TripPlanningChoice } from './TripPlanningChoice';
import { CopilotPanel, type CopilotOp, type CopilotState } from './CopilotPanel';
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
  /** Opens the Trip Studio (plan, map, 3D). Hidden until a plan exists. */
  onOpenStudio?: () => void;
  /** The trip card that closes the conversation and leads into the studio. */
  tripPreview?: React.ReactNode;
  /** 'drawer': the same chat inside the studio, without page-level controls. */
  variant?: 'page' | 'drawer';
  isBudgetOpen?: boolean;
  onToggleBudget?: () => void;
  onSelectPrompt: (promptText: string) => void;
  isLoading?: boolean;
  loadingStage?: string;
  onResetChat?: () => void;
  onboardingValues?: Partial<OnboardingValues> | null;
  onSubmitOnboarding?: (values: OnboardingValues) => void;
  showPlanningChoice?: boolean;
  planningBrief?: Partial<OnboardingValues> | null;
  onGenerateFull?: () => void;
  onStartBuild?: () => void;
  copilot?: CopilotState | null;
  onCopilotOps?: (ops: CopilotOp[], label: string, day: number) => void;
  copilotDay?: number | null;
  onCopilotDay?: (day: number) => void;
  showComposer?: boolean;
}

function ResetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V10H9" />
    </svg>
  );
}

function BudgetIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M7 5V3m10 2V3M7 14h4m3 0h3" />
  </svg>;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSendMessage,
  onOpenMobileSidebar,
  isSidebarOpen = true,
  onToggleSidebar,
  activeChatTitle,
  onOpenStudio,
  tripPreview,
  variant = 'page',
  isBudgetOpen = false,
  onToggleBudget,
  onSelectPrompt,
  isLoading = false,
  loadingStage = 'Putting your trip together',
  onResetChat,
  onboardingValues,
  onSubmitOnboarding,
  showPlanningChoice,
  planningBrief,
  onGenerateFull,
  onStartBuild,
  copilot,
  onCopilotOps,
  copilotDay,
  onCopilotDay,
  showComposer = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [editingBrief, setEditingBrief] = useState(false);
  const hasMessages = messages.length > 0;

  // Follow the transcript down as it grows, but only while the reader is already at
  // the bottom — a streamed itinerary must not yank someone reading further up.
  const pinned = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!hasMessages && !isLoading) { el.scrollTop = 0; pinned.current = true; return; }
    if (pinned.current) el.scrollTop = el.scrollHeight;
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
    <div className={`tv-chat ${variant === 'drawer' ? 'tv-chat--drawer' : ''}`} ref={root}>
      <header className="tv-chat__bar">
        {variant === 'page' && <button
          type="button"
          className="tv-iconbtn"
          onClick={onToggleSidebar || onOpenMobileSidebar}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
        >
          <MenuIcon width={19} height={19} />
        </button>}

        <div className="tv-chat__title">
          <GraphIcon width={15} height={15} />
          <h1>{activeChatTitle || 'New trip'}</h1>
        </div>

        <span className="tv-app__bar-spacer" />

        {variant === 'page' && hasMessages && onResetChat && (
          <button type="button" className="tv-iconbtn" onClick={onResetChat} title="Start over" aria-label="Start over">
            <ResetIcon width={17} height={17} />
          </button>
        )}

        {variant === 'page' && <ThemeToggle />}

        {variant === 'page' && onToggleBudget && <button type="button"
          className={`tv-btn tv-btn--sm ${isBudgetOpen ? 'tv-btn--primary' : 'tv-btn--ghost'}`}
          onClick={onToggleBudget} aria-pressed={isBudgetOpen} aria-label="Trip budget">
          <BudgetIcon width={14} height={14} /><span className="tv-hide-mobile">Budget</span>
        </button>}

        {variant === 'page' && onOpenStudio && (
          <button type="button" className="tv-btn tv-btn--sm tv-btn--ghost" onClick={onOpenStudio}>
            <LayersIcon width={14} height={14} />
            <span className="tv-hide-mobile">Open studio</span>
          </button>
        )}
      </header>

      <div className="tv-chat__scroll" ref={scrollRef} onScroll={(event) => {
        const el = event.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}>
        {!hasMessages && !isLoading ? (
          <div className="tv-chat__welcome-wrap">
            <ChatWelcome onSelectPrompt={onSelectPrompt} />
          </div>
        ) : (
          <div className="tv-chat__thread">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Forms belong to the turn before a stream; the trip status only updates when
                the stream finishes, so hide them while a response is being written. */}
            {!isLoading && onboardingValues && onSubmitOnboarding && (
              <TripOnboardingForm initial={onboardingValues} onSubmit={onSubmitOnboarding} disabled={isLoading} />
            )}

            {!isLoading && showPlanningChoice && onGenerateFull && (
              editingBrief && planningBrief && onSubmitOnboarding
                ? <TripOnboardingForm initial={planningBrief} disabled={isLoading} onSubmit={(values) => { setEditingBrief(false); onSubmitOnboarding(values); }} />
                : <TripPlanningChoice disabled={isLoading} onGenerateFull={onGenerateFull} onStartBuild={onStartBuild} brief={planningBrief || undefined} onEditDetails={() => setEditingBrief(true)} />
            )}

            {tripPreview}

            {isLoading && (
              <div className="tv-chat__thinking">
                <AssistantAvatar size={34} isThinking />
                <div className="tv-chat__thinking-body">
                  <span className="tv-label">{loadingStage}</span>
                  <span className="tv-dots" aria-hidden="true">
                    <i /> <i /> <i />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {copilot && onCopilotOps && onCopilotDay && <CopilotPanel copilot={copilot} disabled={isLoading}
        viewDay={copilotDay || copilot.current_day} onViewDay={onCopilotDay} onOps={onCopilotOps} />}

      {showComposer && <div className="tv-chat__composer">
        <ChatComposer
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={
            hasMessages
              ? 'Tell me where you want to go, or ask a travel question…'
              : 'Where are you thinking of going?'
          }
        />
      </div>}
    </div>
  );
};

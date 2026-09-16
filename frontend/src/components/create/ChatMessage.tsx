/*
 * ChatMessage — transcript entry on the v2 system.
 *
 * Editorial transcript rather than chat bubbles: a mono header line
 * (who • when) above a hairline-bordered body. Metadata renders as real
 * tagged chips with icons — the previous emoji badges are out; the system
 * bans emoji.
 */
import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { AssistantAvatar } from './AssistantAvatar';
import { MarkdownMessage } from './MarkdownMessage';
import { useAuth } from '../../context/AuthContext';
import { CheckIcon, ClockIcon, PinIcon, PlaneIcon, WalletIcon } from '../home/v2/IconsV2';
import { EASE, prefersReducedMotion } from '../home/v2/motion';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  stage?: string;
  metadata?: {
    destination?: string;
    duration?: string;
    origin?: string;
    budget?: string;
    interests?: string[];
  };
}

interface ChatMessageProps {
  message: ChatMessageItem;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { user } = useAuth();
  const root = useRef<HTMLDivElement>(null);

  const avatarUrl =
    user?.user_metadata?.avatar_url || localStorage.getItem('tripverse-user-avatar');
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  // Each entry rises in once as it mounts.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(root.current, { y: 16, opacity: 0, duration: 0.6, ease: EASE });
    },
    { scope: root },
  );

  if (isSystem) {
    return (
      <div className="tv-msg2 tv-msg2--system" ref={root}>
        <CheckIcon width={15} height={15} />
        <span className="tv-label">{message.stage || 'Checkpoint'}</span>
        <span className="tv-msg2__system-text">{message.content}</span>
        <span className="tv-meta">{message.timestamp}</span>
      </div>
    );
  }

  const meta = message.metadata;
  const chips = [
    meta?.destination && { Icon: PinIcon, value: meta.destination },
    meta?.duration && { Icon: ClockIcon, value: meta.duration },
    meta?.origin && { Icon: PlaneIcon, value: meta.origin },
    meta?.budget && { Icon: WalletIcon, value: meta.budget },
  ].filter(Boolean) as Array<{ Icon: typeof PinIcon; value: string }>;

  return (
    <article className={`tv-msg2 ${isUser ? 'tv-msg2--user' : 'tv-msg2--agent'}`} ref={root}>
      <div className="tv-msg2__avatar">
        {isUser ? (
          <span className="tv-msg2__you">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              (user?.email ?? 'Y').slice(0, 1).toUpperCase()
            )}
          </span>
        ) : (
          <AssistantAvatar size={34} />
        )}
      </div>

      <div className="tv-msg2__col">
        <div className="tv-msg2__head">
          <span className="tv-label">{isUser ? 'You' : 'TripVerse'}</span>
          <span className="tv-meta">{message.timestamp}</span>
        </div>

        <div className="tv-msg2__body">
          {isUser ? (
            <p className="tv-msg2__text">{message.content}</p>
          ) : message.content ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <span className="tv-dots" aria-label="Writing">
              <i /> <i /> <i />
            </span>
          )}

          {chips.length > 0 && (
            <div className="tv-msg2__chips">
              {chips.map(({ Icon, value }) => (
                <span key={value} className="tv-tag">
                  <Icon width={12} height={12} />
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

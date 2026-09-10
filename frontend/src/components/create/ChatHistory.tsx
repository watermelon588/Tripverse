import React from 'react';
import { MessageSquare, Trash2, Clock } from 'lucide-react';

export interface ChatSessionItem {
  id: string;
  title: string;
  timestamp: string;
  preview?: string;
  messageCount?: number;
  tripContext?: {
    destination?: string;
    days?: number;
    budget?: number;
  };
}

interface ChatHistoryProps {
  sessions: ChatSessionItem[];
  activeSessionId?: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string, e: React.MouseEvent) => void;
  className?: string;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  className = '',
}) => {
  if (sessions.length === 0) {
    return (
      <div className={`p-4 text-center text-xs text-[#1F1E1E]/50 dark:text-[#F5F5F5]/50 font-body ${className}`}>
        No previous voyages logged.
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 overflow-y-auto ${className}`}>
      <div className="px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#1F1E1E] dark:text-[#CCCCCC] font-body flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#1F1E1E] dark:text-[#CCCCCC]" />
          <span>Past Voyages</span>
        </span>
        <span className="font-mono text-[10px] font-bold">{sessions.length}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative p-3 text-left transition-all duration-150 cursor-pointer border ${
                isActive
                  ? 'bg-[#F2F2F2] dark:bg-[#1E1E1E] border-[#1F1E1E] dark:border-[#555555] border-l-4 border-l-[#1F1E1E] dark:border-l-4 dark:border-l-white'
                  : 'bg-white dark:bg-[#151515] border-[#E5E5E5] dark:border-transparent hover:border-[#1F1E1E] dark:hover:border-[#444444] hover:bg-[#F9F9F9] dark:hover:bg-[#1C1C1C]'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSession(session.id);
                }
              }}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      isActive
                        ? 'text-[#1F1E1E] dark:text-white'
                        : 'text-[#1F1E1E]/60 dark:text-[#F5F5F5]/60 group-hover:text-[#1F1E1E] dark:group-hover:text-white'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold uppercase truncate tracking-tight font-body ${
                        isActive
                          ? 'text-[#1F1E1E] dark:text-white'
                          : 'text-[#1F1E1E] dark:text-[#E5E5E5] group-hover:text-black dark:group-hover:text-white'
                      }`}
                    >
                      {session.title}
                    </p>
                    {session.preview && (
                      <p className="text-[11px] text-[#1F1E1E]/90 dark:text-[#CCCCCC] truncate font-body font-normal mt-0.5">
                        {session.preview}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold tracking-wider text-[#1F1E1E]/80 dark:text-[#A3A3A3] uppercase font-mono">
                      <span>{session.timestamp}</span>
                      {session.messageCount !== undefined && (
                        <span>&bull; {session.messageCount} msgs</span>
                      )}
                    </div>
                  </div>
                </div>

                {onDeleteSession && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteSession(session.id, e);
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-[#1F1E1E]/40 dark:text-[#F5F5F5]/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0 cursor-pointer z-10"
                    aria-label={`Delete ${session.title}`}
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

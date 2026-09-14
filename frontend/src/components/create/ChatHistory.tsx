import React from "react";
import { MessageSquare, Trash2, Clock } from "lucide-react";

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
  className = "",
}) => {
  if (sessions.length === 0) {
    return (
      <div
        className={`p-4 text-center text-xs text-[#1F1E1E]/50 dark:text-[#F5F5F5]/50 font-body ${className}`}
      >
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
        <span className="font-mono text-[10px] font-bold">
          {sessions.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative p-3 text-left transition-all duration-150 cursor-pointer border-2 rounded-none ${
                isActive
                  ? "bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] border-[#1F1E1E] dark:border-white shadow-tactile"
                  : "bg-white dark:bg-[#1A1A1A] border-[#1F1E1E]/30 dark:border-[#444444] hover:border-[#1F1E1E] dark:hover:border-white shadow-tactile-sm btn-tactile"
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectSession(session.id);
                }
              }}
              aria-current={isActive ? "true" : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      isActive
                        ? "text-white dark:text-[#1F1E1E]"
                        : "text-[#1F1E1E]/70 dark:text-[#CCCCCC] group-hover:text-[#1F1E1E] dark:group-hover:text-white"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-black uppercase truncate tracking-tight font-body ${
                        isActive
                          ? "text-white dark:text-[#1F1E1E]"
                          : "text-[#1F1E1E] dark:text-[#F5F5F5] group-hover:text-black dark:group-hover:text-white"
                      }`}
                    >
                      {session.title}
                    </p>
                    {session.preview && (
                      <p
                        className={`text-[11px] truncate font-body font-normal mt-0.5 ${
                          isActive
                            ? "text-white/80 dark:text-[#1F1E1E]/80"
                            : "text-[#1F1E1E]/80 dark:text-[#BBBBBB]"
                        }`}
                      >
                        {session.preview}
                      </p>
                    )}
                    <div
                      className={`flex items-center gap-2 mt-1.5 text-[9px] font-bold tracking-wider uppercase font-mono ${
                        isActive
                          ? "text-white/70 dark:text-[#1F1E1E]/70"
                          : "text-[#1F1E1E]/70 dark:text-[#888888]"
                      }`}
                    >
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
                    className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 transition-all shrink-0 cursor-pointer z-10 ${
                      isActive
                        ? "text-white/70 hover:text-white hover:bg-white/10 dark:text-[#1F1E1E]/70 dark:hover:text-[#1F1E1E] dark:hover:bg-black/10"
                        : "text-[#1F1E1E]/50 dark:text-[#F5F5F5]/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    }`}
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

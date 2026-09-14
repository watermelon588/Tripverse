import React from "react";
import { AssistantAvatar } from "./AssistantAvatar";
import { User, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MarkdownMessage } from "./MarkdownMessage";

export interface ChatMessageItem {
  id: string;
  sender: "user" | "assistant" | "system";
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
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    localStorage.getItem("tripverse-user-avatar");
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";

  if (isSystem) {
    return (
      <div className="w-full my-3 flex items-center justify-center font-body">
        <div className="max-w-2xl w-full bg-white dark:bg-[#181818] border-2 border-[#1F1E1E] dark:border-[#444444] shadow-tactile-sm p-3.5 text-xs text-[#1F1E1E] dark:text-[#E5E5E5] flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#1F1E1E] dark:text-[#E5E5E5] shrink-0 stroke-[2.4]" />
          <div className="flex-1">
            <span className="font-black uppercase tracking-wider text-[10px] text-[#1F1E1E] dark:text-white mr-2">
              {message.stage || "SYSTEM CHECKPOINT"}
            </span>
            <span className="font-medium text-[#1F1E1E] dark:text-[#E5E5E5]">
              {message.content}
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-[#1F1E1E]/80 dark:text-[#888888] shrink-0">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full my-4.5 flex flex-col font-body ${
        isUser ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`max-w-3xl w-full flex gap-3.5 ${
          isUser ? "flex-row-reverse justify-start" : "flex-row justify-start"
        }`}
      >
        {/* Sender Avatar with sharp geometric frame & hard shadow */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-[42px] h-[42px] bg-[#1F1E1E] dark:bg-[#252525] text-white flex items-center justify-center font-black text-xs uppercase border-2 border-[#1F1E1E] dark:border-white shadow-tactile-sm overflow-hidden rounded-none">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="You"
                  className="w-full h-full object-cover rounded-none"
                />
              ) : (
                <User className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
          ) : (
            <AssistantAvatar size={42} />
          )}
        </div>

        {/* Editorial Transcript Content Box */}
        <div
          className={`flex flex-col gap-1.5 max-w-[88%] sm:max-w-[80%] ${
            isUser ? "items-end" : "items-start"
          }`}
        >
          {/* Header Metadata */}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1F1E1E] dark:text-[#CCCCCC]">
            <span>{isUser ? "You" : "TripVerse Intelligence"}</span>
            <span>&bull;</span>
            <span className="font-mono font-bold text-[#1F1E1E]/80 dark:text-[#A3A3A3]">
              {message.timestamp}
            </span>
          </div>

          {/* Body Content Box */}
          <div
            className={`p-4 sm:p-5 text-sm leading-relaxed ${
              isUser
                ? "bg-[#1F1E1E] dark:bg-[#252525] text-white font-medium border-2 border-[#1F1E1E] dark:border-[#555555] shadow-[3px_3px_0px_#D9D9D9] dark:shadow-tactile"
                : "bg-white dark:bg-[#1A1A1A] border-2 border-[#1F1E1E] dark:border-[#444444] text-[#1F1E1E] dark:text-[#F5F5F5] font-normal shadow-tactile"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : message.content ? (
              <MarkdownMessage content={message.content} />
            ) : (
              <span className="inline-flex gap-1 items-center py-1">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
              </span>
            )}

            {/* Extracted Metadata Pills with tactile borders and shadows */}
            {message.metadata && (
              <div className="mt-3.5 pt-3 border-t-2 border-[#1F1E1E]/20 dark:border-[#333333] flex flex-wrap gap-2 text-xs">
                {message.metadata.destination && (
                  <span className="px-2 py-0.5 bg-[#F5F5F5] dark:bg-[#202020] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm text-[#1F1E1E] dark:text-[#F5F5F5] text-[10px] font-black uppercase tracking-wider">
                    📍 {message.metadata.destination}
                  </span>
                )}
                {message.metadata.duration && (
                  <span className="px-2 py-0.5 bg-[#F5F5F5] dark:bg-[#202020] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm text-[#1F1E1E] dark:text-[#F5F5F5] text-[10px] font-black uppercase tracking-wider">
                    ⏳ {message.metadata.duration}
                  </span>
                )}
                {message.metadata.origin && (
                  <span className="px-2 py-0.5 bg-[#F5F5F5] dark:bg-[#202020] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm text-[#1F1E1E] dark:text-[#F5F5F5] text-[10px] font-black uppercase tracking-wider">
                    🛫 {message.metadata.origin}
                  </span>
                )}
                {message.metadata.budget && (
                  <span className="px-2 py-0.5 bg-[#F5F5F5] dark:bg-[#202020] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm text-[#1F1E1E] dark:text-[#F5F5F5] text-[10px] font-black uppercase tracking-wider font-mono">
                    💵 {message.metadata.budget}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

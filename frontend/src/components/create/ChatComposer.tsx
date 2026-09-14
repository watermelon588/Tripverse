import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Mic, Paperclip } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";

export interface ChatComposerProps {
  onSendMessage: (content: string, attachments?: File[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "Describe your voyage: destination, duration, budget, or preferred sights...",
  initialValue = "",
}) => {
  const [input, setInput] = useState<string>(initialValue);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real browser speech recognition hook
  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    onTranscript: (spokenText: string) => {
      if (!spokenText.trim()) return;
      setInput((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) {
          return spokenText.trim();
        }
        return `${trimmed} ${spokenText.trim()}`;
      });
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
  });

  // Sync when initialValue changes from external prompt selection
  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Auto-resize textarea height to sensible limits
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || disabled) return;
    onSendMessage(trimmed, attachments);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...selected]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const canSubmit =
    (input.trim().length > 0 || attachments.length > 0) &&
    !isLoading &&
    !disabled;

  return (
    <div className="w-full max-w-4xl mx-auto font-body">
      {/* ONE Unified Composer Container with crisp 2px border and hard physical shadow */}
      <div className="relative border-2 border-[#1F1E1E] dark:border-[#555555] bg-white dark:bg-[#1A1A1A] p-2.5 sm:p-3 transition-all duration-200 shadow-tactile focus-within:border-black dark:focus-within:border-white focus-within:shadow-tactile-lg rounded-none">
        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Attached Files Pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2.5 border-b-2 border-[#1F1E1E]/20 dark:border-[#333333]">
            {attachments.map((file, idx) => (
              <span
                key={`${file.name}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F5F5F5] dark:bg-[#252525] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm text-[11px] font-mono text-[#1F1E1E] dark:text-white rounded-none"
              >
                <Paperclip className="w-3 h-3 text-[#1F1E1E] dark:text-[#A3A3A3]" />
                <span className="max-w-[140px] truncate font-bold">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-[#1F1E1E] dark:text-white/80 hover:text-red-600 dark:hover:text-red-400 ml-1 cursor-pointer font-black"
                  title={`Remove ${file.name}`}
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ALL FOUR CONTROLS ON ONE SINGLE HORIZONTAL LINE */}
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          {/* 1. Attachment (+) Button → LEFT */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="flex-shrink-0 p-1.5 sm:p-2 text-[#1F1E1E] dark:text-[#F5F5F5] bg-[#F5F5F5] dark:bg-[#252525] hover:bg-[#EBEBEB] dark:hover:bg-[#303030] border-2 border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm btn-tactile cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed rounded-none"
            title="Attach files"
            aria-label="Attach files"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
          </button>

          {/* 2. Textarea → CENTER and takes all available space */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder={placeholder}
            rows={1}
            className="flex-1 min-w-0 bg-transparent text-[#1F1E1E] dark:text-white placeholder-[#1F1E1E]/60 dark:placeholder-[#888888] font-body text-xs sm:text-sm font-semibold resize-none focus:outline-none leading-normal border-0 p-0 m-0 max-h-36 overflow-y-auto block rounded-none"
            aria-label="Describe your voyage"
          />

          {/* 3. Microphone Button → RIGHT */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={!isSupported || disabled || isLoading}
            className={`flex-shrink-0 p-1.5 sm:p-2 flex items-center justify-center cursor-pointer border-2 rounded-none shadow-tactile-sm btn-tactile ${
              isListening
                ? "bg-red-600 text-white border-red-600"
                : !isSupported
                  ? "bg-transparent text-[#1F1E1E]/30 dark:text-white/20 border-dashed border-[#D9D9D9] dark:border-[#444444] cursor-not-allowed"
                  : "bg-[#F5F5F5] dark:bg-[#252525] text-[#1F1E1E] dark:text-[#F5F5F5] hover:bg-[#EBEBEB] dark:hover:bg-[#303030] border-[#1F1E1E] dark:border-[#555555]"
            }`}
            title={
              !isSupported
                ? "Voice input not supported in this browser"
                : isListening
                  ? "Listening... Click to stop"
                  : "Voice input (Click to speak)"
            }
            aria-label={
              !isSupported
                ? "Voice input not supported"
                : isListening
                  ? "Stop listening"
                  : "Start voice input"
            }
          >
            {isListening ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white animate-pulse" />
                <Mic className="w-4 h-4 text-white stroke-[2.4]" />
              </span>
            ) : (
              <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            )}
          </button>

          {/* 4. PLAN Button → FAR RIGHT */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSubmit}
            className={`flex-shrink-0 py-1.5 px-3.5 sm:py-2 sm:px-4 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 rounded-none whitespace-nowrap ${
              canSubmit
                ? "bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] hover:bg-black dark:hover:bg-neutral-200 border-[#1F1E1E] dark:border-white shadow-tactile-sm btn-tactile cursor-pointer"
                : "bg-[#E5E5E5] dark:bg-[#252525] text-[#888888] dark:text-[#666666] border-[#D9D9D9] dark:border-[#383838] cursor-not-allowed"
            }`}
            aria-label="Send voyage prompt"
          >
            <span>{isLoading ? "Processing" : "Plan"}</span>
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.6]" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-center text-[#1F1E1E]/75 dark:text-[#A3A3A3] mt-2 font-mono font-bold tracking-wider uppercase">
        TripVerse AI builds interactive itineraries, spatial maps, and dynamic
        budgets.
      </p>
    </div>
  );
};

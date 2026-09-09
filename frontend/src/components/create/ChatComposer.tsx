import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Plus, Mic, Paperclip } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

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
  placeholder = 'Describe your voyage: destination, duration, budget, or preferred sights...',
  initialValue = '',
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
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || disabled) return;
    onSendMessage(trimmed, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const canSubmit =
    (input.trim().length > 0 || attachments.length > 0) && !isLoading && !disabled;

  return (
    <div className="w-full max-w-4xl mx-auto font-body">
      {/* ONE Unified Composer Container with a single outer border */}
      <div className="relative border-2 border-[#1F1E1E] dark:border-[#3E3E3E] bg-white dark:bg-[#1E1E1E] p-2 sm:p-2.5 transition-all duration-200 focus-within:border-black dark:focus-within:border-white rounded-none">
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

        {/* Attached Files Pills (rendered cleanly above the input line if any files attached) */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-[#E5E5E5] dark:border-[#333333]">
            {attachments.map((file, idx) => (
              <span
                key={`${file.name}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#F2F2F2] dark:bg-[#2A2A2A] border border-[#D9D9D9] dark:border-[#444444] text-[11px] font-mono text-[#1F1E1E] dark:text-white rounded-none"
              >
                <Paperclip className="w-3 h-3 text-[#1F1E1E]/70 dark:text-[#A3A3A3]" />
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-[#1F1E1E]/60 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 ml-0.5 cursor-pointer font-bold"
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
        <div className="flex items-center gap-2 sm:gap-2.5 w-full">
          {/* 1. Attachment (+) Button → LEFT */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="flex-shrink-0 p-1.5 sm:p-2 text-[#1F1E1E] dark:text-[#F5F5F5] hover:bg-[#D9D9D9]/40 dark:hover:bg-[#2A2A2A] border border-transparent hover:border-[#D9D9D9] dark:hover:border-[#444444] transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed rounded-none"
            title="Attach files"
            aria-label="Attach files"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
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
            className="flex-1 min-w-0 bg-transparent text-[#1F1E1E] dark:text-white placeholder-[#1F1E1E]/70 dark:placeholder-[#999999] font-body text-xs sm:text-sm font-medium resize-none focus:outline-none leading-normal border-0 p-0 m-0 max-h-36 overflow-y-auto block rounded-none"
            aria-label="Describe your voyage"
          />

          {/* 3. Microphone Button → RIGHT */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={!isSupported || disabled || isLoading}
            className={`flex-shrink-0 p-1.5 sm:p-2 transition-all flex items-center justify-center cursor-pointer border rounded-none ${
              isListening
                ? 'bg-red-600 text-white border-red-600'
                : !isSupported
                ? 'text-[#1F1E1E]/30 dark:text-white/20 border-transparent cursor-not-allowed'
                : 'text-[#1F1E1E] dark:text-[#F5F5F5] hover:bg-[#D9D9D9]/40 dark:hover:bg-[#2A2A2A] border-transparent hover:border-[#D9D9D9] dark:hover:border-[#444444]'
            }`}
            title={
              !isSupported
                ? 'Voice input not supported in this browser'
                : isListening
                ? 'Listening... Click to stop'
                : 'Voice input (Click to speak)'
            }
            aria-label={
              !isSupported
                ? 'Voice input not supported'
                : isListening
                ? 'Stop listening'
                : 'Start voice input'
            }
          >
            {isListening ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white animate-pulse" />
                <Mic className="w-4 h-4 text-white stroke-[2.2]" />
              </span>
            ) : (
              <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
            )}
          </button>

          {/* 4. PLAN Button → FAR RIGHT */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSubmit}
            className={`flex-shrink-0 py-1.5 px-3 sm:py-2 sm:px-4 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border rounded-none whitespace-nowrap ${
              canSubmit
                ? 'bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] hover:bg-black dark:hover:bg-slate-100 border-[#1F1E1E] dark:border-white'
                : 'bg-[#E5E5E5] dark:bg-[#282828] text-[#888888] dark:text-[#666666] border-transparent cursor-not-allowed'
            }`}
            aria-label="Send voyage prompt"
          >
            <span>{isLoading ? 'Processing' : 'Plan'}</span>
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-center text-[#1F1E1E]/80 dark:text-[#A3A3A3] mt-2 font-medium tracking-wide">
        TripVerse AI builds interactive itineraries, spatial maps, and dynamic budgets.
      </p>
    </div>
  );
};

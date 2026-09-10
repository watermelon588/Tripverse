import React, { useState, useEffect } from "react";

export type AssistantAvatarSize = "sm" | "header" | "message" | "welcome" | "thinking";

interface AssistantAvatarProps {
  size?: AssistantAvatarSize | number;
  className?: string;
  alt?: string;
  isThinking?: boolean;
}

/**
 * Centralized TripVerse AI Avatar sources.
 */
export const TRIPVERSE_AI_PFP = "/pfp/5ebc2b293bd93a26c5a67eb0d7c7c37a.jpg";
export const THINKING_FRAME_1 = "/pfp/1799ebaa48154581babb19b738f3428c-removebg-preview.png";
export const THINKING_FRAME_2 = "/pfp/ed31ea17c30c97a56d0d7b84b35ea020-removebg-preview.png";

// Eager preload thinking frames to eliminate any frame-switch flickering
if (typeof window !== "undefined") {
  const f1 = new Image();
  f1.src = THINKING_FRAME_1;
  const f2 = new Image();
  f2.src = THINKING_FRAME_2;
}

const SIZE_MAP: Record<AssistantAvatarSize, number> = {
  sm: 28,
  header: 34,
  message: 42,
  thinking: 72,
  welcome: 104,
};

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({
  size = "message",
  className = "",
  alt = "TripVerse AI Assistant",
  isThinking = false,
}) => {
  const [frame, setFrame] = useState<number>(0);

  // Play a 2-frame animated gif-style loop while thinking
  useEffect(() => {
    if (!isThinking) {
      setFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setFrame((prev) => (prev === 0 ? 1 : 0));
    }, 320);

    return () => clearInterval(interval);
  }, [isThinking]);

  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 42;
  const currentSrc = isThinking
    ? frame === 0
      ? THINKING_FRAME_1
      : THINKING_FRAME_2
    : TRIPVERSE_AI_PFP;

  return (
    <div
      className={`relative shrink-0 select-none transition-all duration-200 ${
        isThinking
          ? "bg-transparent border-0 overflow-visible flex items-center justify-center"
          : "overflow-hidden bg-[#1F1E1E] dark:bg-[#2A2A2A] border border-[#1F1E1E] dark:border-[#444444]"
      } ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
      }}
    >
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full select-none pointer-events-none ${
          isThinking
            ? "object-contain scale-125 drop-shadow-sm"
            : "object-cover object-center"
        }`}
        loading="eager"
      />
    </div>
  );
};

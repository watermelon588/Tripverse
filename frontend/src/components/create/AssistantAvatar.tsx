import React from "react";

export type AssistantAvatarSize = "sm" | "header" | "message" | "welcome";

interface AssistantAvatarProps {
  size?: AssistantAvatarSize | number;
  className?: string;
  alt?: string;
}

/**
 * Centralized TripVerse AI Chibi Avatar source.
 * Selected from curated /pfp dataset for high facial clarity, contrast, and recognizability.
 */
export const TRIPVERSE_AI_PFP = "pfp/5ebc2b293bd93a26c5a67eb0d7c7c37a.jpg";

const SIZE_MAP: Record<AssistantAvatarSize, number> = {
  sm: 28,
  header: 34,
  message: 42,
  welcome: 104,
};

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({
  size = "message",
  className = "",
  alt = "TripVerse AI Assistant",
}) => {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 36;

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-[#1F1E1E] dark:bg-[#2A2A2A] border border-[#1F1E1E] dark:border-[#444444] select-none ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
      }}
    >
      <img
        src={TRIPVERSE_AI_PFP}
        alt={alt}
        className="w-full h-full object-cover object-center"
        loading="eager"
      />
    </div>
  );
};

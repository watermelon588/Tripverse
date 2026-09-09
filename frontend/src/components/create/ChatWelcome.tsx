import React from 'react';
import { AssistantAvatar } from './AssistantAvatar';
import { Compass, ArrowRight } from 'lucide-react';

interface ChatWelcomeProps {
  onSelectPrompt: (promptText: string) => void;
}

const STARTER_PROMPTS = [
  {
    title: 'Cultural Odyssey in Japan',
    subtitle: '10 days &bull; Tokyo, Kyoto, Nara, Osaka &bull; Temples & Gastronomy',
    prompt: 'Plan a 10-day cultural journey to Japan focusing on traditional temples, tea ceremonies, vibrant street food in Osaka, and modern art in Tokyo with a budget of $3,500.',
  },
  {
    title: 'Alpine Scenic Route',
    subtitle: '7 days &bull; Zurich, Interlaken, Zermatt &bull; Panoramas & Trains',
    prompt: 'Create a 7-day scenic road and rail trip across Switzerland covering Zurich, Interlaken, and Zermatt with scenic hiking and alpine vistas.',
  },
  {
    title: 'Italian Coastal & Culinary Escape',
    subtitle: '8 days &bull; Rome, Florence, Amalfi Coast &bull; Architecture & Wine',
    prompt: 'Design an 8-day culinary and architectural escape to Italy visiting Rome, Florence, and the Amalfi Coast for 2 travelers.',
  },
  {
    title: 'Nordic Aurora & Fjords',
    subtitle: '6 days &bull; Tromsø & Lofoten &bull; Northern Lights & Nature',
    prompt: 'Plan a 6-day expedition to Norway for winter Northern Lights photography, fjord cruises, and authentic cabin stays.',
  },
];

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSelectPrompt }) => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-2 sm:py-4 px-2 sm:px-4 font-body">
      {/* Centralized Chibi Assistant Avatar */}
      <div className="mb-4">
        <AssistantAvatar size="welcome" />
      </div>

      {/* Main Tag & Heading */}
      <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#1F1E1E] dark:text-[#CCCCCC] mb-2 flex items-center gap-1.5">
        <Compass className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#CCCCCC]" />
        <span>TripVerse Intelligence</span>
      </div>

      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#1F1E1E] dark:text-white leading-[1.08] mb-3">
        Plan your next voyage.
      </h2>

      {/* Supporting Text */}
      <p className="text-sm sm:text-base text-[#1F1E1E] dark:text-[#E0E0E0] max-w-lg leading-relaxed mb-8 sm:mb-10 font-medium">
        Tell TripVerse where you want to go, what you want to experience, and how you like to travel. We will map your itinerary into an interactive trip universe.
      </p>

      {/* Starter Prompts Grid */}
      <div className="w-full text-left space-y-2.5">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#1F1E1E] dark:text-[#CCCCCC] px-1">
          Or start with a curated inspiration:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STARTER_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-4 bg-white dark:bg-[#1A1A1A] border-2 border-[#D9D9D9] dark:border-[#2E2E2E] hover:border-[#1F1E1E] dark:hover:border-white hover:bg-[#F9F9F9] dark:hover:bg-[#222222] transition-all text-left flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-tight text-[#1F1E1E] dark:text-white group-hover:text-black dark:group-hover:text-white">
                    {item.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#A3A3A3] group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div
                  className="text-[11px] text-[#1F1E1E]/90 dark:text-[#BBBBBB] mt-1.5 line-clamp-1 font-medium"
                  dangerouslySetInnerHTML={{ __html: item.subtitle }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

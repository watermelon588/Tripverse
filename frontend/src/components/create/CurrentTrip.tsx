import React from 'react';
import { MapPin, Calendar, DollarSign, Compass, Users } from 'lucide-react';

export interface CurrentTripContext {
  title?: string;
  destination?: string;
  origin?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  travelers?: number;
  status?: 'DISCOVERY' | 'ONBOARDING' | 'ROUTING' | 'ITINERARY' | 'CONFIRMED';
  interests?: string[];
}

interface CurrentTripProps {
  trip?: CurrentTripContext | null;
  onExploreSpatial?: () => void;
  className?: string;
}

export const CurrentTrip: React.FC<CurrentTripProps> = ({
  trip,
  onExploreSpatial,
  className = '',
}) => {
  // If no trip data is active or populated, do not clutter with empty placeholders
  if (!trip || (!trip.destination && !trip.title)) {
    return null;
  }

  const formatBudget = (val: number, cur = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      className={`border-2 border-[#1F1E1E] dark:border-[#333333] bg-white dark:bg-[#181818] p-4 text-[#1F1E1E] dark:text-[#F5F5F5] flex flex-col gap-3 font-body ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#D9D9D9] dark:border-[#2E2E2E] pb-2">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#1F1E1E] dark:text-[#E5E5E5] flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#E5E5E5]" />
          <span>Active Voyage</span>
        </div>
        {trip.status && (
          <span className="text-[9px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E]">
            {trip.status}
          </span>
        )}
      </div>

      <div>
        <h4 className="font-black text-sm uppercase tracking-tight text-[#1F1E1E] dark:text-white leading-snug">
          {trip.title || trip.destination || 'Uncharted Voyage'}
        </h4>
        {trip.destination && trip.title && trip.title !== trip.destination && (
          <p className="text-xs text-[#1F1E1E] dark:text-[#D4D4D4] font-medium flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-[#1F1E1E] dark:text-[#D4D4D4]" />
            <span>{trip.destination}</span>
          </p>
        )}
        {trip.origin && (
          <p className="text-xs text-[#1F1E1E]/80 dark:text-[#A3A3A3] font-medium flex items-center gap-1 mt-0.5">
            <span className="text-[11px]">🛫</span>
            <span>From {trip.origin}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#D9D9D9] dark:border-[#2E2E2E]">
        {trip.days && (
          <div className="flex items-center gap-1.5 text-[#1F1E1E] dark:text-[#E5E5E5]">
            <Calendar className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#A3A3A3] shrink-0" />
            <span className="font-bold">{trip.days} Days</span>
          </div>
        )}

        {trip.budget !== undefined && trip.budget > 0 && (
          <div className="flex items-center gap-1.5 text-[#1F1E1E] dark:text-[#E5E5E5] font-mono">
            <DollarSign className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#A3A3A3] shrink-0" />
            <span className="font-bold">
              {formatBudget(trip.budget, trip.currency || 'USD')}
            </span>
          </div>
        )}

        {trip.travelers && (
          <div className="flex items-center gap-1.5 text-[#1F1E1E] dark:text-[#E5E5E5]">
            <Users className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#A3A3A3] shrink-0" />
            <span className="font-bold">{trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}</span>
          </div>
        )}
      </div>

      {trip.interests && trip.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {trip.interests.slice(0, 4).map((interest) => (
            <span
              key={interest}
              className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#F5F5F5] dark:bg-[#242424] border border-[#1F1E1E]/40 dark:border-[#444444] text-[#1F1E1E] dark:text-[#F5F5F5]"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {onExploreSpatial && (
        <button
          type="button"
          onClick={onExploreSpatial}
          className="mt-1 w-full py-2 px-2 text-[10px] font-bold uppercase tracking-wider bg-[#1F1E1E] dark:bg-[#222222] border border-[#1F1E1E] dark:border-[#444444] text-white dark:text-[#F5F5F5] hover:bg-black dark:hover:bg-white dark:hover:text-[#1F1E1E] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Open Spatial Preview</span>
          <span>&rarr;</span>
        </button>
      )}
    </div>
  );
};

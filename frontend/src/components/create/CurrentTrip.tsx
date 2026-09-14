import React from "react";
import { MapPin, Calendar, DollarSign, Compass, Users } from "lucide-react";

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
  status?: "DISCOVERY" | "ONBOARDING" | "ROUTING" | "ITINERARY" | "CONFIRMED";
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
  className = "",
}) => {
  // If no trip data is active or populated, do not clutter with empty placeholders
  if (!trip || (!trip.destination && !trip.title)) {
    return null;
  }

  const formatBudget = (val: number, cur = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      className={`border-2 border-[#1F1E1E] dark:border-[#555555] bg-white dark:bg-[#1A1A1A] p-4 text-[#1F1E1E] dark:text-[#F5F5F5] flex flex-col gap-3 font-body shadow-tactile rounded-none ${className}`}
    >
      <div className="flex items-center justify-between border-b-2 border-[#1F1E1E]/15 dark:border-[#333333] pb-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#1F1E1E] dark:text-[#E5E5E5] flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#E5E5E5] stroke-[2.4]" />
          <span>Active Voyage</span>
        </div>
        {trip.status && (
          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] shadow-tactile-sm">
            {trip.status}
          </span>
        )}
      </div>

      <div>
        <h4 className="font-black text-sm uppercase tracking-tight text-[#1F1E1E] dark:text-white leading-snug">
          {trip.title || trip.destination || "Uncharted Voyage"}
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

      <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t-2 border-[#1F1E1E]/15 dark:border-[#333333]">
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
              {formatBudget(trip.budget, trip.currency || "USD")}
            </span>
          </div>
        )}

        {trip.travelers && (
          <div className="flex items-center gap-1.5 text-[#1F1E1E] dark:text-[#E5E5E5]">
            <Users className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#A3A3A3] shrink-0" />
            <span className="font-bold">
              {trip.travelers} {trip.travelers === 1 ? "Traveler" : "Travelers"}
            </span>
          </div>
        )}
      </div>

      {trip.interests && trip.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {trip.interests.slice(0, 4).map((interest) => (
            <span
              key={interest}
              className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 bg-[#F5F5F5] dark:bg-[#242424] border border-[#1F1E1E] dark:border-[#555555] shadow-tactile-sm text-[#1F1E1E] dark:text-[#F5F5F5]"
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
          className="mt-1 w-full py-2.5 px-3 text-[10px] font-black uppercase tracking-widest bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] border-2 border-[#1F1E1E] dark:border-white shadow-tactile-sm btn-tactile flex items-center justify-center gap-2 cursor-pointer rounded-none"
        >
          <span>Open Spatial Preview</span>
          <span>&rarr;</span>
        </button>
      )}
    </div>
  );
};

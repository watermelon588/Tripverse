import React from 'react';
import { X, Layers, Compass, MapPin, Maximize2 } from 'lucide-react';
import { CurrentTripContext } from './CurrentTrip';

interface SpatialWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: CurrentTripContext | null;
  onBuildFullUniverse?: () => void;
  className?: string;
}

/**
 * Dedicated 3rd-column workspace container for future Map and 3D Spatial Graph universe.
 * Prepared with clean prop boundaries for subsequent session integration.
 */
export const SpatialWorkspace: React.FC<SpatialWorkspaceProps> = ({
  isOpen,
  onClose,
  trip,
  onBuildFullUniverse,
  className = '',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`w-full lg:w-[420px] xl:w-[480px] h-full bg-white dark:bg-[#151515] border-l border-[#D9D9D9] dark:border-[#2E2E2E] text-[#1F1E1E] dark:text-[#F5F5F5] flex flex-col justify-between shrink-0 font-body z-20 ${className}`}
      aria-label="Spatial trip workspace"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#D9D9D9] dark:border-[#2E2E2E] flex items-center justify-between bg-[#F9F9F9] dark:bg-[#1A1A1A] shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#1F1E1E] dark:text-[#F5F5F5]" />
          <span className="font-extrabold uppercase tracking-wider text-xs text-[#1F1E1E] dark:text-white">
            Spatial Universe Preview
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#1F1E1E]/60 dark:text-[#F5F5F5]/60 hover:text-[#1F1E1E] dark:hover:text-white hover:bg-[#D9D9D9]/40 dark:hover:bg-[#262626] transition-colors cursor-pointer"
          aria-label="Close spatial workspace"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Spatial Visualization Canvas Placeholder */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-[#F9F9F9]/50 dark:bg-[#121212]/50 overflow-y-auto">
        <div className="w-16 h-16 bg-[#1F1E1E] dark:bg-[#2A2A2A] text-white flex items-center justify-center mb-4 border border-[#1F1E1E] dark:border-[#444444]">
          <Compass className="w-8 h-8" />
        </div>

        <h3 className="text-base font-black uppercase tracking-tight text-[#1F1E1E] dark:text-white mb-2">
          {trip?.destination ? `${trip.destination} Universe` : 'Interactive Spatial Topology'}
        </h3>

        <p className="text-xs text-[#1F1E1E]/70 dark:text-[#F5F5F5]/70 max-w-xs leading-relaxed mb-6 font-medium">
          Real-time 3D itinerary node graph, multi-modal map routing, and dynamic budget layers will render here as planning unfolds.
        </p>

        {/* Mock Node Topology Preview Cards */}
        <div className="w-full max-w-xs space-y-2 text-left">
          <div className="p-3 bg-white dark:bg-[#1C1C1C] border border-[#D9D9D9] dark:border-[#2E2E2E] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#F5F5F5]" />
              <span className="font-bold text-[#1F1E1E] dark:text-white uppercase">Destination Anchor</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#1F1E1E]/60 dark:text-[#F5F5F5]/60">
              {trip?.destination || 'Global'}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-[#1C1C1C] border border-[#D9D9D9] dark:border-[#2E2E2E] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-[#F5F5F5]" />
              <span className="font-bold text-[#1F1E1E] dark:text-white uppercase">Graph Mode</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#1F1E1E]/60 dark:text-[#F5F5F5]/60">
              3D Force Directed
            </span>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-[#D9D9D9] dark:border-[#2E2E2E] bg-white dark:bg-[#151515] shrink-0 space-y-2">
        {onBuildFullUniverse && (
          <button
            type="button"
            onClick={onBuildFullUniverse}
            className="w-full py-2.5 px-4 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] hover:bg-black dark:hover:bg-slate-100 font-body font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Launch Full Universe</span>
          </button>
        )}
      </div>
    </div>
  );
};

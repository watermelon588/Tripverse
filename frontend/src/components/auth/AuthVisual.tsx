import React from 'react';
import { AuthVisualItem, DEFAULT_AUTH_VISUAL } from '../../constants/authVisuals';

interface AuthVisualProps {
  visual?: AuthVisualItem;
  imageSrc?: string;
  destination?: string;
  location?: string;
  experience?: string;
  objectPosition?: string;
  expeditionTag?: string;
  voyageTag?: string;
}

export const AuthVisual: React.FC<AuthVisualProps> = ({
  visual = DEFAULT_AUTH_VISUAL,
  imageSrc,
  destination,
  location,
  experience,
  objectPosition,
  expeditionTag,
  voyageTag,
}) => {
  const activeImage = imageSrc || visual.imageSrc;
  const activeDestination = destination || visual.destination;
  const activeLocation = location || visual.location;
  const activeExperience = experience || visual.experience;
  const activePosition = objectPosition || visual.objectPosition;
  const activeExpedition = expeditionTag || visual.expeditionTag;
  const activeVoyage = voyageTag || visual.voyageTag;

  return (
    <div className="relative w-full h-full min-h-[360px] lg:min-h-full overflow-hidden bg-[#1F1E1E] select-none">
      {/* Background Photography Asset */}
      <img
        src={activeImage}
        alt={`${activeDestination} - ${activeExperience}`}
        className="w-full h-full object-cover"
        style={{ objectPosition: activePosition }}
        loading="eager"
      />

      {/* Solid High-Contrast Editorial Overlay Badges */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
        <div className="bg-[#1F1E1E] text-white px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-none">
          {activeVoyage}
        </div>
        <div className="bg-white text-[#1F1E1E] px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-none hidden sm:block">
          {activeExpedition}
        </div>
      </div>

      <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-3 pointer-events-none">
        <div className="bg-[#1F1E1E] text-white p-5 rounded-none max-w-md border-l-4 border-white">
          <div className="text-[10px] font-bold tracking-widest uppercase text-[#D9D9D9] mb-1">
            DESTINATION SNAPSHOT
          </div>
          <div className="text-2xl font-black tracking-tight text-white uppercase font-body">
            {activeDestination}
          </div>
          <div className="text-xs font-semibold tracking-wider text-[#D9D9D9] mt-0.5 uppercase font-body">
            {activeLocation}
          </div>
          <div className="text-xs text-white/80 mt-2 font-medium font-body">
            {activeExperience}
          </div>
        </div>
      </div>
    </div>
  );
};

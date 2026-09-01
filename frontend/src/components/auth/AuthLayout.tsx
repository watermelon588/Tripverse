import React from 'react';
import { LogoMarkIcon } from '../home/HomeIcons';
import { AuthVisual } from './AuthVisual';
import { AuthVisualItem } from '../../constants/authVisuals';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNavigateHome?: () => void;
  visual?: AuthVisualItem;
  visualImage?: string;
  destinationName?: string;
  locationName?: string;
  experienceName?: string;
  objectPosition?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  onNavigateHome,
  visual,
  visualImage,
  destinationName,
  locationName,
  experienceName,
  objectPosition,
}) => {
  return (
    <div className="h-screen w-full bg-white text-[#1F1E1E] flex flex-col lg:flex-row font-body selection:bg-[#1F1E1E] selection:text-white overflow-hidden">
      {/* Left Column: Form & Interaction (~42% on desktop) */}
      <div className="w-full lg:w-[44%] xl:w-[40%] h-full flex flex-col justify-between p-6 sm:p-8 lg:px-12 lg:pt-6 lg:pb-5 bg-white z-10 overflow-y-auto">
        {/* Header Branding */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onNavigateHome}
          >
            <LogoMarkIcon className="w-6 h-6 text-[#1F1E1E] transition-transform group-hover:scale-105" />
            <span className="font-extrabold tracking-widest text-base text-[#1F1E1E] uppercase font-body">
              TRIPVERSE
            </span>
          </div>

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-[11px] font-bold uppercase tracking-wider text-[#1F1E1E]/70 hover:text-[#1F1E1E] flex items-center gap-1 py-1 px-2 hover:bg-[#D9D9D9]/40 rounded-none transition-colors cursor-pointer"
            >
              <span>&larr; Back to Home</span>
            </button>
          )}
        </div>

        {/* Core Auth Content Box - Centered in viewport */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          <div className="mb-5">
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#1F1E1E] leading-[1.1] tracking-tight uppercase font-body">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#1F1E1E]/70 font-medium mt-2 leading-relaxed font-body">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex flex-col sm:flex-row justify-between items-center text-[10px] font-semibold text-[#1F1E1E]/50 tracking-wider uppercase gap-2 shrink-0 font-body">
          <span>&copy; {new Date().getFullYear()} TRIPVERSE AI INC.</span>
          <div className="flex gap-4">
            <span className="hover:text-[#1F1E1E] cursor-pointer">PRIVACY</span>
            <span className="hover:text-[#1F1E1E] cursor-pointer">TERMS</span>
            <span className="hover:text-[#1F1E1E] cursor-pointer">SYSTEM</span>
          </div>
        </div>
      </div>

      {/* Right Column: Immersive Photography (~58% on desktop) */}
      <div className="hidden lg:block lg:w-[56%] xl:w-[60%] h-full overflow-hidden">
        <AuthVisual
          visual={visual}
          imageSrc={visualImage}
          destination={destinationName}
          location={locationName}
          experience={experienceName}
          objectPosition={objectPosition}
        />
      </div>
    </div>
  );
};

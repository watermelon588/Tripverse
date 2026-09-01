import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogoMarkIcon } from '../components/home/HomeIcons';
import {
  User,
  Compass,
  LogOut,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';

interface ProfilePageProps {
  onNavigateHome: () => void;
  onNavigateExplore?: () => void;
  onStartPlanning?: () => void;
  onOpenUniverse?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigateHome,
  onNavigateExplore,
  onStartPlanning,
  onOpenUniverse,
}) => {
  const { user, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Voyager'
  );
  const [isSaved, setIsSaved] = useState(false);

  const email = user?.email || 'voyager@tripverse.ai';
  const initials = displayName.substring(0, 2).toUpperCase();
  const userId = user?.id || 'guest-session';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigateHome();
  };

  return (
    <div className="min-h-screen w-full bg-white text-[#1F1E1E] font-body selection:bg-[#1F1E1E] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-[#D9D9D9] bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-10 h-16 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 cursor-pointer group shrink-0"
            onClick={onNavigateHome}
          >
            <LogoMarkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[#1F1E1E] transition-transform group-hover:scale-105" />
            <span className="font-extrabold tracking-widest text-base sm:text-lg text-[#1F1E1E] uppercase font-body">
              TRIPVERSE
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#1F1E1E]/70 hover:text-[#1F1E1E] flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:py-1.5 sm:px-3 hover:bg-[#D9D9D9]/40 rounded-none transition-colors cursor-pointer"
            >
              <span>&larr; Home</span>
            </button>
            {onStartPlanning && (
              <button
                type="button"
                onClick={onStartPlanning}
                className="py-1.5 px-3 sm:py-2 sm:px-4 bg-[#1F1E1E] text-white font-black text-[11px] sm:text-xs uppercase tracking-widest rounded-none hover:bg-black transition-colors cursor-pointer shrink-0"
              >
                Plan Voyage
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-10 py-8 lg:py-14">
        {/* Page Header */}
        <div className="mb-8">
          <div className="text-[11px] font-bold tracking-widest uppercase text-[#1F1E1E]/50 mb-1">
            VOYAGER ACCOUNT &bull; SPATIAL PREFERENCES
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#1F1E1E] font-display">
            TRAVELER PROFILE
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Identity & Metadata (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Identity Card */}
            <div className="p-6 bg-[#F9F9F9] border-2 border-[#1F1E1E] rounded-none">
              <div className="flex items-start justify-between">
                <div className="w-20 h-20 bg-[#1F1E1E] text-white flex items-center justify-center text-3xl font-black uppercase rounded-none border-2 border-[#1F1E1E] shrink-0">
                  {initials}
                </div>
                <div className="bg-[#1F1E1E] text-white px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-none">
                  TIER 01
                </div>
              </div>

              <div className="mt-5">
                <h2 className="text-xl font-black uppercase tracking-tight text-[#1F1E1E]">
                  {displayName}
                </h2>
                <p className="text-xs font-medium text-[#1F1E1E]/70 mt-0.5 break-all">
                  {email}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-[#D9D9D9] flex flex-col gap-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center text-[#1F1E1E]/80">
                  <span className="uppercase text-[11px]">Account ID:</span>
                  <span className="font-mono text-[10px] bg-[#D9D9D9]/50 px-2 py-0.5 rounded-none max-w-[140px] truncate">
                    {userId}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#1F1E1E]/80">
                  <span className="uppercase text-[11px]">Cloud Sync:</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Live
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#1F1E1E]/80">
                  <span className="uppercase text-[11px]">AI Model:</span>
                  <span className="font-bold text-[10px] uppercase text-[#1F1E1E]">
                    Gemini 3.6 Flash
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#D9D9D9]">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 px-4 bg-transparent border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F9F9F9] border-2 border-[#1F1E1E] rounded-none">
                <div className="text-2xl font-black text-[#1F1E1E] font-display">
                  03
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1F1E1E]/60 mt-1">
                  Active Canvases
                </div>
              </div>
              <div className="p-4 bg-[#F9F9F9] border-2 border-[#1F1E1E] rounded-none">
                <div className="text-2xl font-black text-[#1F1E1E] font-display">
                  12
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#1F1E1E]/60 mt-1">
                  Saved POIs
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Saved Journeys (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Account Settings Panel */}
            <div className="p-6 sm:p-8 bg-[#F9F9F9] border-2 border-[#1F1E1E] rounded-none">
              <div className="flex items-center gap-2.5 mb-6">
                <User className="w-5 h-5 text-[#1F1E1E]" />
                <h2 className="text-xl font-black uppercase tracking-tight text-[#1F1E1E] font-display">
                  Profile Information
                </h2>
              </div>

              {isSaved && (
                <div className="mb-5 p-3.5 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-700 text-xs font-semibold rounded-none">
                  Profile preferences updated successfully.
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1F1E1E]">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="px-3.5 py-2.5 bg-[#D9D9D9] text-[#1F1E1E] font-medium text-sm rounded-none border border-transparent focus:border-[#1F1E1E] focus:bg-white focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1F1E1E]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="px-3.5 py-2.5 bg-[#D9D9D9]/60 text-[#1F1E1E]/60 font-medium text-sm rounded-none border border-transparent cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#1F1E1E] text-white font-black text-xs uppercase tracking-widest rounded-none hover:bg-black transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Saved Expeditions Panel */}
            <div className="p-6 sm:p-8 bg-[#F9F9F9] border-2 border-[#1F1E1E] rounded-none">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-5 h-5 text-[#1F1E1E]" />
                  <h2 className="text-xl font-black uppercase tracking-tight text-[#1F1E1E] font-display">
                    Saved Canvases & Expeditions
                  </h2>
                </div>
                {onNavigateExplore && (
                  <button
                    type="button"
                    onClick={onNavigateExplore}
                    className="text-xs font-bold uppercase tracking-wider underline hover:text-[#1F1E1E] cursor-pointer"
                  >
                    Explore Public Trips
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Trip Card 1 */}
                <div className="p-5 bg-white border-2 border-[#1F1E1E] flex flex-col justify-between rounded-none">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#1F1E1E]/60 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Kyoto, Japan
                      </span>
                      <span>5 Days</span>
                    </div>
                    <h3 className="text-base font-black uppercase tracking-tight text-[#1F1E1E]">
                      Autumn Shrines & Bamboo
                    </h3>
                    <p className="text-xs text-[#1F1E1E]/70 mt-1 line-clamp-2">
                      Spatial route across Arashiyama, Fushimi Inari, and Gion historic tea districts.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#D9D9D9] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      VOYAGE READY
                    </span>
                    {onOpenUniverse && (
                      <button
                        type="button"
                        onClick={onOpenUniverse}
                        className="text-[11px] font-extrabold uppercase tracking-wider bg-[#1F1E1E] text-white px-3 py-1.5 hover:bg-black transition-colors rounded-none"
                      >
                        Launch 3D &rarr;
                      </button>
                    )}
                  </div>
                </div>

                {/* Trip Card 2 */}
                <div className="p-5 bg-white border-2 border-[#1F1E1E] flex flex-col justify-between rounded-none">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#1F1E1E]/60 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Porto, Portugal
                      </span>
                      <span>4 Days</span>
                    </div>
                    <h3 className="text-base font-black uppercase tracking-tight text-[#1F1E1E]">
                      Douro Valley Wine Trail
                    </h3>
                    <p className="text-xs text-[#1F1E1E]/70 mt-1 line-clamp-2">
                      River cruise routes, historic cellars, and Ribeira waterfront promenades.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#D9D9D9] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      VOYAGE READY
                    </span>
                    {onOpenUniverse && (
                      <button
                        type="button"
                        onClick={onOpenUniverse}
                        className="text-[11px] font-extrabold uppercase tracking-wider bg-[#1F1E1E] text-white px-3 py-1.5 hover:bg-black transition-colors rounded-none"
                      >
                        Launch 3D &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

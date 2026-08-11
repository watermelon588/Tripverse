import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Calendar, DollarSign, Compass, ArrowRight } from 'lucide-react';
import { TripFormData } from '../types/trip';

interface CreateTripProps {
  onBuildUniverse: (formData: TripFormData) => void;
}

const INTEREST_OPTIONS = [
  { id: 'food', label: 'Food', emoji: '🍜', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/50 text-emerald-300' },
  { id: 'anime', label: 'Anime', emoji: '🌸', color: 'from-pink-500/20 to-rose-500/20 border-pink-500/50 text-pink-300' },
  { id: 'nature', label: 'Nature', emoji: '⛩️', color: 'from-emerald-500/20 to-green-500/20 border-green-500/50 text-green-300' },
  { id: 'culture', label: 'Culture', emoji: '🏮', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-300' },
  { id: 'tech', label: 'Technology', emoji: '🤖', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-cyan-300' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: 'from-purple-500/20 to-violet-500/20 border-purple-500/50 text-purple-300' },
];

export const CreateTrip: React.FC<CreateTripProps> = ({ onBuildUniverse }) => {
  const [destination, setDestination] = useState('Japan');
  const [days, setDays] = useState(10);
  const [budget, setBudget] = useState(120000);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'food',
    'anime',
    'nature',
    'culture',
  ]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBuildUniverse({
      destination,
      days,
      budget,
      interests: selectedInterests,
    });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-950">
      {/* Background Animated Gradient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-xl relative z-10 glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-700/50"
      >
        {/* App Title Badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 shadow-indigo-500/20 glow-indigo">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Agentic 3D Travel Engine
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-center tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-1">
          TripVerse
        </h1>
        <p className="text-center text-slate-400 text-sm mb-8">
          Map your itinerary into an interactive 3D travel universe
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Destination */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              Where are you going?
            </label>
            <div className="relative">
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Japan, Italy, Switzerland..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-100 font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all text-lg"
                required
              />
            </div>
          </div>

          {/* Days & Budget Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Days */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                How many days?
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-100 font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all text-lg"
                  required
                />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-400" />
                Budget (INR)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={`₹${budget.toLocaleString()}`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setBudget(parseInt(val) || 0);
                  }}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-100 font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all text-lg font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Interests Chips */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              Interests
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                      isSelected
                        ? `bg-gradient-to-r ${interest.color} shadow-md scale-[1.02]`
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{interest.emoji}</span>
                    <span>{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-lg tracking-wide shadow-xl glow-indigo transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>BUILD MY UNIVERSE</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

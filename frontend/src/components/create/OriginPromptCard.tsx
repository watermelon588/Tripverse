import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, ArrowRight, AlertCircle, Loader2, Search, Check } from 'lucide-react';

export interface CitySuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  formattedLabel: string;
}

interface OriginPromptCardProps {
  onSubmitManual: (originText: string) => void;
  onSubmitGeolocation: (latitude: number, longitude: number, label?: string) => void;
  disabled?: boolean;
}

export const OriginPromptCard: React.FC<OriginPromptCardProps> = ({
  onSubmitManual,
  onSubmitGeolocation,
  disabled = false,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for city suggestions using open Geocoding API
  useEffect(() => {
    const query = manualInput.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=6&language=en&format=json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped: CitySuggestion[] = data.results.map((item: any) => {
              const parts = [item.name];
              if (item.admin1 && item.admin1 !== item.name) parts.push(item.admin1);
              if (item.country) parts.push(item.country);
              return {
                id: item.id,
                name: item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                country: item.country,
                country_code: item.country_code,
                admin1: item.admin1,
                formattedLabel: parts.join(', '),
              };
            });
            setSuggestions(mapped);
            setShowDropdown(mapped.length > 0);
          } else {
            setSuggestions([]);
            setShowDropdown(false);
          }
        }
      } catch (err) {
        console.warn('City geocoding search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [manualInput]);

  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    setManualInput(suggestion.formattedLabel);
    setShowDropdown(false);
    setValidationError(null);
    setErrorMessage(null);
    onSubmitManual(suggestion.formattedLabel);
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) {
      setValidationError('Please enter or select a valid city or location.');
      return;
    }

    // If dropdown item was highlighted with arrow keys, choose it
    if (showDropdown && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[selectedIndex]);
      return;
    }

    setShowDropdown(false);
    setValidationError(null);
    setErrorMessage(null);
    onSubmitManual(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Reverse geocodes coordinates to a human-readable city and country
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // 1. Fast free client reverse geocoding via BigDataCloud with 3s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision;
        const country = data.countryName;
        if (city && country) return `${city}, ${country}`;
        if (city) return city;
        if (country) return country;
      }
    } catch (err) {
      console.warn('BigDataCloud reverse geocoding failed, trying fallback:', err);
    }

    try {
      // 2. Fallback reverse geocoding via OpenStreetMap Nominatim with 3s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state;
        const country = addr.country;
        if (city && country) return `${city}, ${country}`;
        if (city) return city;
      }
    } catch (err) {
      console.warn('Nominatim reverse geocoding failed:', err);
    }

    return 'Detected Location';
  };

  const handleUseCurrentLocation = () => {
    if (disabled || isLocating) return;

    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser. Please select your city from the search above.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);
    setValidationError(null);

    const onLocationSuccess = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        let resolvedCity = 'Detected Location';
        try {
          resolvedCity = await reverseGeocode(latitude, longitude);
        } catch (geoErr) {
          console.warn('Reverse geocoding error:', geoErr);
        }
        setIsLocating(false);
        setErrorMessage(null);
        onSubmitGeolocation(latitude, longitude, resolvedCity);
      } catch (err) {
        setIsLocating(false);
        setErrorMessage('Could not process location coordinates. Please enter your city manually above.');
      }
    };

    const onLocationError = (error: GeolocationPositionError) => {
      setIsLocating(false);
      if (error.code === error.PERMISSION_DENIED) {
        setErrorMessage('Location access was denied. You can search and select your departure city above.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setErrorMessage('Location information is currently unavailable. Please enter your city manually above.');
      } else if (error.code === error.TIMEOUT) {
        setErrorMessage('Location request timed out. Please enter your city manually above.');
      } else {
        setErrorMessage('Could not determine current location. Please enter your city manually above.');
      }
    };

    // Use standard WiFi/network geolocation first (fast, reliable across desktop and mobile without GPS hardware requirement)
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onLocationError(err);
        } else {
          // If network geolocation failed, try high accuracy as fallback before showing error
          navigator.geolocation.getCurrentPosition(
            onLocationSuccess,
            onLocationError,
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
          );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  return (
    <div className="w-full my-4 flex flex-col font-body items-start animate-fade-in">
      <div className="max-w-xl w-full bg-[#FBFBFB] dark:bg-[#1A1A1A] border-2 border-[#1F1E1E] dark:border-[#383838] p-4 sm:p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 border-b border-[#E5E5E5] dark:border-[#2C2C2C] pb-2.5">
          <MapPin className="w-4 h-4 text-[#1F1E1E] dark:text-[#E5E5E5] shrink-0" />
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-tight text-[#1F1E1E] dark:text-white">
            Where are you travelling from?
          </h3>
          <span className="ml-auto text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E]">
            Origin Required
          </span>
        </div>

        <p className="text-xs text-[#1F1E1E]/80 dark:text-[#CCCCCC] mb-4">
          Search your departure city or use your current location so TripVerse can calculate flight times, train connections, and route logistics.
        </p>

        {/* Option 1: City Search Input with Dropdown Autocomplete */}
        <form onSubmit={handleManualSubmit} className="space-y-2 mb-3 relative">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#1F1E1E]/40 dark:text-[#777777]">
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  setSelectedIndex(-1);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                disabled={disabled || isLocating}
                placeholder="Search departure city (e.g. London, Tokyo, Delhi, NYC)..."
                className="w-full py-2.5 pl-9 pr-3 bg-white dark:bg-[#242424] border border-[#1F1E1E] dark:border-[#444444] text-[#1F1E1E] dark:text-[#F5F5F5] placeholder:text-[#1F1E1E]/40 dark:placeholder:text-[#777777] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1F1E1E] dark:focus:ring-white disabled:opacity-50"
              />

              {/* Autocomplete Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#222222] border-2 border-[#1F1E1E] dark:border-[#444444] shadow-lg max-h-56 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 bg-[#F0F0F0] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#333333] text-[10px] font-extrabold uppercase tracking-widest text-[#1F1E1E]/60 dark:text-[#888888] flex items-center justify-between">
                    <span>Suggested Cities</span>
                    <span>{suggestions.length} results</span>
                  </div>
                  {suggestions.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs border-b border-[#F0F0F0] dark:border-[#2C2C2C] last:border-b-0 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#1F1E1E] text-white dark:bg-white dark:text-[#1F1E1E]'
                            : 'hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2C] text-[#1F1E1E] dark:text-[#F5F5F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <div className="truncate">
                            <span className="font-bold">{item.name}</span>
                            {(item.admin1 || item.country) && (
                              <span className={`text-[11px] ml-1.5 opacity-75 ${isSelected ? 'text-white/80 dark:text-[#1F1E1E]/80' : 'text-[#1F1E1E]/60 dark:text-[#AAAAAA]'}`}>
                                {[item.admin1, item.country].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={disabled || isLocating || !manualInput.trim()}
              className="py-2.5 px-4 bg-[#1F1E1E] dark:bg-white text-white dark:text-[#1F1E1E] text-xs font-bold uppercase tracking-wider hover:bg-black dark:hover:bg-[#E5E5E5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Submit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {validationError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="border-t border-[#E5E5E5] dark:border-[#2C2C2C] w-full" />
          <span className="bg-[#FBFBFB] dark:bg-[#1A1A1A] px-2 text-[10px] font-bold uppercase tracking-widest text-[#1F1E1E]/50 dark:text-[#777777] absolute">
            or
          </span>
        </div>

        {/* Option 2: Geolocation Action with Automatic Reverse Geocoding */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={disabled || isLocating}
          className="w-full py-2.5 px-4 bg-white dark:bg-[#242424] border border-[#1F1E1E] dark:border-[#444444] text-[#1F1E1E] dark:text-[#F5F5F5] text-xs font-bold uppercase tracking-wider hover:bg-[#F0F0F0] dark:hover:bg-[#2E2E2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Detecting city location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-[#1F1E1E] dark:text-white" />
              <span>Use current location</span>
            </>
          )}
        </button>

        {/* Error Fallback Banner */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

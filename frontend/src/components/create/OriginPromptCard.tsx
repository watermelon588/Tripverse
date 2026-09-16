import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowUpRightIcon, CheckIcon, CompassIcon, PinIcon } from '../home/v2/IconsV2';
import { EASE, prefersReducedMotion } from '../home/v2/motion';

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
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(rootRef.current, { y: 18, opacity: 0, clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: EASE });
    },
    { scope: rootRef },
  );

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
    <div className="tv-origin" ref={rootRef}>
      <div className="tv-origin__head">
        <PinIcon width={16} height={16} />
        <h3 className="tv-origin__title">Where are you travelling from?</h3>
      </div>
      <p className="tv-meta tv-origin__sub">
        The agent prices flights and rail from your starting point.
      </p>

      <form onSubmit={handleManualSubmit} className="tv-origin__form">
        <div className="tv-origin__search">
          <input
            ref={inputRef}
            type="text"
            className={`tv-input ${validationError ? 'has-error' : ''}`}
            placeholder="Search a city — e.g. Mumbai, Lisbon, Osaka"
            value={manualInput}
            disabled={disabled}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="origin-suggestions"
            aria-autocomplete="list"
            onChange={(e) => {
              setManualInput(e.target.value);
              setSelectedIndex(-1);
              setValidationError(null);
            }}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
          />
          {isSearching && <span className="tv-origin__spin tv-meta">Searching…</span>}

          {showDropdown && suggestions.length > 0 && (
            <div ref={dropdownRef} id="origin-suggestions" role="listbox" className="tv-origin__list">
              {suggestions.map((sug, idx) => (
                <button
                  key={sug.id}
                  type="button"
                  role="option"
                  aria-selected={idx === selectedIndex}
                  className={`tv-origin__opt ${idx === selectedIndex ? 'is-on' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelectSuggestion(sug)}
                >
                  <PinIcon width={13} height={13} />
                  <span className="tv-origin__opt-name">{sug.name}</span>
                  <span className="tv-meta">{[sug.admin1, sug.country].filter(Boolean).join(', ')}</span>
                  {idx === selectedIndex && <CheckIcon width={13} height={13} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="tv-btn tv-btn--primary" disabled={disabled || !manualInput.trim()}>
          <span>Set origin</span>
          <ArrowUpRightIcon width={14} height={14} />
        </button>
      </form>

      {validationError && <p className="tv-field__error" role="alert">{validationError}</p>}

      <div className="tv-divider" style={{ marginBlock: '1rem' }}>
        <span className="tv-label">or</span>
      </div>

      <button
        type="button"
        className="tv-btn tv-btn--ghost"
        style={{ width: '100%' }}
        onClick={handleUseCurrentLocation}
        disabled={disabled || isLocating}
      >
        <CompassIcon width={15} height={15} />
        <span>{isLocating ? 'Finding your location…' : 'Use my current location'}</span>
      </button>

      {errorMessage && (
        <div className="tv-alert" role="alert" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

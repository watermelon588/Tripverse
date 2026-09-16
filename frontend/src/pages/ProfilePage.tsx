/*
 * ProfilePage — v2 design system.
 *
 * Editorial account page: identity block, an account record set as a mono
 * key/value ledger, and a saved-trips rail. Same tokens, type and hairlines
 * as the marketing surface at the app surface's tighter density.
 */
import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../services/uploadService';
import { AppBar } from '../components/common/AppBar';
import { DESTINATIONS } from '../components/home/v2/content';
import {
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  CompassIcon,
  GraphIcon,
  PinIcon,
  PlusIcon,
} from '../components/home/v2/IconsV2';
import { EASE, parallaxImage, prefersReducedMotion, splitLines } from '../components/home/v2/motion';

interface ProfilePageProps {
  onNavigateHome: () => void;
  onNavigateExplore?: () => void;
  onStartPlanning?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigateHome,
  onNavigateExplore,
  onStartPlanning,
}) => {
  const { user, signOut } = useAuth();
  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Traveller',
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.user_metadata?.avatar_url || localStorage.getItem('tripverse-user-avatar') || '',
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const email = user?.email || 'Not signed in';
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const userId = user?.id || 'guest-session';
  const isGuest = !user;

  // Saved trips: the first three curated routes stand in until the trips API
  // is wired to this page.
  const savedTrips = DESTINATIONS.slice(0, 3);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const split = titleRef.current ? splitLines(titleRef.current) : null;
      const tl = gsap.timeline({ defaults: { ease: EASE } });

      tl.from('.tv-profile__eyebrow', { y: 14, opacity: 0, duration: 0.7 });
      if (split) tl.from(split.lines, { yPercent: 115, duration: 1.05, stagger: 0.08 }, '-=0.45');
      tl.from('.tv-profile__identity', { y: 24, opacity: 0, duration: 0.9 }, '-=0.6')
        .from('.tv-profile__card', {
          clipPath: 'inset(0% 0% 100% 0%)',
          y: 28,
          opacity: 0,
          duration: 1.1,
          stagger: 0.09,
        }, '-=0.6');

      gsap.from('.tv-profile__trip', {
        y: 30,
        opacity: 0,
        duration: 0.95,
        ease: EASE,
        stagger: 0.09,
        scrollTrigger: { trigger: '.tv-profile__trips', start: 'top 85%' },
      });

      gsap.utils.toArray<HTMLElement>('.tv-profile__trip img').forEach((el) => {
        parallaxImage(el, { trigger: el.closest('.tv-profile__trip') ?? el, amount: 7 });
      });

      return () => split?.revert();
    },
    { scope: root },
  );

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // let the same file be re-picked

    setIsUploading(true);
    setUploadError(null);

    const { url, error } = await uploadAvatar(file);
    setIsUploading(false);

    if (error || !url) {
      setUploadError(error || 'That photo could not be uploaded.');
      window.setTimeout(() => setUploadError(null), 4000);
      return;
    }

    setAvatarUrl(url);
    localStorage.setItem('tripverse-user-avatar', url);

    if (user) {
      try {
        await supabase.auth.updateUser({ data: { avatar_url: url } });
      } catch (err) {
        console.warn('Could not persist avatar to Supabase metadata:', err);
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigateHome();
  };

  return (
    <div className="tv2 tv2-app" ref={root}>
      <AppBar
        onNavigateHome={onNavigateHome}
        onStartPlanning={onStartPlanning}
        onNavigateExplore={onNavigateExplore}
        current="profile"
      />

      <main className="tv-container">
        <header className="tv-page__head">
          <span className="tv-eyebrow tv-profile__eyebrow">Account</span>
          <h1 className="tv-display tv-page__title" ref={titleRef}>
            {displayName}
          </h1>

          <div className="tv-profile__identity">
            <button
              type="button"
              className="tv-avatar"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              disabled={isUploading}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="tv-avatar__img" />
              ) : (
                <span className="tv-avatar__initials">{initials}</span>
              )}
              <span className="tv-avatar__edit">
                {isUploading ? <ClockIcon width={15} height={15} /> : <PlusIcon width={15} height={15} />}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarFileChange}
            />

            <div className="tv-profile__identity-meta">
              <p className="tv-meta">{email}</p>
              <span className={`tv-tag ${isGuest ? '' : 'tv-tag--green'}`}>
                {isGuest ? 'Guest session' : 'Signed in'}
              </span>
            </div>
          </div>

          {uploadError && (
            <div className="tv-alert" role="alert" style={{ marginTop: '1.25rem' }}>
              {uploadError}
            </div>
          )}
        </header>

        <div className="tv-profile__grid tv-collapse">
          {/* Editable details */}
          <section className="tv-card tv-profile__card">
            <div className="tv-profile__card-head">
              <GraphIcon width={18} height={18} />
              <h2 className="tv-label">Your details</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="tv-profile__form">
              <div className="tv-field">
                <label htmlFor="pf-name" className="tv-field__label">Display name</label>
                <input
                  id="pf-name"
                  className="tv-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we address you?"
                />
              </div>

              <div className="tv-field">
                <label htmlFor="pf-email" className="tv-field__label">Email</label>
                <input id="pf-email" className="tv-input" value={email} readOnly disabled />
                <span className="tv-meta" style={{ fontSize: '0.72rem' }}>
                  Change your email from your account provider.
                </span>
              </div>

              <button type="submit" className="tv-btn tv-btn--primary" style={{ width: '100%' }}>
                {isSaved ? (
                  <>
                    <CheckIcon width={15} height={15} />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save changes</span>
                )}
              </button>
            </form>
          </section>

          {/* Account record */}
          <section className="tv-card tv-profile__card">
            <div className="tv-profile__card-head">
              <CompassIcon width={18} height={18} />
              <h2 className="tv-label">Account record</h2>
            </div>

            <dl className="tv-ledger__list">
              {[
                { k: 'Session', v: isGuest ? 'Guest' : 'Authenticated' },
                { k: 'User ID', v: `${userId.slice(0, 12)}${userId.length > 12 ? '…' : ''}` },
                { k: 'Saved trips', v: String(savedTrips.length) },
                { k: 'Graph nodes', v: '23' },
                { k: 'Last plan', v: 'Japan · 14 nights' },
              ].map((row) => (
                <div key={row.k} className="tv-ledger__row">
                  <dt className="tv-meta">{row.k}</dt>
                  <dd className="tv-ledger__v">{row.v}</dd>
                </div>
              ))}
            </dl>

            <div className="tv-profile__actions">
              <button type="button" className="tv-btn tv-btn--ghost" onClick={onStartPlanning} style={{ width: '100%' }}>
                <span>Plan a new trip</span>
                <ArrowUpRightIcon width={15} height={15} />
              </button>
              <button type="button" className="tv-link tv-profile__signout" onClick={handleSignOut}>
                <span>{isGuest ? 'Sign in to save trips' : 'Sign out'}</span>
              </button>
            </div>
          </section>
        </div>

        {/* Saved trips */}
        <section className="tv-profile__trips" aria-labelledby="saved-trips">
          <div className="tv-sec__head tv-sec__head--row" style={{ marginBottom: '1.75rem' }}>
            <div>
              <span className="tv-label">Saved</span>
              <h2 id="saved-trips" className="tv-display tv-profile__trips-title">
                Trips you can reopen.
              </h2>
            </div>
            <button type="button" className="tv-link tv-hide-mobile" onClick={onNavigateExplore}>
              <span>Explore more</span>
              <ArrowUpRightIcon width={15} height={15} />
            </button>
          </div>

          {savedTrips.length === 0 ? (
            <div className="tv-empty">
              <div className="tv-empty__art" aria-hidden="true">
                <span className="tv-empty__bar" />
                <span className="tv-empty__bar" />
                <span className="tv-empty__bar" />
              </div>
              <p className="tv-body">You have not saved a trip yet.</p>
              <button type="button" className="tv-btn tv-btn--primary" onClick={onStartPlanning}>
                <span>Plan your first trip</span>
                <ArrowUpRightIcon width={15} height={15} />
              </button>
            </div>
          ) : (
            <div className="tv-profile__trip-grid tv-collapse">
              {savedTrips.map((t) => (
                <article key={t.code} className="tv-profile__trip" onClick={onStartPlanning}>
                  <figure className="tv-figure tv-profile__trip-fig">
                    <img src={t.image} alt={`${t.city}, ${t.country}`} className="tv-img tv-img--drift" loading="lazy" />
                  </figure>
                  <div className="tv-profile__trip-meta">
                    <div className="tv-rail__line">
                      <h3 className="tv-rail__city">{t.city}</h3>
                      <span className="tv-meta">{t.code}</span>
                    </div>
                    <p className="tv-meta tv-rail__note">{t.note}</p>
                    <div className="tv-rail__foot">
                      <span className="tv-tag">
                        <ClockIcon width={12} height={12} />
                        {t.nights} nights
                      </span>
                      <span className="tv-meta">
                        <PinIcon width={12} height={12} /> {t.country}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

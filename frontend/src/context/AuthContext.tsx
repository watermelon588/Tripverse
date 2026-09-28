import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearGuestId, getStoredGuestId } from '../lib/guest';
import { API_BASE_URL } from '../services/apiClient';

let pendingGuestClaim: Promise<void> | null = null;

function claimGuestTrips(accessToken?: string): Promise<void> {
  const guestId = getStoredGuestId();
  if (!accessToken || !guestId) return Promise.resolve();
  if (pendingGuestClaim) return pendingGuestClaim;

  pendingGuestClaim = fetch(`${API_BASE_URL}/api/auth/claim-guest-trips`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_id: guestId }),
  }).then((response) => {
    if (response.ok) {
      clearGuestId();
      window.dispatchEvent(new Event('tripverse:trips-claimed'));
    }
  }).catch(() => {
    // Keep the guest ID so a later session restore can retry the claim.
  }).finally(() => { pendingGuestClaim = null; });

  return pendingGuestClaim;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      void claimGuestTrips(session?.access_token);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'SIGNED_IN') void claimGuestTrips(session?.access_token);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) await claimGuestTrips(data.session?.access_token);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
        data: {
          full_name: fullName,
        },
      },
    });
    if (!error) await claimGuestTrips(data.session?.access_token);
    return { error, needsEmailConfirmation: !error && !data.session };
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    return { error };
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const getToken = async (): Promise<string | null> => {
    if (!session?.access_token) {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }
    return session.access_token;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithPassword,
        signUp,
        signInWithOAuth,
        sendPasswordReset,
        signOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

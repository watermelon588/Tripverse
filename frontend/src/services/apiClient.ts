import { supabase } from '../lib/supabase';
import { getOrCreateGuestId } from '../lib/guest';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiRequestOptions extends RequestInit {
  /**
   * If true, bypasses automatic guest ID / user token injection.
   */
  skipAuth?: boolean;
}

/**
 * Centralized API fetch wrapper for TripVerse.
 * Automatically injects:
 * - `Authorization: Bearer <token>` if an active Supabase user session exists.
 * - `X-Guest-ID: <UUID>` if the user is unauthenticated (anonymous guest).
 *
 * Guarantees mutual exclusivity so both headers are never sent concurrently.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T | null; status: number; ok: boolean; error?: string }> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;
  const headers = new Headers(customHeaders || {});

  // Set default JSON Content-Type if not already provided and sending a body
  if (!headers.has('Content-Type') && restOptions.body && typeof restOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        // Authenticated User Identity
        headers.set('Authorization', `Bearer ${session.access_token}`);
        headers.delete('X-Guest-ID');
      } else {
        // Guest Identity
        const guestId = getOrCreateGuestId();
        headers.set('X-Guest-ID', guestId);
        headers.delete('Authorization');
      }
    } catch (err) {
      console.warn('Error resolving auth state in apiClient, falling back to guest ID:', err);
      headers.set('X-Guest-ID', getOrCreateGuestId());
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...restOptions,
      headers,
    });

    let responseData: any = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      const text = await res.text();
      responseData = text ? { message: text } : null;
    }

    if (!res.ok) {
      const errorMessage = responseData?.detail || responseData?.message || `HTTP ${res.status}`;
      return {
        data: responseData,
        status: res.status,
        ok: false,
        error: errorMessage,
      };
    }

    return {
      data: responseData as T,
      status: res.status,
      ok: true,
    };
  } catch (err: any) {
    return {
      data: null,
      status: 0,
      ok: false,
      error: err?.message || 'Network request failed',
    };
  }
}

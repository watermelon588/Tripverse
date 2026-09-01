import { Trip } from '../types/trip';
import { FALLBACK_DEMO_TRIP } from '../data/fallbackTrip';
import { apiFetch } from './apiClient';

export interface TripServiceResponse {
  data: Trip;
  isBackendConnected: boolean;
  error?: string;
}

export interface TripCreateResponse {
  trip_id: string;
  session_id: string;
  assistant_message: {
    id: string;
    role: string;
    message_type: string;
    content: string;
    payload?: any;
    created_at: string;
  };
}

export interface TripStateResponse {
  trip: Trip;
  conversation: {
    id: string;
    trip_id: string;
    status: string;
    current_stage: string;
    context_summary?: string | null;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Fetch the 3D demo trip graph (Japan 10 days).
 */
export async function fetchDemoTrip(): Promise<TripServiceResponse> {
  const res = await apiFetch<Trip>('/api/trips/demo', { method: 'GET', skipAuth: true });

  if (res.ok && res.data) {
    return {
      data: res.data,
      isBackendConnected: true,
    };
  }

  console.warn(
    `TripVerse API offline or demo request failed. Using fallback demo dataset. Error: ${res.error}`
  );
  return {
    data: FALLBACK_DEMO_TRIP,
    isBackendConnected: false,
    error: res.error || 'Could not connect to FastAPI server',
  };
}

/**
 * Initialize a new conversational trip session belonging to the current user or guest.
 */
export async function createTrip(): Promise<TripCreateResponse | null> {
  const res = await apiFetch<TripCreateResponse>('/api/trips', {
    method: 'POST',
  });

  if (!res.ok || !res.data) {
    throw new Error(res.error || 'Failed to create trip');
  }

  return res.data;
}

/**
 * Retrieve current trip state and active conversational session.
 */
export async function getTrip(tripId: string): Promise<TripStateResponse | null> {
  const res = await apiFetch<TripStateResponse>(`/api/trips/${tripId}`, {
    method: 'GET',
  });

  if (!res.ok || !res.data) {
    throw new Error(res.error || 'Failed to get trip details');
  }

  return res.data;
}

/**
 * Send user message or UI action to the trip agent.
 */
export async function sendTripMessage(
  tripId: string,
  content: string,
  messageType: 'TEXT' | 'UI_ACTION' = 'TEXT',
  payload?: Record<string, any>
): Promise<TripStateResponse | null> {
  const res = await apiFetch<TripStateResponse>(`/api/trips/${tripId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      message_type: messageType,
      content,
      payload: payload || null,
    }),
  });

  if (!res.ok || !res.data) {
    throw new Error(res.error || 'Failed to send message');
  }

  return res.data;
}

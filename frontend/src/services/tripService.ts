import { Trip } from '../types/trip';
import { FALLBACK_DEMO_TRIP } from '../data/fallbackTrip';
import { apiFetch, getAuthHeaders, API_BASE_URL } from './apiClient';

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

export interface TripModelResponse {
  id: string;
  user_id?: string | null;
  guest_id?: string | null;
  destination?: string | null;
  origin_text?: string | null;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  duration_days?: number | null;
  currency?: string;
  status: string;
  onboarding_status: string;
  created_at: string;
  updated_at: string;
}

export interface TripStateResponse {
  trip: TripModelResponse;
  conversation: {
    id: string;
    trip_id: string;
    status: string;
    current_stage: string;
    context_summary?: string | null;
    created_at: string;
    updated_at: string;
  };
  assistant_message?: {
    id: string;
    role: string;
    message_type: string;
    content: string;
    payload?: any;
    created_at: string;
  };
}

export interface StreamMetadataPayload {
  destination?: string | null;
  duration_days?: number | null;
  origin?: string | null;
  onboarding_complete?: boolean;
}

export interface StreamDonePayload {
  trip: TripModelResponse;
  conversation: {
    id: string;
    trip_id: string;
    status: string;
    current_stage: string;
    context_summary?: string | null;
    created_at: string;
    updated_at: string;
  };
  assistant_message?: {
    id: string;
    role: string;
    message_type: string;
    content: string;
    payload?: any;
    created_at: string;
  };
}

export interface SendTripMessageStreamCallbacks {
  onToken: (delta: string) => void;
  onMetadata?: (meta: StreamMetadataPayload) => void;
  onDone?: (data: StreamDonePayload) => void;
  onError?: (err: Error) => void;
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
 * List all trips for the authenticated user or active guest.
 */
export async function listTrips(): Promise<TripModelResponse[]> {
  const res = await apiFetch<TripModelResponse[]>('/api/trips', {
    method: 'GET',
  });

  if (!res.ok || !res.data) {
    return [];
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
 * Send user message or UI action to the trip agent (synchronous).
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

/**
 * Send user message to the trip agent via Server-Sent Events (SSE) streaming.
 * Provides real-time token streaming, live metadata extraction, and final state persistence.
 */
export async function sendTripMessageStream(
  tripId: string,
  content: string,
  callbacks: SendTripMessageStreamCallbacks,
  messageType: 'TEXT' | 'UI_ACTION' = 'TEXT',
  payload?: Record<string, any>
): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const headers = new Headers(authHeaders);
  headers.set('Content-Type', 'application/json');

  const url = `${API_BASE_URL}/api/trips/${tripId}/messages/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message_type: messageType,
      content,
      payload: payload || null,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.detail || errJson.message || errMsg;
    } catch (_) {}
    const err = new Error(errMsg);
    callbacks.onError?.(err);
    throw err;
  }

  if (!res.body) {
    const err = new Error('No response body for streaming');
    callbacks.onError?.(err);
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed) continue;
        const lineList = trimmed.split('\n');
        for (const line of lineList) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'token' && event.delta) {
                callbacks.onToken(event.delta);
              } else if (event.type === 'metadata') {
                callbacks.onMetadata?.(event);
              } else if (event.type === 'done') {
                callbacks.onDone?.(event);
              } else if (event.type === 'error') {
                callbacks.onError?.(new Error(event.error || 'Stream error'));
              }
            } catch (jsonErr) {
              console.warn('Failed to parse SSE JSON:', dataStr, jsonErr);
            }
          }
        }
      }
    }
  } catch (streamErr: any) {
    callbacks.onError?.(streamErr);
    throw streamErr;
  }
}

export interface ConversationMessageApiItem {
  id: string;
  session_id: string;
  role: string;
  message_type: string;
  content: string;
  payload?: any;
  created_at: string;
}

/**
 * Retrieve all conversation messages for a trip.
 */
export async function getTripMessages(tripId: string): Promise<ConversationMessageApiItem[]> {
  const res = await apiFetch<{ messages: ConversationMessageApiItem[] }>(
    `/api/trips/${tripId}/messages`,
    { method: 'GET' }
  );

  if (!res.ok || !res.data) {
    return [];
  }

  return res.data.messages;
}

/**
 * Delete a trip and its messages from the database.
 */
export async function deleteTrip(tripId: string): Promise<boolean> {
  const res = await apiFetch<{ success: boolean; trip_id: string }>(
    `/api/trips/${tripId}`,
    { method: 'DELETE' }
  );

  return res.ok;
}


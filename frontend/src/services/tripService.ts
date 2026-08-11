import { Trip } from '../types/trip';
import { FALLBACK_DEMO_TRIP } from '../data/fallbackTrip';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface TripServiceResponse {
  data: Trip;
  isBackendConnected: boolean;
  error?: string;
}

export async function fetchDemoTrip(): Promise<TripServiceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trips/demo`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data: Trip = await response.json();
    return {
      data,
      isBackendConnected: true,
    };
  } catch (err: any) {
    console.warn(
      `TripVerse API offline at ${API_BASE_URL}. Using fallback demo dataset. Error:`,
      err?.message || err
    );
    return {
      data: FALLBACK_DEMO_TRIP,
      isBackendConnected: false,
      error: err?.message || 'Could not connect to FastAPI server',
    };
  }
}

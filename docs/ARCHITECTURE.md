# TripVerse Architecture

## Current (Phase 1)

```text
React (Vite + TS)
  ├── CreateTrip View
  └── TripUniverse View (React Three Fiber 3D Canvas)
        │
   tripService (HTTP / fetch)
        │
        v
  FastAPI Backend (Port 8000)
        │
        v
  GET /api/trips/demo (Japan Graph JSON)
```

---

## Planned Target Architecture

```text
React + R3F 3D Universe
        │
     GraphQL (Queries & Mutations)
        │
     FastAPI Backend Gateway
        │
   ┌────┴──────────────────────────┐
   │                               │
LangGraph AI Agent          MongoDB Database
(Planner/Researcher/Replanner) (Persistent Trip State)
   │
   v
  n8n Workflow Automation Engine
   │
   v
External APIs (Places, Flights, Hotels, Weather)
```

---

## Component Responsibilities

### Frontend (`frontend/`)
- 3D spatial graph visualization using React Three Fiber, Drei, and Three.js.
- Interactive camera controls (orbit, zoom, pan).
- Node hover/click handlers and glassmorphism detail drawer.
- User input collection via Create Trip setup flow.
- Graceful API connection management with fallback data support.

### Backend (`backend/`)
- REST API service built with FastAPI and Uvicorn.
- Pydantic schemas validating `GraphNode`, `GraphEdge`, and `TripResponse`.
- Demo graph provider (`GET /api/trips/demo`).
- Strictly configured CORS boundary (`http://localhost:5173`).

---

## Data Model

### Node Schema
```typescript
interface GraphNode {
  id: string;
  type: 'COUNTRY' | 'CITY' | 'NEIGHBORHOOD' | 'ATTRACTION' | 'RESTAURANT' | 'ACTIVITY' | 'HOTEL' | 'TRANSPORT';
  name: string;
  description?: string;
  position?: [number, number, number];
}
```

### Edge Schema
```typescript
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  cost?: number;
  duration?: number;
}
```

# TripVerse Agent Instructions

Primary context and instructions for AI coding agents operating on the TripVerse repository.

---

## 1. Project Overview
**TripVerse** turns travel itineraries into an interactive, spatial 3D "travel universe". Instead of static linear text lists, trips are represented as interactive graphs composed of nodes (countries, cities, attractions, food, hotels) and edges (transit routes, parent-child locations, costs, time bounds).

---

## 2. Core Philosophy
- **Spatial Travel Visualization**: User experience centers around exploring a 3D graph universe.
- **Agentic Replanning**: AI agents observe graph modifications, evaluate constraints, and perform dynamic replanning.
- **High Aesthetics**: Dynamic dark mode space visuals, glowing nodes, glassmorphism UI overlays, and smooth micro-animations.

---

## 3. Architecture & Current Phase
- **Current Phase**: **Phase 1 — Frontend + Backend Foundation (Complete)**
- **Frontend**: Vite + React 18/19 + TypeScript + React Three Fiber (`@react-three/fiber`) + `@react-three/drei` + Three.js + Tailwind CSS + Framer Motion.
- **Backend**: Python 3.10+ + FastAPI + Pydantic v2 + Uvicorn.
- **REST Boundary**: `GET /api/trips/demo` serving Japan 3D graph dataset. CORS restricted to `http://localhost:5173`.

---

## 4. Technology Stack (Actual)
- **Frontend**: React, TypeScript, Vite, `@react-three/fiber`, `@react-three/drei`, `three`, `framer-motion`, `tailwindcss`, `lucide-react`.
- **Backend**: Python 3.10+, `fastapi`, `uvicorn`, `pydantic`.
- **Deferred Technologies (Do NOT introduce yet)**: GraphQL, LangGraph, MongoDB, n8n, Redis, Docker, Auth, Microservices.

---

## 5. Session Start Protocol
At the start of every coding session, inspect:
1. `docs/AGENT.md`
2. `docs/MEMORY.md`
3. `docs/CURRENT_STATE.md`
4. `docs/ARCHITECTURE.md`
5. `docs/ROADMAP.md`
6. Specific implementation files relevant to the active task.

---

## 6. Development & Coding Rules
- **TypeScript**: Strict mode enabled (`noImplicitAny`, exact interface definitions). Centralized types in `frontend/src/types/trip.ts`.
- **Python**: Pydantic schemas for request/response validation in `backend/app/schemas/trip.py`.
- **No Hardcoded URLs**: Use `import.meta.env.VITE_API_URL` with graceful fallback handling in `frontend/src/services/tripService.ts`.
- **UI Aesthetics**: Use glassmorphism (`glass-panel`), glowing indicators (`glow-indigo`), custom scrollbars, and non-generic color palettes.

---

## 7. Documentation Rules & Session End Protocol
After making meaningful changes, update:
- `docs/CURRENT_STATE.md`
- `docs/MEMORY.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/TODO.md`
Update `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, or `docs/ROADMAP.md` when architectural decisions or milestone statuses change.

---

## 8. Do Not
- Do NOT add GraphQL, LangGraph, auth, or databases before Phase requirements specify them.
- Do NOT introduce deep nesting or artificial abstractions without immediate necessity.
- Do NOT use wildcard CORS `allow_origins=["*"]`.
- Do NOT declare a feature complete without running TypeScript build (`npm run build`) or Python verification checks.

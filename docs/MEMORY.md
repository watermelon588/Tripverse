# TripVerse Memory

## Project Identity
TripVerse turns travel itineraries into an interactive 3D travel universe rather than a static text list.

## Current Architecture
- **Frontend**: React + TypeScript + Vite + React Three Fiber (R3F) + Drei + Tailwind CSS + Framer Motion.
- **Backend**: FastAPI + Pydantic + Uvicorn.
- **Database**: Not implemented yet.
- **GraphQL**: Planned for Phase 4.
- **LangGraph**: Planned for Phase 5.
- **n8n**: Planned for Phase 6.

## Product Domain Model
`Trip` → `Nodes` (`COUNTRY`, `CITY`, `NEIGHBORHOOD`, `ATTRACTION`, `RESTAURANT`, `ACTIVITY`, `HOTEL`, `TRANSPORT`) → `Edges` (`ENTRY_HUB`, `CULTURAL_HUB`, `CULINARY_HUB`, `EXPERIENCE`, `VISIT`, `SHINKANSEN`, `LOCAL_EXPRESS`).

## Important Principles
- **Spatial Interaction**: Users navigate graph in 3D (orbit, pan, zoom, click nodes).
- **Deterministic vs AI**: Calculations/graph structures handled by code; agent reasoning/replanning handled by LLMs/LangGraph (future phases).
- **Graceful Fallbacks**: Frontend falls back to local demo dataset if FastAPI backend is offline.

## Current Phase
Phase 1 — Basic frontend and backend skeleton with 3D graph visualization (Complete).

## Key Architectural Decisions
- **ADR-001**: Use FastAPI (Python) for seamless future integration with LangGraph & AI agent ecosystem.
- **ADR-002**: Use React Three Fiber (R3F) & Vite for 3D interactive graphics.
- **ADR-003**: Strict CORS policy allowing `http://localhost:5173`.

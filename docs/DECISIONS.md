# Architecture Decisions

## ADR-001 — Use FastAPI as Backend Framework

- **Date**: 2026-08-11
- **Status**: Accepted
- **Context**: Need a fast, asynchronous Python web backend capable of serving API endpoints and orchestrating future AI agentic workflows.
- **Decision**: Use FastAPI with Pydantic and Uvicorn.
- **Rationale**: The agentic reasoning layer (LangGraph) is natively Python-based. Using FastAPI avoids cross-language RPC overhead between Node.js and Python agent processes.
- **Alternatives Considered**: Node.js/Express, Flask.

---

## ADR-002 — Use React Three Fiber (R3F) & Vite for 3D Universe Visualization

- **Date**: 2026-08-11
- **Status**: Accepted
- **Context**: Need an interactive, high-performance 3D rendering pipeline for spatial graph nodes and edges.
- **Decision**: Use Vite + React + Three.js + `@react-three/fiber` + `@react-three/drei`.
- **Rationale**: React Three Fiber enables declarative component-based 3D scene construction with smooth state synchronization, camera controls, and HTML label overlays (`<Html>`).
- **Alternatives Considered**: Plain Three.js imperative canvas, Babylon.js, D3.js 2D canvas.

---

## ADR-003 — Restricted CORS Policy for Development Boundary

- **Date**: 2026-08-11
- **Status**: Accepted
- **Context**: Need secure CORS policy between FastAPI and Vite dev server.
- **Decision**: Explicitly configure CORS allowed origins to `["http://localhost:5173", "http://127.0.0.1:5173"]`.
- **Rationale**: Avoid security anti-patterns like wildcard `allow_origins=["*"]`.
- **Alternatives Considered**: Wildcard CORS.

---

## ADR-004 — Defer GraphQL, LangGraph, and MongoDB to Later Phases

- **Date**: 2026-08-11
- **Status**: Accepted
- **Context**: Keep initial technical foundation clean and lightweight before introducing heavy infrastructure.
- **Decision**: Use simple REST API (`fetch`) for Phase 1 and 2. Defer GraphQL, LangGraph, and MongoDB.
- **Rationale**: Prevents over-engineering and ensures the core 3D UI and basic backend state function reliably first.
- **Alternatives Considered**: Implementing full GraphQL and LangGraph immediately in Phase 1.

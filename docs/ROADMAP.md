# TripVerse Roadmap

## Phase 1 — Foundation (Complete)
- [x] Monorepo structure (`frontend/`, `backend/`, `docs/`)
- [x] Vite + React + TypeScript setup
- [x] React Three Fiber + Three.js setup
- [x] Tailwind CSS + Framer Motion UI system
- [x] FastAPI Python backend setup
- [x] Pydantic schemas (`NodeType`, `GraphNode`, `GraphEdge`, `TripResponse`)
- [x] `GET /api/trips/demo` endpoint serving Japan 3D graph
- [x] REST `tripService` with fallback dataset
- [x] Interactive 3D universe canvas (OrbitControls, glowing nodes, animated edges)
- [x] Create Trip setup flow & glassmorphism NodeDetails drawer
- [x] Project Memory & Agent Context System (`docs/`)

---

## Phase 2 — Mutable Graph State
- [ ] In-memory trip graph state management in FastAPI
- [ ] Add node endpoint (`POST /api/trips/{id}/nodes`)
- [ ] Edit node endpoint (`PUT /api/trips/{id}/nodes/{node_id}`)
- [ ] Delete node endpoint (`DELETE /api/trips/{id}/nodes/{node_id}`)
- [ ] Add/Edit/Delete edge endpoints
- [ ] Frontend interactive graph editing (Add node modal, delete node button)

---

## Phase 3 — Database State Persistence
- [ ] MongoDB database integration
- [ ] Trip document schemas & persistence layer
- [ ] Session / trip CRUD endpoints

---

## Phase 4 — GraphQL Layer
- [ ] Strawberry / Ariadne GraphQL schema definition
- [ ] Graph queries (fetch trip, nodes by type, connected edges)
- [ ] Graph mutations (createTrip, addNode, removeNode, connectNodes)

---

## Phase 5 — LangGraph Agentic Engine
- [ ] LangGraph orchestrator setup
- [ ] Planner Agent (itinerary generation)
- [ ] Researcher Agent (location metadata)
- [ ] Critic Agent (budget and timing constraints checker)
- [ ] Replanner Agent (graph modification logic)

---

## Phase 6 — n8n & External Workflows
- [ ] n8n workflow engine integration
- [ ] Places & Google Maps API workflow
- [ ] Weather API integration
- [ ] Transit and route calculation workflow

---

## Phase 7 — Interactive Agentic Replanning
- [ ] User natural language modification bar ("Change Tokyo stay to 3 days and add Akihabara")
- [ ] Agent reasoning visualization
- [ ] Real-time 3D graph mutation animation upon AI replan

---

## Phase 8 — Real-time Agent Visualization
- [ ] 3D AI Agent avatars navigating spatial graph during replanning
- [ ] Multi-agent collaboration visualizer

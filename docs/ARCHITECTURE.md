# TripVerse Architecture & Roadmap Document

## 1. System Vision

TripVerse is an interactive 3D travel planning environment where user itineraries are represented as dynamic spatial graphs. AI agents observe graph modifications, reason about constraints (budget, timing, geography, preferences), and perform real-time replanning.

---

## 2. Phase 1 Architecture (Current State)

```text
+-------------------------------------------------------+
|                   FRONTEND (Vite + React)              |
|                                                       |
|   +-----------------------+   +-------------------+   |
|   |  Create Trip View     |   | Trip Universe 3D  |   |
|   |  (Preference inputs)  |   | (R3F Scene canvas)|   |
|   +-----------+-----------+   +---------^---------+   |
|               |                         |             |
|               v                         |             |
|        +--------------+                 |             |
|        | tripService  |-----------------+             |
|        +------+-------+                               |
+---------------+---------------------------------------+
                |
           HTTP | GET /api/trips/demo (JSON Graph)
                v
+---------------+---------------------------------------+
|                   BACKEND (FastAPI)                   |
|                                                       |
|   +-----------------------+   +-------------------+   |
|   |   /api/health         |   | /api/trips/demo   |   |
|   +-----------------------+   +-------------------+   |
+-------------------------------------------------------+
```

---

## 3. Data Schema

### Node Types
- `COUNTRY`
- `CITY`
- `NEIGHBORHOOD`
- `ATTRACTION`
- `RESTAURANT`
- `ACTIVITY`
- `HOTEL`
- `TRANSPORT`

### Node Schema
- `id`: string
- `type`: NodeType
- `name`: string
- `description`?: string
- `position`?: [number, number, number]

### Edge Schema
- `id`: string
- `source`: string (Node ID)
- `target`: string (Node ID)
- `relationship`: string (e.g. `LOCATED_IN`, `SHINKANSEN`, `CONTAINS`, `VISITS`)
- `cost`?: number
- `duration`?: number

---

## 4. Evolution Roadmap

1. **Phase 1**: Frontend React + R3F Canvas + FastAPI Demo Endpoint
2. **Phase 2**: FastAPI State Management (In-Memory / Session mutations)
3. **Phase 3**: MongoDB Database Integration
4. **Phase 4**: GraphQL Schema & Mutation Layer
5. **Phase 5**: LangGraph Agent Orchestration Engine
6. **Phase 6**: n8n External Booking & Search API Workflows
7. **Phase 7**: Interactive Agentic Replanning
8. **Phase 8**: Real-time Spatial Agent Visualization

# TripVerse 🌌 ✈️

**TripVerse** is an agentic 3D travel-planning application that turns travel itineraries into an interactive 3D "travel universe".

---

## 🌟 Concept

Rather than viewing flat text itineraries, TripVerse visualizes destinations, cities, attractions, activities, restaurants, transit routes, costs, and schedule constraints as nodes and edges in a spatial graph. Users can interactively explore their trip in 3D, request modifications, and watch AI agents reason and dynamically replan the trip universe.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 / 19 + TypeScript + Vite
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **UI & Motion**: Tailwind CSS, Framer Motion, Lucide Icons

### Backend
- **Framework**: Python 3.10+ & FastAPI
- **Data Validation**: Pydantic v2
- **Server**: Uvicorn

---

## 📁 Repository Structure

```text
TripVerse/
├── frontend/             # Vite + React + TypeScript + React Three Fiber app
├── backend/              # FastAPI Python backend
├── docs/                 # Architectural documentation and roadmap
├── .gitignore            # Git ignore configuration
├── package.json          # Root workspace configuration & scripts
└── README.md             # Project README
```

---

## 💻 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ and npm
- **Python**: 3.10+

---

### 2. Running the Backend

```bash
cd backend

# Option A: Using virtualenv (recommended)
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Uvicorn development server
uvicorn app.main:app --reload --port 8000
```

Verify backend APIs:
- API Root: [http://localhost:8000](http://localhost:8000)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- Demo Trip Graph: [http://localhost:8000/api/trips/demo](http://localhost:8000/api/trips/demo)
- Create Trip Session: `POST http://localhost:8000/api/trips`
- Send Trip Message: `POST http://localhost:8000/api/trips/{trip_id}/messages`
- Get Trip State: `GET http://localhost:8000/api/trips/{trip_id}`
- Get Trip Messages: `GET http://localhost:8000/api/trips/{trip_id}/messages`
- Interactive OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Running the Frontend

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🗺️ Architectural Phase Roadmap

```text
PHASE 1 (Current) -> React + R3F 3D Universe + FastAPI Demo API
PHASE 2            -> FastAPI Mutable Trip State API
PHASE 3            -> MongoDB Persistence
PHASE 4            -> GraphQL Querying & Mutations
PHASE 5            -> LangGraph Agentic Planning & Reasoning
PHASE 6            -> n8n External Integration Workflows
PHASE 7            -> Agentic Replanning (User change -> AI -> Graph mutation)
PHASE 8            -> Real-time 3D Agent Visualization
```

---

## 📄 Development Status

### Latest Updates (Today's Tasks) 🚀
- **Explore Page Editorial Experience (`/explore`)**:
  - Implemented high-contrast editorial layout with Lenis smooth scroll and GSAP scroll animations.
  - Created `<ScrollExpand />` interactive header component that smoothly expands media as user scrolls.
  - Integrated interactive category filters (`Alpine & Peaks`, `Urban Architecture`, `Coastal & Seas`, `Cultural Passages`) and 14-destination showcase grid.
  - Added horizontal scroll showcase track with responsive layout alignment matching the Home container grid.
- **Home Page Functional & Visual Fixes**:
  - Fixed preloading for hero images and implemented 3D title sandwich layering (`z-index: 2` text behind mountain PNG foreground).
  - Enhanced persistent fixed hamburger navigation, downward scroll indicator arrow, and typography styling.
- **Repository Optimization**:
  - Added git ignore rules for high-res media photography assets (`frontend/media/`), SQLite databases (`tripverse.db`), and TypeScript build outputs.
  - Initialized dedicated `frontend` development branch for Pull Request workflow.

---

### Phase 1 Features
- 3D interactive node-graph visualization of trips in React Three Fiber (`@react-three/fiber`).
- Interactive Create Trip setup flow with preference selection.
- FastAPI backend serving `GET /api/trips/demo` and health check endpoints.
- Fully typed data schemas shared across frontend and backend models.

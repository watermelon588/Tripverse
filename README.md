<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/brand/logo-light.svg">
  <img src="frontend/public/brand/logo.svg" alt="TripVerse mark: an arc horizon that breaks downward into a trailing line" width="120">
</picture>

# TripVerse

**Plan a trip by talking to it.** An AI travel planner that drafts an itinerary, builds it day by day with you, and keeps a live map, sketchbook, 3D route and budget in sync, all in one *Trip Studio*.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2-1c3c3c)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ecf8e?logo=supabase&logoColor=white)

</div>

![TripVerse home](frontend/public/guide/00-home.png)

---

## Contents

1. [What it does](#what-it-does)
2. [Screens](#screens)
3. [The agent](#the-agent)
4. [Tech stack and frameworks](#tech-stack-and-frameworks)
5. [Architecture](#architecture)
6. [Folder structure](#folder-structure)
7. [Installation](#installation)
8. [Running locally](#running-locally)
9. [Configuration](#configuration)
10. [API overview](#api-overview)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Brand](#brand)
14. [Current status and roadmap](#current-status-and-roadmap)

---

## What it does

TripVerse starts with a conversation, not a form. Tell it where you're thinking of going and it replies like a travel companion; when you want a draft it asks three things (where from, where to, how many days) and everything else is optional.

You then choose how to plan:

- **One-shot itinerary.** The agent researches the destination on the web and writes a full day-by-day plan.
- **Build with your guide.** You and a guide character plan one day at a time. Ask to add, move or drop a stop and the agent proposes it, checks it against your pacing and budget, tells you exactly what changed, and only then applies it.

Either way the result lands in **Trip Studio**, where one itinerary is shown four ways:

| View | What you get |
|---|---|
| **Plan** | The day-by-day itinerary with seasonality and conditions for your dates |
| **Sketchbook** | A hand-drawn notebook page per day you can annotate, saved per trip |
| **Map** | Google / MapLibre map with numbered stops, nearby places and road distance and drive time between stops |
| **3D** | A spatial graph of the trip (React Three Fiber): stops and legs as nodes and edges |

Plus a persistent **budget ledger**, **PDF / image exports**, saved trips, Explore (destination moods), and sign-in with trips claimed from guest sessions.

## Screens

| | |
|---|---|
| ![Brief](frontend/public/guide/02-brief-step-1.png) **Three-question brief** | ![Guide picker](frontend/public/guide/02d-guide-picker.png) **Pick your guide** |
| ![Planning choice](frontend/public/guide/03-planning-choice.png) **One-shot or build together** | ![Itinerary](frontend/public/guide/04-one-shot-itinerary.png) **Full itinerary from chat** |
| ![Change receipt](frontend/public/guide/05b-change-receipt.png) **Receipts for every change** | ![Budget from chat](frontend/public/guide/05e-budget-from-chat.png) **Budget from chat** |
| ![Studio plan](frontend/public/guide/06-studio-plan.png) **Trip Studio: Plan** | ![Studio sketch](frontend/public/guide/07-studio-sketch.png) **Trip Studio: Sketchbook** |
| ![Studio map](frontend/public/guide/08-studio-map.png) **Trip Studio: Map** | ![Studio 3D](frontend/public/guide/09-studio-3d.png) **Trip Studio: 3D** |
| ![Budget rows](frontend/public/guide/13-budget-rows.png) **Budget ledger** | ![Exports](frontend/public/guide/10b-export-ready.png) **Exports** |
| ![Build day](frontend/public/guide/16-build-day-plan.png) **Build a day with the agent** | ![Live sketch](frontend/public/guide/21-build-live-sketch-done.png) **Sketch fills in live** |
| ![Explore](frontend/public/guide/24-explore.png) **Explore** | ![Phone](frontend/public/guide/23-phone-sketch.png) **On a phone** |

The full annotated walkthrough lives in the app at `/guide`.

## The agent

TripVerse's agent is a **LangGraph state machine** (`backend/app/agents/trip_planner/`) that owns the whole conversation. It is deliberately split so the model never invents facts about the trip:

```
START ─ greet / understand message ─ onboarding form ─ validate ─ planning choice
                                                                    │
                    ┌───────────────────────────────────────────────┴────────────┐
                    ▼                                                            ▼
        one-shot: research → write → extract graph          build-with-agent (copilot subgraph)
                                                            interpret ─ apply ─ research ─ recommend ─ respond ─ render
```

- **Understand.** A fast model turns each message into intent and structured *operations* (add stop, move day, set budget…).
- **Apply and recommend are deterministic.** `copilot/engine.py` applies operations to the itinerary and computes pacing, conflicts and budget effects in plain code. The model only puts those computed facts into words, so a reply can't claim a change that didn't happen (the reply guard checks this).
- **Research.** Tavily web search plus traveler posts feed the planning and recommendations, with source-supported transit claims and explicit unknowns.
- **Extract.** Every draft is parsed into an *itinerary graph* (stops, legs, nearby places) that drives the map, 3D view, sketch pages and budget rows.
- **Enrichment.** Geocoding, Google Places (cached and quota-capped), road metrics from openrouteservice, seasonality and place photos.
- **Guides.** Six character guides (Aoi, Yuki, Beni, Kaede, Momo, Rin) give the agent a voice; the choice is a persona, the planning logic is shared.
- **LLM providers.** Groq (`openai/gpt-oss-120b`, with a fast `gpt-oss-20b` for extraction) is primary; Google Gemini is the automatic fallback on rate or quota limits. LangSmith tracing is optional.

## Tech stack and frameworks

| Layer | Technology |
|---|---|
| Frontend framework | **React 18** + **TypeScript** + **Vite 5** |
| Styling and motion | Tailwind CSS 4, GSAP (`@gsap/react`), Framer Motion, Lenis smooth scroll |
| 3D | **Three.js** with **React Three Fiber** and drei |
| Maps | Google Maps and **MapLibre GL** |
| Sketchbook | roughjs, perfect-freehand, Excalidraw |
| Exports | jsPDF, svg2pdf.js |
| Backend framework | **FastAPI** (Python 3.12) on Uvicorn, **Pydantic v2** |
| Agent orchestration | **LangGraph** |
| LLMs | Groq (primary), Google Gemini (fallback) |
| Search and data | Tavily, Google Places, openrouteservice |
| Database and auth | **Supabase** (PostgreSQL via SQLAlchemy 2 + asyncpg, Supabase Auth, JWT); SQLite (aiosqlite) for the local quota ledger |
| Media | Cloudinary (avatars) |
| Observability | LangSmith |
| Tests | pytest + pytest-asyncio, Vitest |
| Hosting | Vercel (frontend), Render (backend) |

## Architecture

```
┌────────────────────────────── Browser (Vercel) ──────────────────────────────┐
│  React + Vite SPA                                                             │
│  Home · Explore · Guide · Create/Trip Studio · Trips · Auth · Profile         │
│  Plan │ Sketchbook │ Map (Google/MapLibre) │ 3D (R3F) │ Budget │ Exports      │
└───────────────┬───────────────────────────────┬───────────────────────────────┘
                │ REST + SSE (chat stream)      │ Supabase JS (sign-in)
                ▼                               ▼
┌──────────── FastAPI (Render) ────────────┐   ┌────── Supabase ──────┐
│ routes → services → repositories         │   │ Auth · PostgreSQL    │
│                                          │◄──►  trips, messages,    │
│  LangGraph agent ──► LLM service         │   │  budgets, sketch     │
│   (Groq → Gemini fallback)               │   │  notes               │
│  enrichment · budget · exports · places  │   └──────────────────────┘
└───────┬──────────┬───────────┬───────────┘
        ▼          ▼           ▼
     Tavily   Google Places   openrouteservice
```

- **Request path.** Routes validate with Pydantic, services hold the logic, repositories own SQL. Chat uses a Server-Sent-Events stream (`/messages/stream`) that sends stage labels (researching, writing) and a final `done` frame.
- **Trip document.** The latest itinerary graph is the source of truth; `/trips/{id}/document` assembles it for the studio and exports. Budget rows are re-seeded from each new graph and keep entered amounts.
- **Cost control.** Google Places is called only when a stop is opened, cached for an hour and capped per trip and per day in a local SQLite ledger.
- **Guest-first.** Anyone can plan without an account; `/auth/claim-guest-trips` attaches those trips after sign-up.

Deeper notes: `docs/architecture/` (system design, database, API reference) and [DEPLOY.md](DEPLOY.md).

## Folder structure

```text
TripVerse/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, router wiring
│   │   ├── agents/trip_planner/
│   │   │   ├── graph.py               # top-level LangGraph
│   │   │   ├── routing.py, state.py
│   │   │   ├── nodes/                 # understand, onboarding, validate, planning, extract, respond
│   │   │   ├── planning/              # one-shot research nodes and tools (web search)
│   │   │   └── copilot/               # build-with-agent subgraph: engine, graph, research
│   │   ├── api/routes/                # auth, trips, exports, places, sketch_notes, upload, health
│   │   ├── core/                      # config, database
│   │   ├── models/, schemas/          # SQLAlchemy models, Pydantic schemas
│   │   ├── repositories/              # database access
│   │   ├── services/                  # trip, budget, enrichment, google_places, route_metrics,
│   │   │   └── llm/                   #   seasonality, trip_document, conversation, auth
│   │   │       └── providers/         # groq.py, gemini.py
│   │   └── data/
│   ├── tests/                         # pytest suite (auth, trips, budget, LLM, exports, places…)
│   ├── requirements.txt, pytest.ini, .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                     # Home, Explore, Guide, CreateTrip, TripLibrary, Auth, Profile, Credits
│   │   ├── components/
│   │   │   ├── home/                  # landing page and journal
│   │   │   ├── create/                # chat planner, brief form, budget, map, 3D graph
│   │   │   ├── studio/                # Trip Studio: plan, conditions, export menu
│   │   │   ├── sketch/                # sketchbook pages and annotation
│   │   │   ├── guide/                 # the six guide characters and companion
│   │   │   ├── auth/ common/          # forms, Logo, route curtain
│   │   ├── lib/exporters/             # PDF and image export
│   │   ├── services/ context/ hooks/  # API clients, auth state, hooks
│   │   └── styles/, types/, constants/
│   ├── public/                        # brand/, guide/ screenshots, home/, pfp/, explore images
│   ├── scripts/                       # screenshot and asset helpers
│   ├── vite.config.ts, vercel.json, .env.example
├── docs/                              # architecture, design system, roadmap, session logs
├── render.yaml                        # Render blueprint (backend)
├── DEPLOY.md                          # Vercel + Render + Supabase guide
├── DESIGN.md, plan.md                 # design system and roadmap
└── package.json                       # root convenience scripts
```

## Installation

**Prerequisites:** Node.js 18+ and npm, Python 3.12, git, and accounts or keys for the services below. Supabase and one LLM key (Groq or Gemini) are required; the rest are optional.

```bash
git clone https://github.com/watermelon588/Tripverse.git
cd Tripverse
```

**Backend**

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS / Linux:      source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the values (see Configuration)
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env        # then fill in the values
```

## Running locally

In two terminals:

```bash
# Terminal 1: API on http://localhost:8000
cd backend
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2: app on http://localhost:5173
cd frontend
npm run dev
```

Check the API at <http://localhost:8000/api/health> (it should report the database as connected), then open <http://localhost:5173>. From the repo root, `npm run dev:backend` and `npm run dev:frontend` do the same.

Production build: `npm run build` inside `frontend/`.

## Configuration

**`backend/.env`**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase Postgres, `postgresql+asyncpg://…` (use the *session pooler* URL when hosting) |
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SECRET`, `SUPABASE_JWT_SECRET` | Auth |
| `LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_FAST_MODEL` | Primary LLM |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Fallback LLM |
| `TAVILY_API_KEY` | Web research |
| `ORS_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_ROUTES_ENABLED` | Optional road metrics and Places |
| `LANGSMITH_*` | Optional tracing |
| `CORS_ORIGINS` | Allowed frontend origins |

**`frontend/.env`**: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_MAPS_API_KEY` (optional; MapLibre is used without it). Never commit `.env` files.

## API overview

| Area | Endpoints (trip routes are under `/api/trips`) |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/signup · login · logout · forgot-password · reset-password · claim-guest-trips`, `GET /api/auth/me` |
| Trips | `POST /api/trips`, `GET /api/trips`, `GET /api/trips/{id}`, `DELETE /api/trips/{id}` |
| Chat | `POST /trips/{id}/messages`, `POST /trips/{id}/messages/stream` (SSE), `GET /trips/{id}/messages` |
| Document | `GET /trips/{id}/document`, `POST /trips/{id}/itinerary-graph` |
| Budget | `GET /trips/{id}/budget`, `PUT …/budget/settings`, `POST/PUT/DELETE …/budget/items`, `POST …/budget/estimates[/accept]` |
| Map data | `POST /trips/{id}/route-metrics · geocode · nearby-places` |
| Sketchbook | `GET /trips/{id}/sketch-notes`, `PUT/DELETE …/sketch-notes/{page_id}` |
| Places and media | `POST /api/places/media`, `GET /api/places/around`, `POST /api/places/season` |
| Exports, upload | `POST /api/exports/points`, `POST /api/upload/avatar` |

Interactive docs while running: <http://localhost:8000/docs>.

## Testing

```bash
cd backend && pytest        # backend suite
cd frontend && npm test     # Vitest
cd frontend && npx tsc --noEmit
```

## Deployment

Frontend on **Vercel** (root `frontend`, config in `frontend/vercel.json`), backend on **Render** (blueprint `render.yaml`), database and auth on **Supabase**. Step-by-step: [DEPLOY.md](DEPLOY.md).

## Brand

TripVerse's mark is a single stroke: an **arc horizon that breaks downward into a trailing line**, a journey that leaves the horizon. It is drawn once, in `frontend/src/components/common/Logo.tsx`, and every surface imports it; the stroke inherits `currentColor`, so it takes the ink of whatever it sits on.

| On paper | On dark |
|---|---|
| <img src="frontend/public/brand/logo.svg" width="96" alt="Mark, dark"> | <img src="frontend/public/brand/logo-light.svg" width="96" alt="Mark, light"> |

Visual language: warm paper, hand-drawn sketchbook pages, Caveat and Yomogi handwriting faces, and six illustrated guides.

<p>
<img src="frontend/public/pfp/5ebc2b293bd93a26c5a67eb0d7c7c37a.jpg" width="72" alt="Aoi">
<img src="frontend/public/pfp/4f9accdea0d0f90f7c828e529b6bcecc.jpg" width="72" alt="Yuki">
<img src="frontend/public/pfp/084f860e3eb1569fddd7e47d1ab9337f.jpg" width="72" alt="Beni">
<img src="frontend/public/pfp/f6acbd3ea789240a081bc312c6dc69d5.jpg" width="72" alt="Kaede">
<img src="frontend/public/pfp/fe325776d3bdd1174fa04644870657cb.jpg" width="72" alt="Momo">
<img src="frontend/public/pfp/2aa4e37adf102ac2bc180cb30a085da0.jpg" width="72" alt="Rin">
</p>

Aoi · Yuki · Beni · Kaede · Momo · Rin. Details in [DESIGN.md](DESIGN.md).

## Current status and roadmap

**Working today**

- Chat-first planning, brief form, six guides, one-shot and build-with-agent modes
- Trip Studio with Plan, Sketchbook, Map and 3D views
- Persistent per-trip budget ledger with suggestions and chat-driven edits
- PDF and image exports
- Supabase auth, guest trips and claiming, saved trips library
- Explore, home journal, `/guide` walkthrough, credits
- Quota-capped Google Places, openrouteservice metrics, seasonality
- Backend test suite, production build checks, Vercel and Render deploy config

**Next**

- Go live: Vercel + Render + Supabase (config is in place; see [DEPLOY.md](DEPLOY.md))
- Free-provider chain and a daily usage cap for LLM calls
- A shared quota store when running on more than one backend host
- Live booking prices (budgets are traveler-entered; no FX conversion yet)

See `plan.md` for the full roadmap.

## Acknowledgements

Photos from Pexels contributors (credited on `/credits`); they are not covered by the code license. Built with React, FastAPI, LangGraph and Supabase.



## License

[MIT](LICENSE) © 2026 Rohit Maity

# TripVerse FastAPI Backend

Python FastAPI service providing trip graph definitions, agent state persistence, and APIs for TripVerse.

## Python Environment & Dependencies

- **Virtual Environment**: `backend/.venv` (Python 3)
- **Key Installed Dependencies**:
  - `fastapi` & `uvicorn`: REST API application layer & server
  - `sqlalchemy`, `asyncpg`, `aiosqlite`: Async ORM & persistence (SQLite local / PostgreSQL Neon)
  - `pydantic` & `pydantic-settings`: Data validation & application settings
  - `langgraph` (>= 0.2.0): Stateful multi-agent planning workflow runtime
  - `pytest` & `pytest-asyncio`: Backend test suite
- **LLM Provider**: Intentionally undecided / unconfigured (abstracted behind service interfaces).
- **Future Infrastructure**: n8n, GraphQL, Redis, and vector databases are **not** dependencies yet.

## Setup Instructions

1. Create Python virtual environment inside `backend/`:
```bash
python -m venv .venv
```

2. Activate virtual environment:
```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Linux/macOS
source .venv/bin/activate
```

3. Install dependencies:
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

4. Run tests:
```bash
pytest
```

5. Run development server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `GET /`: API root metadata
- `GET /api/health`: Health status and database connectivity check
- `GET /api/trips/demo`: Returns hardcoded 3D demo trip graph for Japan
- `POST /api/trips`: Initialize a new conversational trip session & return initial assistant greeting
- `POST /api/trips/{trip_id}/messages`: Process incoming user text/UI_ACTION message & return updated trip state
- `GET /api/trips/{trip_id}`: Retrieve current trip state and active conversation session
- `GET /api/trips/{trip_id}/messages`: Retrieve chronologically ordered conversation message history for a trip

## Backend Architecture

```text
backend/app/
├── api/routes/        # FastAPI HTTP route handlers
├── services/          # Application services (TripService, ConversationService)
├── repositories/      # Database repositories (TripRepository, ConversationRepository, MessageRepository)
├── agents/            # Isolated LangGraph agent runtime (trip_planner)
├── models/            # SQLAlchemy 2.0 ORM data models
├── schemas/           # Pydantic API request & response schemas
└── core/              # Config & database connection lifespan
```

## Next Focus

- Implement **Trip Planner LangGraph Runtime** (`backend/app/agents/trip_planner/`) state schema, intent reasoning nodes, and conditional edge routing beyond onboarding.


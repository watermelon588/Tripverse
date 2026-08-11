# TripVerse FastAPI Backend

Python FastAPI service providing trip graph definitions and APIs for TripVerse.

## Setup Instructions

1. Create Python virtual environment:
```bash
python -m venv .venv
```

2. Activate virtual environment:
```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# Linux/macOS
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run development server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `GET /`: API root metadata
- `GET /api/health`: Health status
- `GET /api/trips/demo`: Returns demo Japan 3D graph dataset
